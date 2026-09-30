import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await prisma.siteSetting.findMany({ orderBy: { key: 'asc' } }));
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Unable to load settings.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    const value = typeof body.value === 'string' ? body.value : '';
    if (!key) return NextResponse.json({ message: 'Setting key is required.' }, { status: 400 });
    const setting = await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    await prisma.auditLog.create({ data: { action: 'SETTING_UPDATED', entityType: 'SiteSetting', entityId: setting.id, details: { key } } });
    return NextResponse.json(setting);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Unable to save setting.' }, { status: 500 });
  }
}
