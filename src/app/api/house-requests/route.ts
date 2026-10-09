import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyHouseRequest } from "@/lib/house-request-notifications";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  contactPreference: z.enum(["WHATSAPP", "PHONE", "EMAIL"]).default("WHATSAPP"),
  propertyType: z.enum(["Bedsitter", "Studio", "Apartment", "House", "Shared accommodation", "Any type"]),
  bedrooms: z.coerce.number().int().min(0).max(10),
  countyName: z.string().trim().min(2).max(100),
  townName: z.string().trim().max(100).optional().default(""),
  preferredAreas: z.array(z.string().trim().min(1).max(200)).max(6).default([]),
  preferredLocations: z.array(z.object({
    label: z.string().trim().min(2).max(250),
    name: z.string().trim().min(2).max(100),
    level: z.string().trim().min(2).max(40),
    countyName: z.string().trim().min(2).max(100),
    townName: z.string().trim().max(100).default(""),
    areaName: z.string().trim().max(100).default(""),
    locationNodeId: z.string().uuid().nullable().optional(),
    parentId: z.string().uuid().nullable().optional(),
    source: z.enum(["DATABASE", "CUSTOM"]),
  })).min(1).max(5).optional().default([]),
  minRent: z.coerce.number().min(0).max(100000000).optional(),
  maxRent: z.coerce.number().positive().max(100000000),
  moveIn: z.enum(["Immediately", "Within 2 weeks", "Within a month", "Flexible", "Later"]),
  mustHaves: z.array(z.string().max(60)).max(12).default([]),
  notes: z.string().trim().max(1000).optional().default(""),
  consent: z.literal(true),
  website: z.string().max(0).optional().default(""),
}).refine((value) => value.minRent === undefined || value.minRent <= value.maxRent, {
  message: "Minimum budget cannot exceed maximum budget.",
  path: ["minRent"],
});

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function rent(value: number) {
  return "KSh " + Math.round(value).toLocaleString("en-KE");
}

