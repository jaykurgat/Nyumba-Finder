import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Property } from '@/types/property';
import type { Prisma } from '@prisma/client';
import { distanceKm, locationRelevanceScore, resolveLocationContext } from '@/lib/location-relevance';

const getString = (value: unknown, defaultValue = '') =>
  typeof value === 'string' ? value : defaultValue;
const getOptionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;
const getNumber = (value: unknown, defaultValue = 0) => {
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
};
const getOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};
const getStringArray = (value: unknown): string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string') ? value : [];

const toProperty = (data: {
  id: string; title: string; description: string; location: string; price: number;
  images: string[]; bedrooms: number; bathrooms: number; sizeSqm: number | null;
  amenities: string[]; phoneNumber: string | null; latitude: number | null; longitude: number | null;
}): Property => ({
  id: data.id,
  title: data.title,
  description: data.description,
  location: data.location,
  locationNodeId: (data as any).locationNodeId ?? undefined,
  countyId: (data as any).countyId ?? undefined,
  locationSource: (data as any).locationSource ?? undefined,
  locationAccuracy: (data as any).locationAccuracy ?? undefined,
  price: data.price,
  listingType: (data as any).listingType ?? "FOR_RENT",
  pricePeriod: (data as any).pricePeriod ?? "MONTH",
  shortStayMinNights: (data as any).shortStayMinNights ?? undefined,
  shortStayMaxNights: (data as any).shortStayMaxNights ?? undefined,
  cleaningFee: (data as any).cleaningFee ?? undefined,
  securityDeposit: (data as any).securityDeposit ?? undefined,
  maxGuests: (data as any).maxGuests ?? undefined,
  images: data.images,
  bedrooms: data.bedrooms,
  bathrooms: data.bathrooms,
  area: data.sizeSqm ?? undefined,
  amenities: data.amenities,
  phoneNumber: data.phoneNumber ?? undefined,
  latitude: data.latitude ?? undefined,
  longitude: data.longitude ?? undefined,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const generalQueryTerm = searchParams.get('q')?.trim().toLowerCase();
    const propertyTypeQuery = searchParams.get('propertyType')?.trim();
    const listingTypeQuery = searchParams.get('listingType')?.trim() || 'ALL';
    const minPrice = getOptionalNumber(searchParams.get('minPrice'));
    const maxPrice = getOptionalNumber(searchParams.get('maxPrice'));
    const minBedroomsParam = searchParams.get('minBedrooms');
    const minBedrooms = minBedroomsParam && minBedroomsParam !== 'all' ? getOptionalNumber(minBedroomsParam) : undefined;
    const minBathroomsParam = searchParams.get('minBathrooms');
    const minBathrooms = minBathroomsParam && minBathroomsParam !== 'all' ? getOptionalNumber(minBathroomsParam) : undefined;
    const selectedAmenities = searchParams.getAll('amenities');
    const locationContext = await resolveLocationContext(searchParams.get('location')?.trim() || '', prisma);
    const radiusKm = Math.max(1, Math.min(100, getOptionalNumber(searchParams.get('radiusKm')) ?? 25));

    const neighboringCountyIds = locationContext?.canonicalCountyId
      ? (await prisma.countyNeighbor.findMany({
          where: { countyId: locationContext.canonicalCountyId },
          select: { neighborId: true },
        })).map((item) => item.neighborId)
      : [];

    const searchConditions: Prisma.PropertyWhereInput[] = [];

    if (generalQueryTerm) {
      searchConditions.push({
        OR: [
          { title: { contains: generalQueryTerm, mode: 'insensitive' } },
          { description: { contains: generalQueryTerm, mode: 'insensitive' } },
          { location: { contains: generalQueryTerm, mode: 'insensitive' } },
        ],
      });
    }

    if (locationContext?.query) {
      searchConditions.push({
        OR: [
          ...(locationContext.canonicalCountyId
            ? [{ countyId: { in: [locationContext.canonicalCountyId, ...neighboringCountyIds] } }]
            : []),
          { title: { contains: locationContext.query, mode: 'insensitive' } },
          { description: { contains: locationContext.query, mode: 'insensitive' } },
          { location: { contains: locationContext.query, mode: 'insensitive' } },
        ],
      });
    }

    const baseWhere: Prisma.PropertyWhereInput = {
      status: 'ACTIVE' as const,
      ...(listingTypeQuery && listingTypeQuery !== 'ALL' ? { listingType: listingTypeQuery } : {}),
      ...(propertyTypeQuery && propertyTypeQuery !== 'Any type' ? { propertyType: propertyTypeQuery } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
        : {}),
      ...(minBedrooms !== undefined ? { bedrooms: { gte: Math.ceil(minBedrooms) } } : {}),
      ...(minBathrooms !== undefined ? { bathrooms: { gte: Math.ceil(minBathrooms) } } : {}),
      ...(selectedAmenities.length ? { amenities: { hasEvery: selectedAmenities } } : {}),
      ...(searchConditions.length ? { AND: searchConditions } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.property.count({ where: baseWhere }),
      prisma.property.findMany({
        where: baseWhere,
        orderBy: [{ createdAt: 'desc' }],
        take: 500,
        include: {
          county: { select: { name: true } },
          propertyImages: { select: { id: true }, orderBy: { createdAt: 'asc' } },
          externalListings: { where: { status: 'ACTIVE' }, select: { imageUrls: true }, orderBy: { createdAt: 'asc' }, take: 1 },
          promotions: {
            where: {
              status: 'ACTIVE',
              startsAt: { lte: new Date() },
              endsAt: { gte: new Date() },
            },
            orderBy: { boost: 'desc' },
          },
        },
      }),
    ]);

    const results = rows.map((row) => {
      const promotion = row.promotions.find((candidate) => {
        const targetLocation = candidate.targetLocation?.trim().toLowerCase();
        const targetType = candidate.targetType?.trim().toLowerCase();
        const searchableLocation = [row.location, row.title, row.county?.name].filter(Boolean).join(' ').toLowerCase();
        const locationMatches = !targetLocation || searchableLocation.includes(targetLocation);
        const typeMatches = !targetType || row.propertyType.trim().toLowerCase() === targetType;
        const bedroomMatches =
          (candidate.minBedrooms == null || row.bedrooms >= candidate.minBedrooms) &&
          (candidate.maxBedrooms == null || row.bedrooms <= candidate.maxBedrooms);
        return locationMatches && typeMatches && bedroomMatches;
      });

      const distance = locationContext?.center && row.latitude != null && row.longitude != null
        ? distanceKm(locationContext.center.lat, locationContext.center.lng, row.latitude, row.longitude)
        : undefined;
      const withinRadius = distance != null && distance <= radiusKm;
      const locationSearchTerm = locationContext?.query.toLowerCase();
      const titleLocationMatch = Boolean(locationSearchTerm && row.title.toLowerCase().includes(locationSearchTerm));
      const descriptionLocationMatch = Boolean(locationSearchTerm && row.description.toLowerCase().includes(locationSearchTerm));
      const locationTextMatch = Boolean(locationSearchTerm && row.location.toLowerCase().includes(locationSearchTerm));

      const promotionBoost = promotion ? Math.min(250, Math.max(1, promotion.boost)) : 0;

      // Relevance is calculated first. Sponsored placement can only affect listings
      // that already passed the same search filters and targeting rules as organic results.
      const relevance =
        (generalQueryTerm && row.title.toLowerCase().includes(generalQueryTerm) ? 100 : 0) +
        (generalQueryTerm && row.location.toLowerCase().includes(generalQueryTerm) ? 60 : 0) +
        (titleLocationMatch ? 700 : 0) +
        (descriptionLocationMatch ? 300 : 0) +
        (locationTextMatch ? 650 : 0) +
        locationRelevanceScore(row.location + (row.county?.name ? ' ' + row.county.name : ''), locationContext) +
        (withinRadius ? 800 + Math.max(0, 200 - distance! * 8) : 0) +
        (distance != null && !withinRadius ? Math.max(0, 120 - distance) : 0);

      const packageName = promotion?.package?.trim().toLowerCase() ?? '';
      const promotionTier = promotion
        ? packageName === 'top placement' || packageName === 'premium plus' ? 3
          : packageName === 'premium' || packageName === 'premium featured' ? 2
          : 1
        : 0;

      return {
        ...toProperty({
          ...row,
          images: row.propertyImages.length
          ? row.propertyImages.map((image) => '/api/properties/' + row.id + '?image=' + image.id)
          : (row.externalListings[0]?.imageUrls ?? []),
        }),
        propertyType: row.propertyType,
        status: row.status,
        isSponsored: Boolean(promotion),
        promotionId: promotion?.id,
        promotionLabel: promotion ? 'Sponsored' : undefined,
        promotionBoost,
        _relevanceScore: relevance,
        _promotionTier: promotionTier,
        _rankingScore: relevance + promotionBoost,
      };
    });

    // Sponsored results use dedicated placement slots rather than relying on a
    // numeric boost alone. This prevents a large organic relevance score from
    // pushing a paid listing to the bottom of the results.
    const sponsored = results
      .filter((item) => item.isSponsored)
      .sort((a, b) => {
        if (b._promotionTier !== a._promotionTier) return b._promotionTier - a._promotionTier;
        if (b.promotionBoost !== a.promotionBoost) return b.promotionBoost - a.promotionBoost;
        if (b._relevanceScore !== a._relevanceScore) return b._relevanceScore - a._relevanceScore;
        if (a.distanceKm !== undefined || b.distanceKm !== undefined) {
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          if (a.distanceKm !== b.distanceKm && locationContext?.center) return a.distanceKm - b.distanceKm;
        }
        return a.title.localeCompare(b.title);
      });

    const organic = results
      .filter((item) => !item.isSponsored)
      .sort((a, b) => {
        if (b._relevanceScore !== a._relevanceScore) return b._relevanceScore - a._relevanceScore;
        if (a.distanceKm !== undefined || b.distanceKm !== undefined) {
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          if (a.distanceKm !== b.distanceKm && locationContext?.center) return a.distanceKm - b.distanceKm;
        }
        if (minPrice !== undefined || maxPrice !== undefined) return a.price - b.price;
        return a.title.localeCompare(b.title);
      });

    // Reserve three sponsored positions in the first ten results, then one
    // sponsored position every ten results. This keeps paid visibility meaningful
    // without allowing sponsorship to flood the search experience.
    const merged: typeof results = [];
    let sponsoredIndex = 0;
    let organicIndex = 0;

    for (let position = 0; position < 60; position += 1) {
      const isReservedSponsoredSlot =
        position === 0 || position === 3 || position === 6 || (position >= 10 && position % 10 === 0);

      if (isReservedSponsoredSlot && sponsoredIndex < sponsored.length) {
        merged.push(sponsored[sponsoredIndex++]);
      } else if (organicIndex < organic.length) {
        merged.push(organic[organicIndex++]);
      } else if (sponsoredIndex < sponsored.length) {
        merged.push(sponsored[sponsoredIndex++]);
      } else {
        break;
      }
    }

    const response = NextResponse.json(merged.slice(0, 60).map(({ _rankingScore: _ignored, _relevanceScore: _r, _promotionTier: _t, ...property }) => property));
    response.headers.set('X-Total-Count', String(total));
    response.headers.set('X-Result-Limit', '60');
    return response;
  } catch (error) {
    console.error('API_ROUTE_ERROR: [GET /api/properties]', error);
    return NextResponse.json({ message: 'Error fetching properties.' }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const rawData: Record<string, unknown> = {};
    const uploadedImages: { data: Uint8Array<ArrayBuffer>; mimeType: string }[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      for (const [key, value] of formData.entries()) {
        if (key === 'images' && typeof value !== 'string' && typeof value.arrayBuffer === 'function') {
          const mimeType = value.type || '';
          if (!mimeType.startsWith('image/')) {
            return NextResponse.json({ message: 'Only image files can be uploaded.' }, { status: 400 });
          }

          const bytes = await value.arrayBuffer();
          if (bytes.byteLength === 0) {
            return NextResponse.json({ message: 'An uploaded image is empty.' }, { status: 400 });
          }
          if (bytes.byteLength > 5 * 1024 * 1024) {
            return NextResponse.json({ message: 'Each image must be 5 MB or smaller.' }, { status: 400 });
          }

          uploadedImages.push({
            data: new Uint8Array(bytes) as Uint8Array<ArrayBuffer>,
            mimeType,
          });
        } else if (typeof value === 'string') {
          rawData[key] = value;
        }
      }

      if (rawData.amenities) {
        try {
          rawData.amenities = JSON.parse(String(rawData.amenities));
        } catch {
          return NextResponse.json({ message: 'Invalid amenities data.' }, { status: 400 });
        }
      }
    } else {
      Object.assign(rawData, await request.json());
    }

    const title = getString(rawData.title, 'Untitled Property');
    const description = getString(rawData.description);
    const location = getString(rawData.location, 'Unknown Location');
    const price = getNumber(rawData.price);
    const bedrooms = Math.max(0, Math.trunc(getNumber(rawData.bedrooms)));
    const bathrooms = Math.max(1, Math.trunc(getNumber(rawData.bathrooms, 1)));
    const sizeSqm = getOptionalNumber(rawData.area);
    const amenities = getStringArray(rawData.amenities);
    const phoneNumber = getOptionalString(rawData.phoneNumber);
    const propertyType = getString(rawData.propertyType, 'Apartment');
    const listingType = getString(rawData.listingType, 'FOR_RENT');
    const pricePeriod = getString(rawData.pricePeriod, listingType === 'FOR_SALE' ? 'ONE_TIME' : listingType === 'SHORT_STAY' ? 'NIGHT' : 'MONTH');
    const shortStayMinNights = getOptionalNumber(rawData.shortStayMinNights);
    const shortStayMaxNights = getOptionalNumber(rawData.shortStayMaxNights);
    const cleaningFee = getOptionalNumber(rawData.cleaningFee);
    const securityDeposit = getOptionalNumber(rawData.securityDeposit);
    const maxGuests = getOptionalNumber(rawData.maxGuests);
    const allowedListingTypes = new Set(['FOR_RENT', 'FOR_SALE', 'SHORT_STAY']);
    const allowedPricePeriods = new Set(['MONTH', 'WEEK', 'NIGHT', 'ONE_TIME']);
    if (!allowedListingTypes.has(listingType) || !allowedPricePeriods.has(pricePeriod)) {
      return NextResponse.json({ message: 'Invalid listing type or price period.' }, { status: 400 });
    }
    if (listingType === 'FOR_SALE' && pricePeriod !== 'ONE_TIME') {
      return NextResponse.json({ message: 'Sale listings must use a one-time price.' }, { status: 400 });
    }
    if (listingType === 'SHORT_STAY' && pricePeriod !== 'NIGHT') {
      return NextResponse.json({ message: 'Short-stay listings must use a nightly price.' }, { status: 400 });
    }
    if (shortStayMinNights != null && shortStayMaxNights != null && shortStayMinNights > shortStayMaxNights) {
      return NextResponse.json({ message: 'Minimum nights cannot exceed maximum nights.' }, { status: 400 });
    }

    if (title === 'Untitled Property' || price <= 0 || location === 'Unknown Location') {
      return NextResponse.json({ message: 'Missing or invalid required fields: title, price, and location must be valid.' }, { status: 400 });
    }

    if (uploadedImages.length > 5) {
      return NextResponse.json({ message: 'You can upload a maximum of 5 images.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const requestedCountyId = getOptionalString(rawData.countyId);
      const requestedLocationNodeId = getOptionalString(rawData.locationNodeId);
      const matchedNode = requestedLocationNodeId
        ? await tx.locationNode.findFirst({ where: { id: requestedLocationNodeId, searchable: true } })
        : await tx.locationNode.findFirst({
            where: { name: { equals: location.trim(), mode: 'insensitive' }, searchable: true },
            orderBy: [{ level: 'asc' }, { name: 'asc' }],
          });
      if (!matchedNode) {
        throw new Error('Please select a valid location from the location suggestions.');
      }
      if (requestedCountyId && matchedNode.countyId !== requestedCountyId) {
        throw new Error('The selected location does not belong to the selected county.');
      }

      // Capture an unrecognized area for a best-effort review submission after the
      // property transaction commits. A location-review problem must never block a listing.
      const areaName = location.trim();
      const areaSlug = areaName.toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const existingArea = await tx.locationNode.findFirst({
        where: {
          countyId: matchedNode.countyId,
          parentId: matchedNode.id,
          name: { equals: areaName, mode: 'insensitive' },
        },
        select: { id: true },
      });
      const pendingLocationSubmission = !existingArea && areaSlug
        ? {
            countyId: matchedNode.countyId,
            parentId: matchedNode.id,
            name: areaName,
            slug: areaSlug,
          }
        : null;

      const latitude = getOptionalNumber(rawData.latitude) ?? matchedNode.latitude ?? undefined;
      const longitude = getOptionalNumber(rawData.longitude) ?? matchedNode.longitude ?? undefined;
      const countyId = matchedNode.countyId;
      const created = await tx.property.create({
        data: {
          title, description, location, price, listingType, pricePeriod, shortStayMinNights, shortStayMaxNights, cleaningFee, securityDeposit, maxGuests, bedrooms, bathrooms, sizeSqm, amenities, images: [], phoneNumber, propertyType, status: 'ACTIVE',
          latitude,
          longitude,
          countyId,
          locationNodeId: matchedNode.id,
          locationSource: getOptionalString(rawData.locationSource) ?? 'USER_SELECTED',
          locationAccuracy: getOptionalNumber(rawData.latitude) != null && getOptionalNumber(rawData.longitude) != null ? 'PROPERTY_PIN' : (matchedNode.latitude != null && matchedNode.longitude != null ? 'LOCATION_NODE' : 'AREA_ONLY'),
        },
      });

      if (uploadedImages.length) {
        const storedImages: { id: string }[] = [];
        for (const image of uploadedImages) {
          const stored = await tx.propertyImage.create({
            data: {
              propertyId: created.id,
              data: image.data,
              mimeType: image.mimeType,
            },
            select: { id: true },
          });
          storedImages.push(stored);
        }

        await tx.property.update({
          where: { id: created.id },
          data: {
            images: storedImages.map(
              (image) => '/api/properties/' + created.id + '?image=' + image.id
            ),
          },
        });
      }

      const finalProperty = await tx.property.findUnique({ where: { id: created.id } });
      return { property: finalProperty, pendingLocationSubmission };
    });

    if (!result?.property) {
      return NextResponse.json({ message: 'Property could not be created.' }, { status: 500 });
    }

    if (result.pendingLocationSubmission) {
      try {
        const slugCollision = await prisma.locationNode.findFirst({
          where: {
            countyId: result.pendingLocationSubmission.countyId,
            level: 'AREA',
            slug: result.pendingLocationSubmission.slug,
            parentId: result.pendingLocationSubmission.parentId,
          },
          select: { id: true },
        });
        if (!slugCollision) {
          await prisma.locationNode.create({
            data: {
              ...result.pendingLocationSubmission,
              level: 'AREA',
              searchable: false,
              source: 'USER_SUBMITTED_PENDING_REVIEW',
            },
          });
        }
      } catch (locationReviewError) {
        // The property is already saved and must remain live even if the review queue
        // cannot record this location right now. Log it for operational follow-up.
        console.error('LOCATION_SUBMISSION_CREATE_FAILED:', locationReviewError);
      }
    }

    const property = toProperty(result.property);
    return NextResponse.json({ message: 'Property listed successfully', propertyId: result.property.id, property }, { status: 201 });
  } catch (error: any) {
    console.error('API_ROUTE_ERROR: [POST /api/properties]', error);
    if (error instanceof SyntaxError) return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    console.error('Property creation detail:', error);
    return NextResponse.json({ message: error?.message || 'Error listing property.' }, { status: 500 });
  }
}
