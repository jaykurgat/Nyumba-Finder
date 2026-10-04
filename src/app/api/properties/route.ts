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

    const baseWhere: Prisma.PropertyWhereInput = {
      status: 'ACTIVE' as const,
      ...(propertyTypeQuery && propertyTypeQuery !== 'Any type' ? { propertyType: propertyTypeQuery } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
        : {}),
      ...(minBedrooms !== undefined ? { bedrooms: { gte: Math.ceil(minBedrooms) } } : {}),
      ...(minBathrooms !== undefined ? { bathrooms: { gte: Math.ceil(minBathrooms) } } : {}),
      ...(selectedAmenities.length ? { amenities: { hasEvery: selectedAmenities } } : {}),
      ...(generalQueryTerm ? {
        OR: [
          { title: { contains: generalQueryTerm, mode: 'insensitive' } },
          { description: { contains: generalQueryTerm, mode: 'insensitive' } },
          { location: { contains: generalQueryTerm, mode: 'insensitive' } },
        ],
      } : {}),
      ...(locationContext?.canonicalCountyId ? {
        OR: [
          { countyId: { in: [locationContext.canonicalCountyId, ...neighboringCountyIds] } },
          { title: { contains: locationContext.query, mode: 'insensitive' } },
          { description: { contains: locationContext.query, mode: 'insensitive' } },
          { location: { contains: locationContext.query, mode: 'insensitive' } },
        ],
      } : locationContext?.query ? {
        OR: [
          { title: { contains: locationContext.query, mode: 'insensitive' } },
          { description: { contains: locationContext.query, mode: 'insensitive' } },
          { location: { contains: locationContext.query, mode: 'insensitive' } },
        ],
      } : {}),
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
        const locationMatches = !targetLocation || row.location.toLowerCase().includes(targetLocation);
        const typeMatches = !targetType || row.propertyType.toLowerCase() === targetType;
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

      const relevance =
        (generalQueryTerm && row.title.toLowerCase().includes(generalQueryTerm) ? 100 : 0) +
        (generalQueryTerm && row.location.toLowerCase().includes(generalQueryTerm) ? 60 : 0) +
        (titleLocationMatch ? 700 : 0) +
        (descriptionLocationMatch ? 300 : 0) +
        (locationTextMatch ? 650 : 0) +
        locationRelevanceScore(row.location + (row.county?.name ? ' ' + row.county.name : ''), locationContext) +
        (withinRadius ? 800 + Math.max(0, 200 - distance! * 8) : 0) +
        (distance != null && !withinRadius ? Math.max(0, 120 - distance) : 0);

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
        promotionBoost: promotion?.boost,
        distanceKm: distance != null ? Math.round(distance * 10) / 10 : undefined,
        _rankingScore: relevance + (promotion?.boost ?? 0),
      };
    });

    results.sort((a, b) => {
      if (b._rankingScore !== a._rankingScore) return b._rankingScore - a._rankingScore;
      if (a.distanceKm !== undefined || b.distanceKm !== undefined) {
        if (a.distanceKm === undefined) return 1;
        if (b.distanceKm === undefined) return -1;
        if (a.distanceKm !== b.distanceKm && locationContext?.center) return a.distanceKm - b.distanceKm;
      }
      if (minPrice !== undefined || maxPrice !== undefined) return a.price - b.price;
      return a.title.localeCompare(b.title);
    });

    const response = NextResponse.json(results.slice(0, 60).map(({ _rankingScore: _ignored, ...property }) => property));
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
      const latitude = getOptionalNumber(rawData.latitude) ?? matchedNode.latitude ?? undefined;
      const longitude = getOptionalNumber(rawData.longitude) ?? matchedNode.longitude ?? undefined;
      const countyId = matchedNode.countyId;
      const created = await tx.property.create({
        data: {
          title, description, location, price, bedrooms, bathrooms, sizeSqm, amenities, images: [], phoneNumber, propertyType, status: 'ACTIVE',
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
      return finalProperty;
    });

    if (!result) {
      return NextResponse.json({ message: 'Property could not be created.' }, { status: 500 });
    }

    const property = toProperty(result);
    return NextResponse.json({ message: 'Property listed successfully', propertyId: result.id, property }, { status: 201 });
  } catch (error: any) {
    console.error('API_ROUTE_ERROR: [POST /api/properties]', error);
    if (error instanceof SyntaxError) return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    console.error('Property creation detail:', error);
    return NextResponse.json({ message: error?.message || 'Error listing property.' }, { status: 500 });
  }
}
