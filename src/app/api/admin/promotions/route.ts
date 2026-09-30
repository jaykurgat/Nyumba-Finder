import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

const parseDate = (value: unknown) => {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

export async function GET() {
  try {
    await requireAdmin();
    const promotions = await prisma.propertyPromotion.findMany({
      include: { property: { select: { id: true, title: true, location: true, propertyType: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json(promotions);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Unable to load promotions.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId : '';
    const startsAt = parseDate(body.startsAt);
    const endsAt = parseDate(body.endsAt);
    if (!propertyId || !startsAt || !endsAt || endsAt <= startsAt) return NextResponse.json({ message: 'Property, start date and end date are required.' }, { status: 400 });

    const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
    if (!property) return NextResponse.json({ message: 'Property not found.' }, { status: 404 });

    const promotion = await prisma.propertyPromotion.create({
      data: {
        propertyId,
        package: typeof body.package === 'string' ? body.package : 'Featured',
        status: body.status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT',
        boost: Math.min(1000, Math.max(1, Number(body.boost) || 20)),
        targetLocation: typeof body.targetLocation === 'string' && body.targetLocation.trim() ? body.targetLocation.trim() : null,
        targetType: typeof body.targetType === 'string' && body.targetType.trim() ? body.targetType.trim() : null,
        minBedrooms: body.minBedrooms === '' || body.minBedrooms == null ? null : Math.max(0, Number(body.minBedrooms)),
        maxBedrooms: body.maxBedrooms === '' || body.maxBedrooms == null ? null : Math.max(0, Number(body.maxBedrooms)),
        budgetCents: body.budgetCents == null || body.budgetCents === '' ? null : Math.max(0, Number(body.budgetCents)),
        startsAt,
        endsAt,
      },
    });
    await prisma.auditLog.create({
      data: { action: 'PROMOTION_CREATED', entityType: 'PropertyPromotion', entityId: promotion.id, details: { propertyId, package: promotion.package, boost: promotion.boost } },
    });
    return NextResponse.json(promotion, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('ADMIN_PROMOTION_POST', error);
    return NextResponse.json({ message: 'Unable to create promotion.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const status = typeof body.status === 'string' ? body.status : undefined;
    if (!id) return NextResponse.json({ message: 'Promotion ID is required.' }, { status: 400 });
    const allowed = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];
    if (status && !allowed.includes(status)) return NextResponse.json({ message: 'Invalid promotion status.' }, { status: 400 });
    const promotion = await prisma.propertyPromotion.update({
      where: { id },
      data: {
        ...(status ? { status: status as never } : {}),
        ...(body.boost != null ? { boost: Math.min(1000, Math.max(1, Number(body.boost) || 1)) } : {}),
      },
    });
    await prisma.auditLog.create({ data: { action: 'PROMOTION_UPDATED', entityType: 'PropertyPromotion', entityId: id, details: { status, boost: body.boost } } });
    return NextResponse.json(promotion);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Unable to update promotion.' }, { status: 500 });
  }
}
