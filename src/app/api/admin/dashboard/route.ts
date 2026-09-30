import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

export async function GET() {
  try {
    await requireAdmin();
    const [total, active, pending, suspended, rejected, promotions, recentActivity] = await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { status: 'ACTIVE' } }),
      prisma.property.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.property.count({ where: { status: 'SUSPENDED' } }),
      prisma.property.count({ where: { status: 'REJECTED' } }),
      prisma.propertyPromotion.count({ where: { status: 'ACTIVE', startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    return NextResponse.json({ total, active, pending, suspended, rejected, promotions, recentActivity });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('ADMIN_DASHBOARD_GET', error);
    return NextResponse.json({ message: 'Unable to load dashboard.' }, { status: 500 });
  }
}
