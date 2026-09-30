import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

export async function GET() {
  try {
    await requireAdmin();
    const reports = await prisma.propertyReport.findMany({
      include: { property: { select: { id: true, title: true, location: true, status: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json(reports);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Unable to load reports.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const status = typeof body.status === 'string' ? body.status : '';
    if (!id || !['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'].includes(status)) return NextResponse.json({ message: 'Invalid report update.' }, { status: 400 });
    const report = await prisma.propertyReport.update({ where: { id }, data: { status: status as never } });
    await prisma.auditLog.create({ data: { action: 'REPORT_STATUS_CHANGED', entityType: 'PropertyReport', entityId: id, details: { status } } });
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Unable to update report.' }, { status: 500 });
  }
}
