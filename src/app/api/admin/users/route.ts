import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      include: { profile: true, landlordProfile: true, tenantProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Unable to load users.' }, { status: 500 });
  }
}
