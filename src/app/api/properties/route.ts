import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Property } from '@/types/property';

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
  amenities: string[]; phoneNumber: string | null;
}): Property => ({
  id: data.id,
  title: data.title,
  description: data.description,
  location: data.location,
  price: data.price,
  images: data.images,
  bedrooms: data.bedrooms,
  bathrooms: data.bathrooms,
  area: data.sizeSqm ?? undefined,
  amenities: data.amenities,
  phoneNumber: data.phoneNumber ?? undefined,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const generalQueryTerm = searchParams.get('q')?.trim().toLowerCase();
    const locationQuery = searchParams.get('location')?.trim().toLowerCase();
    const minPrice = getOptionalNumber(searchParams.get('minPrice'));
    const maxPrice = getOptionalNumber(searchParams.get('maxPrice'));
    const minBedroomsParam = searchParams.get('minBedrooms');
    const minBedrooms = minBedroomsParam && minBedroomsParam !== 'all' ? getOptionalNumber(minBedroomsParam) : undefined;
    const minBathroomsParam = searchParams.get('minBathrooms');
    const minBathrooms = minBathroomsParam && minBathroomsParam !== 'all' ? getOptionalNumber(minBathroomsParam) : undefined;
    const selectedAmenities = searchParams.getAll('amenities');

    const rows = await prisma.property.findMany({
      where: {
        ...(minPrice !== undefined || maxPrice !== undefined
          ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } }
          : {}),
        ...(minBedrooms !== undefined ? { bedrooms: { gte: Math.ceil(minBedrooms) } } : {}),
        ...(minBathrooms !== undefined ? { bathrooms: { gte: Math.ceil(minBathrooms) } } : {}),
        ...(locationQuery ? { location: { contains: locationQuery, mode: 'insensitive' } } : {}),
        ...(selectedAmenities.length ? { amenities: { hasEvery: selectedAmenities } } : {}),
        ...(generalQueryTerm ? {
          OR: [
            { title: { contains: generalQueryTerm, mode: 'insensitive' } },
            { description: { contains: generalQueryTerm, mode: 'insensitive' } },
            { location: { contains: generalQueryTerm, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: minPrice !== undefined || maxPrice !== undefined ? { price: 'asc' } : { title: 'asc' },
    });

    return NextResponse.json(rows.map(toProperty));
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

    if (title === 'Untitled Property' || price <= 0 || location === 'Unknown Location') {
      return NextResponse.json({ message: 'Missing or invalid required fields: title, price, and location must be valid.' }, { status: 400 });
    }

    if (uploadedImages.length > 5) {
      return NextResponse.json({ message: 'You can upload a maximum of 5 images.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.property.create({
        data: { title, description, location, price, bedrooms, bathrooms, sizeSqm, amenities, images: [], phoneNumber },
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
