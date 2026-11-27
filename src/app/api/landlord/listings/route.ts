import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/user-auth';
import { isAdminSession } from '@/lib/admin-auth';
import { isSuperlandlord } from '@/lib/listing-access';

export async function GET() {
  try {
    const [user, admin] = await Promise.all([getCurrentUser(), isAdminSession()]);
    if (!user && !admin) return NextResponse.json({ message: 'Please sign in to manage listings.' }, { status: 401 });
    const canSeeAll = admin || isSuperlandlord(user);
    const listings = await prisma.property.findMany({
      where: canSeeAll ? undefined : { ownerId: user!.id },
      include: {
        propertyImages: { select: { id: true }, orderBy: { createdAt: 'asc' } },
        owner: { select: { id: true, email: true, createdAt: true, profile: { select: { displayName: true, firstName: true, lastName: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: canSeeAll ? 250 : 100,
    });
    return NextResponse.json({
      listings: listings.map((item) => ({
        id: item.id, title: item.title, location: item.location, price: item.price,
        propertyType: item.propertyType, bedrooms: item.bedrooms, status: item.status,
        availability: item.availability, images: item.propertyImages.map((image) => `/api/properties/${item.id}?image=${image.id}`),
        createdAt: item.createdAt, updatedAt: item.updatedAt,
        ...(canSeeAll ? { metadata: {
          ownerId: item.ownerId,
          listedBy: item.owner ? {
            name: item.owner.profile?.displayName || [item.owner.profile?.firstName, item.owner.profile?.lastName].filter(Boolean).join(' ') || null,
            email: item.owner.email,
            accountCreatedAt: item.owner.createdAt,
          } : null,
          listingId: item.id,
        } } : {}),
      })),
      view: admin ? 'ADMIN' : isSuperlandlord(user) ? 'SUPERLANDLORD' : 'LANDLORD',
    });
  } catch (error) {
    console.error('LANDLORD_LISTINGS_GET', error);
    return NextResponse.json({ message: 'Unable to load your listings.' }, { status: 500 });
  }
}

