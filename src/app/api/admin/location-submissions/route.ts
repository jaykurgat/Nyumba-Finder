import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

export async function GET() {
  try {
    await requireAdmin();
    const locations = await prisma.locationNode.findMany({
      where: { source: 'USER_SUBMITTED_PENDING_REVIEW', searchable: false },
      include: {
        county: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, level: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ locations });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.error('API_ROUTE_ERROR: [GET /api/admin/location-submissions]', error);
    return NextResponse.json({ message: 'Unable to load pending locations.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    const action = body.action;
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ message: 'Choose a pending location and an action.' }, { status: 400 });
    }

    const existing = await prisma.locationNode.findFirst({
      where: { id, source: 'USER_SUBMITTED_PENDING_REVIEW', searchable: false },
    });
    if (!existing) return NextResponse.json({ message: 'This location is no longer pending review.' }, { status: 404 });

    const approved = action === 'approve';
    const location = await prisma.locationNode.update({
      where: { id },
      data: {
        searchable: approved,
        source: approved ? 'ADMIN_VERIFIED' : 'USER_SUBMITTED_REJECTED',
      },
      include: {
        county: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, level: true } },
      },
    });
    await prisma.auditLog.create({
      data: {
        action: approved ? 'LOCATION_SUBMISSION_APPROVED' : 'LOCATION_SUBMISSION_REJECTED',
        entityType: 'LocationNode',
        entityId: id,
        details: { name: existing.name, level: existing.level, countyId: existing.countyId, parentId: existing.parentId },
      },
    });
    return NextResponse.json({ location });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.error('API_ROUTE_ERROR: [PATCH /api/admin/location-submissions]', error);
    return NextResponse.json({ message: 'Unable to update this location.' }, { status: 500 });
  }
}
