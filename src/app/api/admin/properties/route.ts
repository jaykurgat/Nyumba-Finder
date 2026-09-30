import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const q = new URL(request.url).searchParams.get('q')?.trim();
    const properties = await prisma.property.findMany({
      where: q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
          { propertyType: { contains: q, mode: 'insensitive' } },
        ],
      } : undefined,
      include: {
        propertyImages: { select: { id: true }, orderBy: { createdAt: 'asc' } },
        promotions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return NextResponse.json(properties.map((property) => ({
      id: property.id,
      title: property.title,
      location: property.location,
      price: property.price,
      bedrooms: property.bedrooms,
      propertyType: property.propertyType,
      status: property.status,
      images: property.propertyImages.map((image) => '/api/properties/' + property.id + '?image=' + image.id),
      promotion: property.promotions[0] ? {
        id: property.promotions[0].id,
        package: property.promotions[0].package,
        status: property.promotions[0].status,
        boost: property.promotions[0].boost,
        startsAt: property.promotions[0].startsAt,
        endsAt: property.promotions[0].endsAt,
      } : null,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    })));
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('ADMIN_PROPERTIES_GET', error);
    return NextResponse.json({ message: 'Unable to load properties.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const status = typeof body.status === 'string' ? body.status : '';
    const allowed = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'EXPIRED'];
    if (!id || !allowed.includes(status)) return NextResponse.json({ message: 'Invalid property status update.' }, { status: 400 });

    const property = await prisma.property.update({ where: { id }, data: { status: status as never } });
    await prisma.auditLog.create({
      data: { action: 'PROPERTY_STATUS_CHANGED', entityType: 'Property', entityId: id, details: { status } },
    });
    return NextResponse.json({ propertyId: property.id, status: property.status });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (error?.code === 'P2025') return NextResponse.json({ message: 'Property not found.' }, { status: 404 });
    console.error('ADMIN_PROPERTIES_PATCH', error);
    return NextResponse.json({ message: 'Unable to update property.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Property ID is required.' }, { status: 400 });
    await prisma.property.delete({ where: { id } });
    await prisma.auditLog.create({ data: { action: 'PROPERTY_DELETED', entityType: 'Property', entityId: id } });
    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (error?.code === 'P2025') return NextResponse.json({ message: 'Property not found.' }, { status: 404 });
    console.error('ADMIN_PROPERTIES_DELETE', error);
    return NextResponse.json({ message: 'Unable to delete property.' }, { status: 500 });
  }
}
