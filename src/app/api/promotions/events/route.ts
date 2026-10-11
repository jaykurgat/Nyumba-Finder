import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { allowRateLimitedRequest } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    if (!allowRateLimitedRequest(request, 'promotion-event', 120, 60 * 1000)) {
      return NextResponse.json({ message: 'Too many promotion events.' }, { status: 429, headers: { 'Retry-After': '60' } });
    }
    const body = await request.json();
    const promotionId = typeof body.promotionId === 'string' ? body.promotionId : '';
    const type = body.type === 'CLICK' ? 'CLICK' : body.type === 'IMPRESSION' ? 'IMPRESSION' : '';
    if (!promotionId || !type) return NextResponse.json({ message: 'Invalid promotion event.' }, { status: 400 });

    const promotion = await prisma.propertyPromotion.findUnique({
      where: { id: promotionId },
      select: { id: true, status: true, startsAt: true, endsAt: true },
    });
    const now = new Date();
    if (!promotion || promotion.status !== 'ACTIVE' || promotion.startsAt > now || promotion.endsAt < now) {
      return NextResponse.json({ recorded: false });
    }

    await prisma.promotionEvent.create({ data: { promotionId, type } });
    return NextResponse.json({ recorded: true });
  } catch {
    return NextResponse.json({ message: 'Unable to record promotion event.' }, { status: 500 });
  }
}
