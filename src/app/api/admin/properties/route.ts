import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const q = params.get('q')?.trim() || '';
    const status = params.get('status') || '';
    const availability = params.get('availability') || '';
    const pageSizes = [20, 50, 100, 200];
    const pageSizeValue = Number(params.get('pageSize'));
    const pageSize = pageSizes.includes(pageSizeValue) ? pageSizeValue : 20;
    const requestedPage = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
    const where = {
      ...(status && ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'EXPIRED'].includes(status) ? { status: status as never } : {}),
      ...(availability && ['AVAILABLE', 'UNAVAILABLE', 'SOLD'].includes(availability) ? { availability: availability as never } : {}),
      ...(q ? { OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { location: { contains: q, mode: 'insensitive' as const } },
        { propertyType: { contains: q, mode: 'insensitive' as const } },
        { owner: { is: { email: { contains: q, mode: 'insensitive' as const } } } },
        { owner: { is: { profile: { is: { displayName: { contains: q, mode: 'insensitive' as const } } } } } },
      ] } : {}),
    };
    const total = await prisma.property.count({ where });
    const page = params.get('format') === 'csv' ? 1 : Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
    const properties = await prisma.property.findMany({
      where,
      include: {
        owner: { select: { email: true, profile: { select: { displayName: true, firstName: true, lastName: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      ...(params.get('format') === 'csv' ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    });
    if (params.get('format') === 'csv') {
      const cell = (value: unknown) => '"' + (value == null ? '' : value instanceof Date ? value.toISOString() : String(value)).replaceAll('"', '""') + '"';
      const header = ['Property', 'Location', 'Price KES', 'Type', 'Bedrooms', 'Review status', 'Availability', 'Listed at', 'Listing owner', 'Owner email'];
      const lines = properties.map((property) => {
        const ownerName = property.owner?.profile?.displayName || [property.owner?.profile?.firstName, property.owner?.profile?.lastName].filter(Boolean).join(' ') || '';
        return [property.title, property.location, property.price, property.propertyType, property.bedrooms === 0 ? 'Studio' : property.bedrooms, property.status, property.availability, property.createdAt, ownerName || (property.owner ? 'Account holder' : 'Unlinked'), property.owner?.email || ''].map(cell).join(',');
      });
      return new NextResponse([header.map(cell).join(','), ...lines].join('\r\n'), {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="nyumbafinder-listings.csv"', 'Cache-Control': 'no-store' },
      });
    }
    return NextResponse.json({ rows: properties.map((property) => ({
      id: property.id,
      title: property.title,
      location: property.location,
      price: property.price,
      bedrooms: property.bedrooms,
      propertyType: property.propertyType,
      status: property.status,
      availability: property.availability,
      listingCreatedAt: property.createdAt,
      owner: property.owner ? {
        email: property.owner.email,
        name: property.owner.profile?.displayName || [property.owner.profile?.firstName, property.owner.profile?.lastName].filter(Boolean).join(' ') || null,
      } : null,
    })), total, page, pageSize });
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
    const availability = typeof body.availability === 'string' ? body.availability : '';
    const hasPartnerContact = Object.prototype.hasOwnProperty.call(body, 'partnerContactId');
    const partnerContactId = typeof body.partnerContactId === 'string' && body.partnerContactId ? body.partnerContactId : null;
    const allowed = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'EXPIRED'];
    const validAvailability = ['AVAILABLE', 'UNAVAILABLE', 'SOLD'].includes(availability);
    if (!id || (!allowed.includes(status) && !hasPartnerContact && !validAvailability)) return NextResponse.json({ message: 'Invalid property update.' }, { status: 400 });
    if (hasPartnerContact && partnerContactId) {
      const contact = await prisma.partnerContact.findUnique({ where: { id: partnerContactId }, select: { id: true } });
      if (!contact) return NextResponse.json({ message: 'Selected partner contact was not found.' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (allowed.includes(status)) updateData.status = status;
    if (validAvailability) updateData.availability = availability;
    if (hasPartnerContact) updateData.partnerContactId = partnerContactId;
    const property = await prisma.property.update({ where: { id }, data: updateData as never });
    await prisma.auditLog.create({
      data: { action: hasPartnerContact && !allowed.includes(status) && !validAvailability ? 'PROPERTY_PARTNER_SOURCE_CHANGED' : 'PROPERTY_UPDATED', entityType: 'Property', entityId: id, details: { ...(allowed.includes(status) ? { status } : {}), ...(validAvailability ? { availability } : {}), ...(hasPartnerContact ? { partnerContactId } : {}) } },
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

