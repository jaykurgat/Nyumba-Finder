import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { distanceKm } from '@/lib/location-relevance';
type Candidate = { id: string; title: string; location: string; price: number; listingType: string; pricePeriod: string; bedrooms: number; bathrooms: number; sizeSqm: number | null; propertyType: string; countyId: string | null; townId: string | null; areaId: string | null; latitude: number | null; longitude: number | null; amenities: string[]; images: string[]; propertyImages: { id: string }[]; externalListings: { imageUrls: string[] }[] };
function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const current = await prisma.property.findFirst({ where: { id, status: 'ACTIVE' }, select: { id: true, price: true, listingType: true, pricePeriod: true, bedrooms: true, bathrooms: true, propertyType: true, location: true, countyId: true, townId: true, areaId: true, latitude: true, longitude: true, amenities: true } });
    if (!current) return NextResponse.json({ properties: [] }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
    const localityConditions = [
      ...(current.areaId ? [{ areaId: current.areaId }] : []),
      ...(current.townId ? [{ townId: current.townId }] : []),
      ...(current.countyId ? [{ countyId: current.countyId }] : []),
      ...(current.latitude != null && current.longitude != null ? [{ latitude: { gte: current.latitude - 0.2, lte: current.latitude + 0.2 }, longitude: { gte: current.longitude - 0.2, lte: current.longitude + 0.2 } }] : []),
    ];
    const candidates = await prisma.property.findMany({
      where: { status: 'ACTIVE', id: { not: current.id }, listingType: current.listingType, pricePeriod: current.pricePeriod, price: { gte: current.price * 0.65, lte: current.price * 1.45 }, ...(localityConditions.length ? { OR: localityConditions } : {}) },
      take: 100, orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, location: true, price: true, listingType: true, pricePeriod: true, bedrooms: true, bathrooms: true, sizeSqm: true, propertyType: true, countyId: true, townId: true, areaId: true, latitude: true, longitude: true, amenities: true, images: true, propertyImages: { select: { id: true }, orderBy: { createdAt: 'asc' }, take: 1 }, externalListings: { where: { status: 'ACTIVE' }, select: { imageUrls: true }, orderBy: { createdAt: 'asc' }, take: 1 } },
    }) as Candidate[];
    const currentLocation = normalize(current.location);
    const scored = candidates.map((candidate) => {
      const candidateLocation = normalize(candidate.location);
      const sameArea = Boolean(current.areaId && candidate.areaId === current.areaId);
      const sameTown = Boolean(current.townId && candidate.townId === current.townId);
      const sameCounty = Boolean(current.countyId && candidate.countyId === current.countyId);
      const sharedLocationText = currentLocation.length > 2 && candidateLocation.length > 2 && (currentLocation.includes(candidateLocation) || candidateLocation.includes(currentLocation));
      const distance = current.latitude != null && current.longitude != null && candidate.latitude != null && candidate.longitude != null ? distanceKm(current.latitude, current.longitude, candidate.latitude, candidate.longitude) : undefined;
      const nearby = distance != null && distance <= 15;
      if (!(sameArea || sameTown || (sameCounty && (nearby || sharedLocationText)) || nearby || sharedLocationText)) return null;
      let score = sameArea ? 40 : sameTown ? 32 : nearby ? Math.max(12, 30 - distance!) : sameCounty || sharedLocationText ? 18 : 0;
      const priceRatio = candidate.price / Math.max(current.price, 1);
      score += Math.max(0, 25 - Math.abs(1 - priceRatio) * 55);
      if (candidate.propertyType.trim().toLowerCase() === current.propertyType.trim().toLowerCase()) score += 10;
      if (candidate.bedrooms === current.bedrooms) score += 8; else if (Math.abs(candidate.bedrooms - current.bedrooms) === 1) score += 4;
      if (candidate.bathrooms === current.bathrooms) score += 4;
      const currentAmenities = new Set(current.amenities.map(normalize));
      score += Math.min(8, candidate.amenities.filter((item) => currentAmenities.has(normalize(item))).length * 2);
      return { candidate, score, distance };
    }).filter((item): item is { candidate: Candidate; score: number; distance: number | undefined } => item !== null && item.score >= 48)
      .sort((a, b) => b.score - a.score || (a.distance ?? Infinity) - (b.distance ?? Infinity)).slice(0, 4)
      .map(({ candidate, distance }) => ({ id: candidate.id, title: candidate.title, location: candidate.location, price: candidate.price, listingType: candidate.listingType, pricePeriod: candidate.pricePeriod, bedrooms: candidate.bedrooms, bathrooms: candidate.bathrooms, area: candidate.sizeSqm ?? undefined, propertyType: candidate.propertyType, distanceKm: distance, images: candidate.propertyImages.length ? candidate.propertyImages.map((image) => '/api/properties/' + candidate.id + '?image=' + image.id) : (candidate.externalListings[0]?.imageUrls?.length ? candidate.externalListings[0].imageUrls : candidate.images) }));
    return NextResponse.json({ properties: scored }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (error) { console.error('GET /api/properties/[id]/related failed:', error); return NextResponse.json({ properties: [] }); }
}