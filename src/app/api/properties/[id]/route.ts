import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Property } from '@/types/property';
import { getCurrentUser } from '@/lib/user-auth';
import { isAdminSession } from '@/lib/admin-auth';
import { isSupportedImage } from '@/lib/security';
import { deletePropertyImages, storePropertyImage } from '@/lib/property-image-storage';

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
  locationNodeId: data.locationNodeId ?? undefined,
  countyId: data.countyId ?? undefined,
  locationSource: data.locationSource ?? undefined,
  locationAccuracy: data.locationAccuracy ?? undefined,
  countyName: data.county?.name ?? undefined,
  price: data.price, listingType: data.listingType ?? 'FOR_RENT', pricePeriod: data.pricePeriod ?? 'MONTH',
  shortStayMinNights: data.shortStayMinNights ?? undefined, shortStayMaxNights: data.shortStayMaxNights ?? undefined,
  cleaningFee: data.cleaningFee ?? undefined, securityDeposit: data.securityDeposit ?? undefined, maxGuests: data.maxGuests ?? undefined,
  images: data.images, bedrooms: data.bedrooms, bathrooms: data.bathrooms,
  area: data.area ?? undefined, amenities: data.amenities, phoneNumber: data.phoneNumber ?? undefined,
  propertyType: data.propertyType ?? 'Apartment', status: data.status,
  latitude: data.latitude ?? undefined, longitude: data.longitude ?? undefined,
});

