import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Property } from '@/types/property';

const getString = (value: unknown, defaultValue = '') => typeof value === 'string' ? value : defaultValue;
const getOptionalString = (value: unknown) => typeof value === 'string' && value.trim() !== '' ? value : undefined;
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

const toProperty = (data: any): Property => ({
  id: data.id, title: data.title, description: data.description, location: data.location,
  price: data.price, images: data.images, bedrooms: data.bedrooms, bathrooms: data.bathrooms,
  area: data.area ?? undefined, amenities: data.amenities, phoneNumber: data.phoneNumber ?? undefined,
});

const getId = async (params: Promise<{ id: string }>) => (await params).id;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await getId(params);
    if (!id) return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });

    const imageId = new URL(request.url).searchParams.get('image');
    if (imageId) {
      const image = await prisma.propertyImage.findFirst({ where: { id: imageId, propertyId: id } });
      if (!image) return new NextResponse('Image not found', { status: 404 });

      return new NextResponse(image.data, {
        status: 200,
        headers: {
          'Content-Type': image.mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) return NextResponse.json({ message: 'Property not found' }, { status: 404 });

    const images = await prisma.propertyImage.findMany({
      where: { propertyId: id },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(toProperty({
      ...property,
      // PropertyImage is the source of truth for uploaded images.
      // Do not append property.images here or every edit would return duplicates.
      images: images.map((image) => '/api/properties/' + id + '?image=' + image.id),
    }));
  } catch (error) {
    console.error('API_ROUTE_ERROR: [GET /api/properties/:id]', error);
    return NextResponse.json({ message: 'Error fetching property details.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await getId(params);
    if (!id) return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });

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
        rawData.amenities = JSON.parse(String(rawData.amenities));
      }
    } else {
      Object.assign(rawData, await request.json());
    }

    const data: Record<string, unknown> = {};
    if ('title' in rawData) data.title = getString(rawData.title);
    if ('description' in rawData) data.description = getString(rawData.description);
    if ('location' in rawData) data.location = getString(rawData.location);
    if ('propertyType' in rawData) data.propertyType = getString(rawData.propertyType, 'Apartment');
    if ('price' in rawData) data.price = getNumber(rawData.price);
    if ('bedrooms' in rawData) data.bedrooms = Math.max(0, Math.trunc(getNumber(rawData.bedrooms)));
    if ('bathrooms' in rawData) data.bathrooms = Math.max(1, Math.trunc(getNumber(rawData.bathrooms, 1)));
    if ('area' in rawData) data.sizeSqm = getOptionalNumber(rawData.area) ?? null;
    if ('amenities' in rawData) data.amenities = getStringArray(rawData.amenities);
    if ('images' in rawData && !uploadedImages.length) data.images = getStringArray(rawData.images);

    let retainedImageUrls: string[] | null = null;
    if ('existingImages' in rawData) {
      try {
        retainedImageUrls = getStringArray(JSON.parse(String(rawData.existingImages)));
        data.images = retainedImageUrls;
      } catch {
        return NextResponse.json({ message: 'Invalid existing image data.' }, { status: 400 });
      }
    }

    if ('phoneNumber' in rawData) data.phoneNumber = getOptionalString(rawData.phoneNumber) ?? null;

    if (!Object.keys(data).length && !uploadedImages.length) {
      return NextResponse.json({ message: 'No valid fields provided for update.' }, { status: 400 });
    }

    if ('price' in data && Number(data.price) <= 0) {
      return NextResponse.json({ message: 'Price must be greater than zero.' }, { status: 400 });
    }
    if ('title' in data && !data.title) return NextResponse.json({ message: 'Title is required.' }, { status: 400 });
    if ('location' in data && !data.location) return NextResponse.json({ message: 'Location is required.' }, { status: 400 });

    if (uploadedImages.length > 5) {
      return NextResponse.json({ message: 'You can upload a maximum of 5 images.' }, { status: 400 });
    }

    const currentImages = await prisma.propertyImage.findMany({
      where: { propertyId: id },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    const imageUrl = (imageId: string) => '/api/properties/' + id + '?image=' + imageId;
    const retainedImageIds = retainedImageUrls
      ? new Set(
          retainedImageUrls
            .map((url) => {
              const match = url.match(/[?&]image=([^&]+)/);
              return match?.[1] || null;
            })
            .filter((imageId): imageId is string => Boolean(imageId))
        )
      : new Set(currentImages.map((image) => image.id));

    const finalImageCount = retainedImageIds.size + uploadedImages.length;
    if (finalImageCount > 5) {
      return NextResponse.json({ message: 'A property can have a maximum of 5 images.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.property.update({ where: { id }, data });

      if (retainedImageUrls) {
        await tx.propertyImage.deleteMany({
          where: {
            propertyId: id,
            id: { notIn: Array.from(retainedImageIds) },
          },
        });
      }

      if (uploadedImages.length) {
        await Promise.all(
          uploadedImages.map((image) =>
            tx.propertyImage.create({
              data: {
                propertyId: id,
                data: image.data,
                mimeType: image.mimeType,
              },
            })
          )
        );
      }

      const storedImages = await tx.propertyImage.findMany({
        where: { propertyId: id },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });

      await tx.property.update({
        where: { id },
        data: {
          images: storedImages.map((image) => imageUrl(image.id)),
        },
      });
    });

    const finalProperty = await prisma.property.findUnique({ where: { id } });

    return NextResponse.json({
      message: 'Property updated successfully',
      propertyId: id,
      property: finalProperty && toProperty(finalProperty),
    });
  } catch (error: any) {
    console.error('API_ROUTE_ERROR: [PUT /api/properties/:id]', error);
    if (error?.code === 'P2025') return NextResponse.json({ message: 'Property not found.' }, { status: 404 });
    if (error instanceof SyntaxError) return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    console.error('Property update detail:', error);
    return NextResponse.json({ message: error?.message || 'Error updating property.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await getId(params);
    if (!id) return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ message: 'Property deleted successfully', propertyId: id });
  } catch (error: any) {
    console.error('API_ROUTE_ERROR: [DELETE /api/properties/:id]', error);
    if (error?.code === 'P2025') return NextResponse.json({ message: 'Property not found.' }, { status: 404 });
    return NextResponse.json({ message: 'Error deleting property.' }, { status: 500 });
  }
}
