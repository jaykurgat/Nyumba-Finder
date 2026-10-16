import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { distanceKm } from '@/lib/location-relevance';

type LocationNodeData = {
  id: string;
  parentId: string | null;
  countyId: string;
  latitude: number | null;
  longitude: number | null;
  level: string;
};

type Candidate = {
  id: string;
  title: string;
  location: string;
  price: number;
  listingType: string;
  pricePeriod: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: number | null;
  propertyType: string;
  countyId: string | null;
  townId: string | null;
  areaId: string | null;
  locationNodeId: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  images: string[];
  locationNode: LocationNodeData | null;
  propertyImages: { id: string }[];
  externalListings: { imageUrls: string[] }[];
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasCoordinates(value: { latitude: number | null; longitude: number | null } | null | undefined): value is { latitude: number; longitude: number } {
  return value?.latitude != null && value.longitude != null;
}

function priceSimilarityScore(currentPrice: number, candidatePrice: number) {
  if (currentPrice <= 0 || candidatePrice <= 0) return 0;
  // Price affects ranking continuously; it is no longer a hard eligibility filter.
  // A 2x price difference still earns some similarity credit, while large differences fade out.
  const logDifference = Math.abs(Math.log(candidatePrice / currentPrice));
  return Math.max(0, 20 - logDifference * 12);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const current = await prisma.property.findFirst({
      where: { id, status: 'ACTIVE' },
      select: {
        id: true, price: true, listingType: true, pricePeriod: true, bedrooms: true, bathrooms: true,
        propertyType: true, location: true, countyId: true, townId: true, areaId: true,
        locationNodeId: true, latitude: true, longitude: true, amenities: true,
        locationNode: { select: { id: true, parentId: true, countyId: true, latitude: true, longitude: true, level: true } },
      },
    });
    if (!current) {
      return NextResponse.json({ properties: [] }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
    }

    // Use a property's coordinates first, then its canonical location node as a fallback.
    const currentPoint = hasCoordinates(current)
      ? { latitude: current.latitude, longitude: current.longitude }
      : hasCoordinates(current.locationNode)
        ? { latitude: current.locationNode.latitude, longitude: current.locationNode.longitude }
        : null;
    const currentNode = current.locationNode;
    const nodeCountyId = currentNode?.countyId ?? current.countyId;
    const nodeConditions: Prisma.LocationNodeWhereInput[] = [];

    if (currentNode?.parentId) nodeConditions.push({ parentId: currentNode.parentId });
    if (currentNode?.id) nodeConditions.push({ parentId: currentNode.id });
    if (currentNode?.parentId) nodeConditions.push({ id: currentNode.parentId });
    if (currentPoint && nodeCountyId) {
      // Rough geographic prefilter only; actual distance is calculated in kilometres below.
      nodeConditions.push({
        latitude: { gte: currentPoint.latitude - 0.25, lte: currentPoint.latitude + 0.25 },
        longitude: { gte: currentPoint.longitude - 0.25, lte: currentPoint.longitude + 0.25 },
      });
    }

    const nearbyNodes = nodeCountyId && nodeConditions.length
      ? await prisma.locationNode.findMany({
          where: { countyId: nodeCountyId, searchable: true, OR: nodeConditions },
          select: { id: true, parentId: true, countyId: true, latitude: true, longitude: true, level: true },
          take: 300,
        })
      : [];
    const relatedNodeIds = [...new Set([
      ...(current.locationNodeId ? [current.locationNodeId] : []),
      ...nearbyNodes.map((node) => node.id),
    ])];

    const localityConditions: Prisma.PropertyWhereInput[] = [
      ...(current.areaId ? [{ areaId: current.areaId }] : []),
      ...(current.townId ? [{ townId: current.townId }] : []),
      ...(current.countyId ? [{ countyId: current.countyId }] : []),
      ...(relatedNodeIds.length ? [{ locationNodeId: { in: relatedNodeIds } }] : []),
      ...(currentPoint ? [{
        latitude: { gte: currentPoint.latitude - 0.25, lte: currentPoint.latitude + 0.25 },
        longitude: { gte: currentPoint.longitude - 0.25, lte: currentPoint.longitude + 0.25 },
      }] : []),
    ];

    const candidates = await prisma.property.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: current.id },
        listingType: current.listingType,
        pricePeriod: current.pricePeriod,
        ...(localityConditions.length ? { OR: localityConditions } : {}),
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, location: true, price: true, listingType: true, pricePeriod: true,
        bedrooms: true, bathrooms: true, sizeSqm: true, propertyType: true, countyId: true, townId: true,
        areaId: true, locationNodeId: true, latitude: true, longitude: true, amenities: true, images: true,
        locationNode: { select: { id: true, parentId: true, countyId: true, latitude: true, longitude: true, level: true } },
        propertyImages: { select: { id: true }, orderBy: { createdAt: 'asc' }, take: 1 },
        externalListings: { where: { status: 'ACTIVE' }, select: { imageUrls: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      },
    }) as Candidate[];

    const currentLocation = normalize(current.location);
    const currentNodeParentId = currentNode?.parentId ?? null;
    const scored = candidates.map((candidate) => {
      const candidateLocation = normalize(candidate.location);
      const sameArea = Boolean(current.areaId && candidate.areaId === current.areaId);
      const sameTown = Boolean(current.townId && candidate.townId === current.townId);
      const sameCounty = Boolean((current.countyId ?? currentNode?.countyId) && candidate.countyId === (current.countyId ?? currentNode?.countyId));
      const sameNode = Boolean(current.locationNodeId && candidate.locationNodeId === current.locationNodeId);
      const sameNodeParent = Boolean(currentNodeParentId && candidate.locationNode?.parentId === currentNodeParentId);
      const sharedLocationText = currentLocation.length > 2 && candidateLocation.length > 2 &&
        (currentLocation.includes(candidateLocation) || candidateLocation.includes(currentLocation));

      const candidatePoint = hasCoordinates(candidate)
        ? { latitude: candidate.latitude, longitude: candidate.longitude }
        : hasCoordinates(candidate.locationNode)
          ? { latitude: candidate.locationNode.latitude, longitude: candidate.locationNode.longitude }
          : null;
      const distance = currentPoint && candidatePoint
        ? distanceKm(currentPoint.latitude, currentPoint.longitude, candidatePoint.latitude, candidatePoint.longitude)
        : undefined;
      const nearby = distance != null && distance <= 25;

      // A candidate must have a meaningful geographic relationship; price/features alone
      // cannot cause a distant property to appear as a related home.
      if (!(sameArea || sameTown || sameNode || sameNodeParent || nearby || (sameCounty && sharedLocationText) || sharedLocationText)) return null;

      let locationScore = 0;
      if (sameArea) locationScore = Math.max(locationScore, 44);
      if (sameTown) locationScore = Math.max(locationScore, 36);
      if (sameNode) locationScore = Math.max(locationScore, 44);
      if (sameNodeParent) locationScore = Math.max(locationScore, 34);
      if (nearby && distance != null) locationScore = Math.max(locationScore, Math.max(8, 34 - distance));
      if (sameCounty && sharedLocationText) locationScore = Math.max(locationScore, 18);
      else if (sharedLocationText) locationScore = Math.max(locationScore, 20);

      let score = locationScore + priceSimilarityScore(current.price, candidate.price);
      if (candidate.propertyType.trim().toLowerCase() === current.propertyType.trim().toLowerCase()) score += 8;
      if (candidate.bedrooms === current.bedrooms) score += 6;
      else if (Math.abs(candidate.bedrooms - current.bedrooms) === 1) score += 3;
      if (candidate.bathrooms === current.bathrooms) score += 3;

      const currentAmenities = new Set(current.amenities.map(normalize));
      score += Math.min(6, candidate.amenities.filter((item) => currentAmenities.has(normalize(item))).length * 1.5);

      return { candidate, score, distance };
    }).filter((item): item is { candidate: Candidate; score: number; distance: number | undefined } => item !== null && item.score >= 42)
      .sort((a, b) => b.score - a.score || (a.distance ?? Infinity) - (b.distance ?? Infinity))
      .slice(0, 4)
      .map(({ candidate, distance }) => ({
        id: candidate.id,
        title: candidate.title,
        location: candidate.location,
        price: candidate.price,
        listingType: candidate.listingType,
        pricePeriod: candidate.pricePeriod,
        bedrooms: candidate.bedrooms,
        bathrooms: candidate.bathrooms,
        area: candidate.sizeSqm ?? undefined,
        propertyType: candidate.propertyType,
        distanceKm: distance,
        images: candidate.propertyImages.length
          ? candidate.propertyImages.map((image) => '/api/properties/' + candidate.id + '?image=' + image.id)
          : (candidate.externalListings[0]?.imageUrls?.length ? candidate.externalListings[0].imageUrls : candidate.images),
      }));

    return NextResponse.json({ properties: scored }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (error) {
    console.error('GET /api/properties/[id]/related failed:', error);
    return NextResponse.json({ properties: [] });
  }
}