export async function POST(request: NextRequest) {
  try {
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ message: body.error.issues[0]?.message || "Please check your answers." }, { status: 400 });
    }
    const data = body.data;
    if (data.website) return NextResponse.json({ message: "Request could not be submitted." }, { status: 400 });
    if (data.contactPreference === "EMAIL" && !data.email) {
      return NextResponse.json({ message: "Add an email address or choose WhatsApp or phone as your contact preference." }, { status: 400 });
    }

    const reference = "NF-" + randomBytes(4).toString("hex").toUpperCase();
    const houseRequest = await prisma.houseRequest.create({
      data: {
        reference,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        contactPreference: data.contactPreference,
        propertyType: data.propertyType,
        bedrooms: data.bedrooms,
        countyName: data.countyName,
        townName: data.townName || null,
        preferredAreas: data.preferredAreas,
        preferredLocations: data.preferredLocations,
        minRent: data.minRent ?? null,
        maxRent: data.maxRent,
        moveIn: data.moveIn,
        mustHaves: data.mustHaves,
        notes: data.notes || null,
        consent: data.consent,
      },
    });

    const candidates = await prisma.property.findMany({
      where: {
        status: "ACTIVE",
        listingType: "FOR_RENT",
        price: {
          lte: data.maxRent,
          ...(data.minRent !== undefined ? { gte: data.minRent } : {}),
        },
        ...(data.bedrooms > 0 ? { bedrooms: { gte: data.bedrooms } } : {}),
      },
      include: {
        county: { select: { name: true } },
        town: { select: { name: true } },
        areaLocation: { select: { name: true } },
        propertyImages: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
      orderBy: [{ price: "asc" }, { createdAt: "desc" }],
      take: 250,
    });

    // Resolve user-added locations into the shared location tree as pending, non-searchable nodes.
    // Existing database locations are never duplicated; custom nodes keep their parent county/town.
    const resolvedLocations = [];
    for (const location of data.preferredLocations) {
      let nodeId = location.locationNodeId || null;
      if (location.source === "CUSTOM") {
        const county = await prisma.county.findFirst({ where: { name: { equals: location.countyName, mode: "insensitive" } } });
        if (county) {
          const level = location.level.toUpperCase();
          let parentId = null;
          if (location.townName && !["TOWN", "CITY"].includes(level)) {
            const parentSlug = location.townName.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            let parent = await prisma.locationNode.findFirst({ where: { countyId: county.id, level: { in: ["TOWN", "CITY"] }, slug: parentSlug } });
            if (!parent) parent = await prisma.locationNode.create({ data: { countyId: county.id, level: "TOWN", name: location.townName, slug: parentSlug, searchable: false, source: "USER_SUBMITTED_PENDING_REVIEW" } });
            parentId = parent.id;
          }
          const slug = location.name.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          let node = await prisma.locationNode.findFirst({ where: { countyId: county.id, level, slug, parentId } });
          if (!node) {
            node = await prisma.locationNode.create({ data: { countyId: county.id, parentId, level, name: location.name, slug, searchable: false, source: "USER_SUBMITTED_PENDING_REVIEW" } });
          }
          nodeId = node.id;
        }
      }
      resolvedLocations.push({ ...location, locationNodeId: nodeId });
    }
    const locationTerms = resolvedLocations.flatMap((location) => [location.name, location.townName, location.countyName, location.areaName, location.label]).filter(Boolean).map(normalize);
    const targetTerms = [...locationTerms, data.countyName, data.townName, ...data.preferredAreas].filter(Boolean).map(normalize);
    const mustHaves = data.mustHaves.map(normalize);
    const ranked = candidates.map((property) => {
      const locationText = normalize([
        property.location, property.county?.name, property.town?.name, property.areaLocation?.name,
      ].filter(Boolean).join(" "));
      const exactArea = data.preferredAreas.some((area) => locationText.includes(normalize(area)));
      const townMatch = Boolean(data.townName && locationText.includes(normalize(data.townName)));
      const countyMatch = Boolean(property.county?.name && normalize(property.county.name) === normalize(data.countyName));
      const locationMatch = targetTerms.some((term) => term && locationText.includes(term));
      const propertyTypeText = normalize(property.propertyType + " " + property.title + " " + property.description);
      const wantedType = normalize(data.propertyType);
      const typeMatch = data.propertyType === "Any type" || propertyTypeText.includes(wantedType) ||
        (data.propertyType === "Studio" && property.bedrooms === 0) ||
        (data.propertyType === "Bedsitter" && (property.bedrooms === 0 || propertyTypeText.includes("bedsitter")));
      const matchedAmenities = data.mustHaves.filter((need) =>
        normalize([...property.amenities, property.description, property.title].join(" ")).includes(normalize(need))
      );
      const budgetScore = Math.max(0, 20 - Math.round((property.price / data.maxRent) * 20));
      const score = (exactArea ? 45 : 0) + (townMatch ? 28 : 0) + (countyMatch ? 18 : 0) +
        (typeMatch ? 12 : 0) + matchedAmenities.length * 4 + budgetScore;
      const image = property.propertyImages[0]
        ? "/api/properties/" + property.id + "?image=" + property.propertyImages[0].id
        : property.images[0] || "";
      const reasons = [
        exactArea ? "In your preferred area" : townMatch ? "In your preferred town" : countyMatch ? "In your preferred county" : null,
        typeMatch ? "Matches your house type" : null,
        property.price <= data.maxRent ? "Within your rent budget" : null,
        matchedAmenities.length ? "Includes some of your preferred features" : null,
      ].filter(Boolean);
      return {
        id: property.id,
        title: property.title,
        location: [property.areaLocation?.name, property.town?.name, property.county?.name].filter(Boolean).join(", ") || property.location,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        propertyType: property.propertyType,
        image,
        href: "/properties/" + property.id,
        reasons,
        score,
        locationMatch,
      };
    }).sort((a, b) => b.score - a.score || a.price - b.price);

    const locationMatches = ranked.filter((item) => item.locationMatch);
    const selected = (locationMatches.length ? locationMatches : ranked).slice(0, 8);
    const matches = selected.map(({ score: _score, locationMatch: _locationMatch, ...item }) => item);

    const notice = {
      reference: houseRequest.reference,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      contactPreference: data.contactPreference,
      propertyType: data.propertyType,
      bedrooms: data.bedrooms,
      countyName: data.countyName,
      townName: data.townName || null,
      preferredAreas: data.preferredAreas,
      minRent: data.minRent ?? null,
      maxRent: data.maxRent,
      moveIn: data.moveIn,
      mustHaves: data.mustHaves,
      notes: data.notes || null,
      matchesCount: matches.length,
    };
    const notifications = await notifyHouseRequest(notice);
    const adminPhone = process.env.WHATSAPP_ADMIN_PHONE?.replace(/[^\d]/g, "");
    const whatsappMessage = [
      "Hello NyumbaFinder, I need help finding a rental home.",
      "Request: " + reference,
      "House: " + data.propertyType + (data.bedrooms ? " · " + data.bedrooms + " bedroom(s)" : ""),
      "Preferred locations (in order): " + (resolvedLocations.length ? resolvedLocations.map((location, index) => (index + 1) + ". " + location.label).join(" | ") : [data.countyName, data.townName, ...data.preferredAreas].filter(Boolean).join(", ")),
      "Budget: " + (data.minRent ? rent(data.minRent) + "–" : "Up to ") + rent(data.maxRent) + " monthly",
      "Move-in: " + data.moveIn,
      "Name: " + data.name,
      "Phone: " + data.phone,
    ].join("\n");
    const whatsappUrl = adminPhone ? "https://wa.me/" + adminPhone + "?text=" + encodeURIComponent(whatsappMessage) : null;

    return NextResponse.json({
      reference: houseRequest.reference,
      matches,
      totalMatches: matches.length,
      hasMoreMatches: ranked.length > matches.length,
      usedNearbyFallback: locationMatches.length === 0 && ranked.length > 0,
      whatsappUrl,
      notifications,
    }, { status: 201 });
  } catch (error) {
    console.error("HOUSE_REQUEST_CREATE_FAILED", error);
    return NextResponse.json({ message: "We couldn't submit your request just now. Please try again in a moment." }, { status: 500 });
  }
}
