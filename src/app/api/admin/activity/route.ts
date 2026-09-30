import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }));
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Unable to load activity.' }, { status: 500 });
  }
}