const getId = async (params: Promise<{ id: string }>) => (await params).id;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await getId(params);
    if (!id) return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });

    const accessRecord = await prisma.property.findUnique({
      where: { id },
      select: { id: true, ownerId: true, status: true },
    });
    if (!accessRecord) return NextResponse.json({ message: 'Property not found' }, { status: 404 });

    const user = await getCurrentUser();
    const admin = await isAdminSession();
    const isLegacyManager = user?.email?.trim().toLowerCase() === 'info@nyumba-finder.com';
    // Legacy rows have no trustworthy historical owner. Keep them manageable by admin and the reserved management account only.
    const canManage = admin || (!!user && accessRecord.ownerId === user.id) || (accessRecord.ownerId === null && isLegacyManager);
    if (accessRecord.status !== 'ACTIVE' && !canManage) {
      return NextResponse.json({ message: 'Property not found' }, { status: 404 });
    }

    const imageId = new URL(request.url).searchParams.get('image');
    if (imageId) {
      const image = await prisma.propertyImage.findFirst({ where: { id: imageId, propertyId: id } });
      if (!image) return new NextResponse('Image not found', { status: 404 });

      if (image.url) {
        return NextResponse.redirect(image.url, 302);
      }
      if (!image.data) return new NextResponse('Image data unavailable', { status: 404 });
      return new NextResponse(image.data, {
        status: 200,
        headers: {
          'Content-Type': image.mimeType,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': accessRecord.status === 'ACTIVE' ? 'public, max-age=300' : 'private, no-store',
        },
      });
    }

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        locationNode: true,
        county: { select: { name: true } },
        externalListings: { where: { status: 'ACTIVE' }, select: { imageUrls: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      },
    });
    if (!property) return NextResponse.json({ message: 'Property not found' }, { status: 404 });

    const images = await prisma.propertyImage.findMany({
      where: { propertyId: id },
      select: { id: true, url: true },
      orderBy: { createdAt: 'asc' },
    });
    const imageUrl = (imageId: string) => '/api/properties/' + id + '?image=' + imageId;
    const imageByStoredUrl = new Map(images.filter((image) => image.url).map((image) => [image.url as string, image]));
    const imageById = new Map(images.map((image) => [image.id, image]));
    const orderedImages = (property.images ?? [])
      .map((storedUrl) => {
        const match = storedUrl.match(/[?&]image=([^&]+)/);
        return (match ? imageById.get(match[1]) : imageByStoredUrl.get(storedUrl)) ?? null;
      })
      .filter((image, index, list): image is (typeof images)[number] =>
        Boolean(image) && list.findIndex((candidate) => candidate?.id === image?.id) === index
      );
    for (const image of images) {
      if (!orderedImages.some((ordered) => ordered.id === image.id)) orderedImages.push(image);
    }

    return NextResponse.json({
      ...toProperty({
      ...property,
      // Keep the saved property.images order so the chosen main photo remains first.
      images: images.length
        ? orderedImages.map((image) => imageUrl(image.id))
        : (property.externalListings[0]?.imageUrls ?? []),
      }),
      canEdit: canManage,
    });
  } catch (error) {
    console.error('API_ROUTE_ERROR: [GET /api/properties/:id]', error);
    return NextResponse.json({ message: 'Error fetching property details.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await getId(params);
    if (!id) return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });

    const user = await getCurrentUser();
    const admin = await isAdminSession();
    if (!user && !admin) return NextResponse.json({ message: 'Please sign in to edit a property.' }, { status: 401 });
    const accessRecord = await prisma.property.findUnique({ where: { id }, select: { id: true, ownerId: true } });
    if (!accessRecord) return NextResponse.json({ message: 'Property not found.' }, { status: 404 });
    const isLegacyManager = user?.email?.trim().toLowerCase() === 'info@nyumba-finder.com';
    if (!admin && accessRecord.ownerId !== user?.id && !(accessRecord.ownerId === null && isLegacyManager)) {
      return NextResponse.json({ message: 'You can only edit properties listed from your own account.' }, { status: 403 });
    }

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
          const imageBytes = new Uint8Array(bytes);
          if (!isSupportedImage(imageBytes, mimeType)) {
            return NextResponse.json({ message: 'Upload a valid JPEG, PNG, GIF, or WebP image.' }, { status: 400 });
          }

          uploadedImages.push({ data: imageBytes as Uint8Array<ArrayBuffer>, mimeType: mimeType.toLowerCase() });
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
    if ('listingType' in rawData) data.listingType = getString(rawData.listingType, 'FOR_RENT');
    if ('pricePeriod' in rawData) data.pricePeriod = getString(rawData.pricePeriod, 'MONTH');
    if ('shortStayMinNights' in rawData) data.shortStayMinNights = getOptionalNumber(rawData.shortStayMinNights) ?? null;
    if ('shortStayMaxNights' in rawData) data.shortStayMaxNights = getOptionalNumber(rawData.shortStayMaxNights) ?? null;
    if ('cleaningFee' in rawData) data.cleaningFee = getOptionalNumber(rawData.cleaningFee) ?? null;
    if ('securityDeposit' in rawData) data.securityDeposit = getOptionalNumber(rawData.securityDeposit) ?? null;
    if ('maxGuests' in rawData) data.maxGuests = getOptionalNumber(rawData.maxGuests) ?? null;
    if ('bedrooms' in rawData) data.bedrooms = Math.max(0, Math.trunc(getNumber(rawData.bedrooms)));
    if ('bathrooms' in rawData) data.bathrooms = Math.max(1, Math.trunc(getNumber(rawData.bathrooms, 1)));
    if ('area' in rawData) data.sizeSqm = getOptionalNumber(rawData.area) ?? null;
    if ('amenities' in rawData) data.amenities = getStringArray(rawData.amenities);
    if ('images' in rawData && !uploadedImages.length) data.images = getStringArray(rawData.images);

    let retainedImageUrls: string[] | null = null;
    let requestedImageOrder: ({ type: 'existing'; url: string } | { type: 'upload'; index: number })[] | null = null;
    if ('existingImages' in rawData) {
      try {
        retainedImageUrls = getStringArray(JSON.parse(String(rawData.existingImages)));
        data.images = retainedImageUrls;
      } catch {
        return NextResponse.json({ message: 'Invalid existing image data.' }, { status: 400 });
      }
    }
    if ('imageOrder' in rawData) {
      try {
        const parsedOrder = JSON.parse(String(rawData.imageOrder));
        if (!Array.isArray(parsedOrder) || parsedOrder.some((item) =>
          !item || (item.type === 'existing'
            ? typeof item.url !== 'string'
            : item.type === 'upload'
              ? !Number.isInteger(item.index) || item.index < 0
              : true)
        )) {
          return NextResponse.json({ message: 'Invalid photo order.' }, { status: 400 });
        }
        requestedImageOrder = parsedOrder;
      } catch {
        return NextResponse.json({ message: 'Invalid photo order.' }, { status: 400 });
      }
    }

    if ('phoneNumber' in rawData) data.phoneNumber = getOptionalString(rawData.phoneNumber) ?? null;

    if ('location' in rawData || 'locationNodeId' in rawData) {
      const requestedCountyId = getOptionalString(rawData.countyId);
      const requestedLocationNodeId = getOptionalString(rawData.locationNodeId);
      const location = getString(rawData.location).trim();
      const matchedNode = requestedLocationNodeId
        ? await prisma.locationNode.findFirst({ where: { id: requestedLocationNodeId, searchable: true } })
        : await prisma.locationNode.findFirst({
            where: { name: { equals: location, mode: 'insensitive' }, searchable: true },
            orderBy: [{ level: 'asc' }, { name: 'asc' }],
          });
      if (!matchedNode) {
        return NextResponse.json({ message: 'Please select a valid location from the location suggestions.' }, { status: 400 });
      }
      if (requestedCountyId && matchedNode.countyId !== requestedCountyId) {
        return NextResponse.json({ message: 'The selected location does not belong to the selected county.' }, { status: 400 });
      }
      data.locationNodeId = matchedNode.id;
      data.locationSource = getOptionalString(rawData.locationSource) ?? 'USER_SELECTED';
      data.locationAccuracy = getOptionalNumber(rawData.latitude) != null && getOptionalNumber(rawData.longitude) != null ? 'PROPERTY_PIN' : (matchedNode.latitude != null && matchedNode.longitude != null ? 'LOCATION_NODE' : 'AREA_ONLY');
      data.countyId = matchedNode.countyId;
      if (!('latitude' in rawData) && matchedNode.latitude != null) data.latitude = matchedNode.latitude;
      if (!('longitude' in rawData) && matchedNode.longitude != null) data.longitude = matchedNode.longitude;
    }
    if ('latitude' in rawData) data.latitude = getOptionalNumber(rawData.latitude) ?? null;
    if ('longitude' in rawData) data.longitude = getOptionalNumber(rawData.longitude) ?? null;

    if (!Object.keys(data).length && !uploadedImages.length) {
      return NextResponse.json({ message: 'No valid fields provided for update.' }, { status: 400 });
    }

    if ('listingType' in data && !['FOR_RENT', 'FOR_SALE', 'SHORT_STAY'].includes(String(data.listingType))) return NextResponse.json({ message: 'Invalid listing type.' }, { status: 400 });
    if ('pricePeriod' in data && !['MONTH', 'WEEK', 'NIGHT', 'ONE_TIME'].includes(String(data.pricePeriod))) return NextResponse.json({ message: 'Invalid price period.' }, { status: 400 });
    if (String(data.listingType ?? '') === 'FOR_SALE' && data.pricePeriod !== undefined && data.pricePeriod !== 'ONE_TIME') return NextResponse.json({ message: 'Sale listings must use a one-time price.' }, { status: 400 });
    if (String(data.listingType ?? '') === 'SHORT_STAY' && data.pricePeriod !== undefined && data.pricePeriod !== 'NIGHT') return NextResponse.json({ message: 'Short-stay listings must use a nightly price.' }, { status: 400 });
    if ('shortStayMinNights' in data && 'shortStayMaxNights' in data && data.shortStayMinNights != null && data.shortStayMaxNights != null && Number(data.shortStayMinNights) > Number(data.shortStayMaxNights)) return NextResponse.json({ message: 'Minimum nights cannot exceed maximum nights.' }, { status: 400 });
    if ('price' in data && Number(data.price) <= 0) {
      return NextResponse.json({ message: 'Price must be greater than zero.' }, { status: 400 });
    }
    if ('title' in data && !data.title) return NextResponse.json({ message: 'Title is required.' }, { status: 400 });
    if ('location' in data && !data.location) return NextResponse.json({ message: 'Location is required.' }, { status: 400 });

    if (uploadedImages.length > 10) {
      return NextResponse.json({ message: 'You can upload a maximum of 10 images.' }, { status: 400 });
    }

    const currentImages = await prisma.propertyImage.findMany({
      where: { propertyId: id },
      select: { id: true, url: true },
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
    if (finalImageCount > 10) {
      return NextResponse.json({ message: 'A property can have a maximum of 10 images.' }, { status: 400 });
    }

    const removedImageUrls = retainedImageUrls
      ? currentImages
          .filter((image) => !retainedImageIds.has(image.id))
          .map((image) => image.url)
          .filter((url): url is string => Boolean(url))
      : [];

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

      const newImageIds: string[] = [];
      if (uploadedImages.length) {
        for (const image of uploadedImages) {
          const blobUrl = await storePropertyImage(id, image.data, image.mimeType);
          const stored = await tx.propertyImage.create({
            data: {
              propertyId: id,
              data: null,
              url: blobUrl,
              mimeType: image.mimeType,
            },
            select: { id: true },
          });
          newImageIds.push(stored.id);
        }
      }

      const orderedRetainedUrls = retainedImageUrls
        ? retainedImageUrls.filter((url) => {
            const match = url.match(/[?&]image=([^&]+)/);
            return !match || retainedImageIds.has(match[1]);
          })
        : currentImages.map((image) => imageUrl(image.id));
      const fallbackImageOrder = [
        ...orderedRetainedUrls,
        ...newImageIds.map((imageId) => imageUrl(imageId)),
      ];
      const orderedImageUrls = requestedImageOrder
        ? requestedImageOrder
            .map((entry) => {
              if (entry.type === 'existing') {
                return orderedRetainedUrls.includes(entry.url) ? entry.url : null;
              }
              return entry.index < newImageIds.length ? imageUrl(newImageIds[entry.index]) : null;
            })
            .filter((url): url is string => Boolean(url))
            .filter((url, index, list) => list.indexOf(url) === index)
        : fallbackImageOrder;
      await tx.property.update({
        where: { id },
        data: { images: orderedImageUrls },
      });
    });

    await deletePropertyImages(removedImageUrls);

    await prisma.auditLog.create({
      data: {
        action: 'PROPERTY_UPDATED',
        entityType: 'Property',
        entityId: id,
        details: { actorUserId: user?.id ?? null, actorEmail: user?.email ?? 'admin' },
      },
    }).catch((error) => console.error('PROPERTY_UPDATE_AUDIT_FAILED', error));

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
    const user = await getCurrentUser();
    const admin = await isAdminSession();
    if (!user && !admin) return NextResponse.json({ message: 'Please sign in to delete a property.' }, { status: 401 });
    const accessRecord = await prisma.property.findUnique({ where: { id }, select: { id: true, ownerId: true } });
    if (!accessRecord) return NextResponse.json({ message: 'Property not found.' }, { status: 404 });
    const isLegacyManager = user?.email?.trim().toLowerCase() === 'info@nyumba-finder.com';
    if (!admin && accessRecord.ownerId !== user?.id && !(accessRecord.ownerId === null && isLegacyManager)) {
      return NextResponse.json({ message: 'You can only delete properties listed from your own account.' }, { status: 403 });
    }
    const propertyImages = await prisma.propertyImage.findMany({
      where: { propertyId: id },
      select: { url: true },
    });
    await prisma.property.delete({ where: { id } });
    await deletePropertyImages(propertyImages.map((image) => image.url).filter((url): url is string => Boolean(url)));
    await prisma.auditLog.create({
      data: {
        action: 'PROPERTY_DELETED',
        entityType: 'Property',
        entityId: id,
        details: { actorUserId: user?.id ?? null, actorEmail: user?.email ?? 'admin' },
      },
    }).catch((error) => console.error('PROPERTY_DELETE_AUDIT_FAILED', error));
    return NextResponse.json({ message: 'Property deleted successfully', propertyId: id });
  } catch (error: any) {
    console.error('API_ROUTE_ERROR: [DELETE /api/properties/:id]', error);
    if (error?.code === 'P2025') return NextResponse.json({ message: 'Property not found.' }, { status: 404 });
    return NextResponse.json({ message: 'Error deleting property.' }, { status: 500 });
  }
}
