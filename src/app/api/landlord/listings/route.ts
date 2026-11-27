import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user-auth';
import { isAdminSession } from '@/lib/admin-auth';
import { isSuperlandlord } from '@/lib/listing-access';

const pageSizes = [20, 50, 100, 200];

function csvCell(value: unknown) {
  const text = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  return '"' + text.replaceAll('"', '""') + '"';
}

export async function GET(request: Request) {
  try {
    const [user, admin] = await Promise.all([getCurrentUser(), isAdminSession()]);
    if (!user && !admin) return NextResponse.json({ message: 'Please sign in to manage listings.' }, { status: 401 });
    const canSeeAll = admin || isSuperlandlord(user);
    const params = new URL(request.url).searchParams;
    if (params.get('format') === 'csv' && !canSeeAll) return NextResponse.json({ message: 'CSV export is available to superlandlords and administrators.' }, { status: 403 });
    const q = params.get('q')?.trim() || '';
    const status = params.get('status') || '';
    const availability = params.get('availability') || '';
    const pageSizeValue = Number(params.get('pageSize'));
    const pageSize = pageSizes.includes(pageSizeValue) ? pageSizeValue : 20;
    const requestedPage = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
    const searchWhere = q ? {
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { location: { contains: q, mode: 'insensitive' as const } },
        { propertyType: { contains: q, mode: 'insensitive' as const } },
        ...(canSeeAll ? [
          { owner: { is: { email: { contains: q, mode: 'insensitive' as const } } } },
          { owner: { is: { profile: { is: { displayName: { contains: q, mode: 'insensitive' as const } } } } } },
        ] : []),
      ],
    } : {};
    const where = {
      ...(!canSeeAll ? { ownerId: user!.id } : {}),
      ...(status && ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'EXPIRED'].includes(status) ? { status: status as never } : {}),
      ...(availability && ['AVAILABLE', 'UNAVAILABLE', 'SOLD'].includes(availability) ? { availability: availability as never } : {}),
      ...searchWhere,
    };
    const total = await prisma.property.count({ where });
    const page = params.get('format') === 'csv' ? 1 : Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
    const listings = await prisma.property.findMany({
      where,
      include: {
        owner: { select: { email: true, profile: { select: { displayName: true, firstName: true, lastName: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      ...(params.get('format') === 'csv' ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    });
    const view = admin ? 'ADMIN' : isSuperlandlord(user) ? 'SUPERLANDLORD' : 'LANDLORD';
    if (params.get('format') === 'csv') {
      const header = ['Property', 'Location', 'Price KES', 'Type', 'Bedrooms', 'Review status', 'Availability', 'Listed at', 'Listing owner', 'Owner email'];
      const lines = listings.map((item) => {
        const ownerName = item.owner?.profile?.displayName || [item.owner?.profile?.firstName, item.owner?.profile?.lastName].filter(Boolean).join(' ') || '';
        return [item.title, item.location, item.price, item.propertyType, item.bedrooms === 0 ? 'Studio' : item.bedrooms, item.status, item.availability, item.createdAt, ownerName || (item.owner ? 'Account holder' : 'Unlinked'), item.owner?.email || ''].map(csvCell).join(',');
      });
      return new NextResponse([header.map(csvCell).join(','), ...lines].join('\r\n'), {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="nyumbafinder-listings.csv"', 'Cache-Control': 'no-store' },
      });
    }
    return NextResponse.json({
      view, total, page, pageSize,
      listings: listings.map((item) => ({
        id: item.id, title: item.title, location: item.location, price: item.price,
        propertyType: item.propertyType, bedrooms: item.bedrooms, status: item.status,
        availability: item.availability,
        createdAt: item.createdAt,
        ...(canSeeAll ? { metadata: {
          listedBy: item.owner ? {
            name: item.owner.profile?.displayName || [item.owner.profile?.firstName, item.owner.profile?.lastName].filter(Boolean).join(' ') || null,
            email: item.owner.email,
          } : null,
        } } : {}),
      })),
    });
  } catch (error) {
    console.error('LANDLORD_LISTINGS_GET', error);
    return NextResponse.json({ message: 'Unable to load your listings.' }, { status: 500 });
  }
}

