import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: 'Please sign in to access your saved listings.' }, { status: 401 });
    const propertyId = request.nextUrl.searchParams.get('propertyId');
    if (propertyId) {
      const saved = await prisma.savedProperty.findUnique({
        where: { userId_propertyId: { userId: user.id, propertyId } },
        select: { id: true },
      });
      return NextResponse.json({ saved: Boolean(saved) });
    }
    const requestedIds = request.nextUrl.searchParams.get('ids');
    if (requestedIds !== null) {
      const propertyIds = [...new Set(requestedIds.split(',').filter(Boolean))].slice(0, 100);
      if (propertyIds.length === 0) return NextResponse.json({ savedIds: [] });
      const rows = await prisma.savedProperty.findMany({
        where: {
          userId: user.id,
          propertyId: { in: propertyIds },
          property: { status: 'ACTIVE' },
        },
        select: { propertyId: true },
      });
      return NextResponse.json({ savedIds: rows.map((row) => row.propertyId) });
    }
    const rows = await prisma.savedProperty.findMany({
      where: { userId: user.id, property: { status: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      include: { property: { include: { propertyImages: { select: { id: true }, orderBy: { createdAt: 'asc' } } } } },
    });
    const properties = rows.map(({ property }) => ({
      id: property.id,
      title: property.title,
      description: property.description,
      location: property.location,
      price: property.price,
      listingType: property.listingType,
      pricePeriod: property.pricePeriod,
      images: property.propertyImages.length
        ? property.propertyImages.map((image) => '/api/properties/' + property.id + '?image=' + image.id)
        : property.images,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.sizeSqm ?? undefined,
      amenities: property.amenities,
      phoneNumber: property.phoneNumber ?? undefined,
      latitude: property.latitude ?? undefined,
      longitude: property.longitude ?? undefined,
    }));
    return NextResponse.json({ properties });
  } catch (error) {
    console.error('GET /api/saved-properties failed:', error);
    return NextResponse.json({ message: 'Unable to load saved listings.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: 'Please sign in to save listings.' }, { status: 401 });
    const body = await request.json();
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId : '';
    if (!propertyId) return NextResponse.json({ message: 'A property ID is required.' }, { status: 400 });
    const property = await prisma.property.findFirst({ where: { id: propertyId, status: 'ACTIVE' }, select: { id: true } });
    if (!property) return NextResponse.json({ message: 'This listing is no longer available.' }, { status: 404 });
    await prisma.savedProperty.upsert({
      where: { userId_propertyId: { userId: user.id, propertyId } },
      create: { userId: user.id, propertyId },
      update: {},
    });
    return NextResponse.json({ saved: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/saved-properties failed:', error);
    return NextResponse.json({ message: 'Unable to save this listing.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: 'Please sign in to manage saved listings.' }, { status: 401 });
    const body = await request.json();
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId : '';
    if (!propertyId) return NextResponse.json({ message: 'A property ID is required.' }, { status: 400 });
    await prisma.savedProperty.deleteMany({ where: { userId: user.id, propertyId } });
    return NextResponse.json({ saved: false });
  } catch (error) {
    console.error('DELETE /api/saved-properties failed:', error);
    return NextResponse.json({ message: 'Unable to remove this saved listing.' }, { status: 500 });
  }
}
