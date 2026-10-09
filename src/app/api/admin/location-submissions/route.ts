import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

const allowedLevels = ['TOWN', 'CITY', 'ESTATE', 'NEIGHBORHOOD', 'AREA', 'VILLAGE', 'LOCALITY'];

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET() {
  try {
    await requireAdmin();
    const [locations, counties, towns] = await Promise.all([
      prisma.locationNode.findMany({
        where: { source: 'USER_SUBMITTED_PENDING_REVIEW', searchable: false },
        include: { county: { select: { id: true, name: true } }, parent: { select: { id: true, name: true, level: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.county.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.locationNode.findMany({
        where: { level: { in: ['TOWN', 'CITY'] }, searchable: true },
        select: { id: true, name: true, level: true, countyId: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return NextResponse.json({ locations, counties, towns });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const level = typeof body.level === 'string' ? body.level.toUpperCase() : '';
    const countyId = typeof body.countyId === 'string' ? body.countyId : '';
    const parentId = typeof body.parentId === 'string' && body.parentId ? body.parentId : null;
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ message: 'Choose a pending location and an action.' }, { status: 400 });
    }
    if (!name || name.length < 2 || name.length > 100 || !slugify(name)) {
      return NextResponse.json({ message: 'Enter a valid location name (2–100 characters).' }, { status: 400 });
    }
    if (!allowedLevels.includes(level) || !countyId) {
      return NextResponse.json({ message: 'Choose a valid location type and parent county.' }, { status: 400 });
    }

    const existing = await prisma.locationNode.findFirst({
      where: { id, source: 'USER_SUBMITTED_PENDING_REVIEW', searchable: false },
    });
    if (!existing) return NextResponse.json({ message: 'This location is no longer pending review.' }, { status: 404 });

    const county = await prisma.county.findUnique({ where: { id: countyId }, select: { id: true } });
    if (!county) return NextResponse.json({ message: 'The selected county does not exist.' }, { status: 400 });

    let validatedParentId: string | null = null;
    if (!['TOWN', 'CITY'].includes(level) && parentId) {
      const parent = await prisma.locationNode.findFirst({
        where: { id: parentId, countyId, level: { in: ['TOWN', 'CITY'] }, searchable: true },
        select: { id: true },
      });
      if (!parent) return NextResponse.json({ message: 'Choose a verified town or city belonging to the selected county.' }, { status: 400 });
      validatedParentId = parent.id;
    }

    const slug = slugify(name);
    const duplicate = await prisma.locationNode.findFirst({
      where: { countyId, level, slug, parentId: validatedParentId, id: { not: id }, source: { not: 'USER_SUBMITTED_REJECTED' } },
      select: { id: true, name: true },
    });
    if (duplicate) return NextResponse.json({ message: 'A verified location with that name already exists under this parent: ' + duplicate.name + '.' }, { status: 409 });

    const approved = action === 'approve';
    const location = await prisma.locationNode.update({
      where: { id },
      data: {
        name, slug, level, countyId, parentId: validatedParentId,
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
        details: {
          previousName: existing.name, name, previousLevel: existing.level, level,
          previousCountyId: existing.countyId, countyId, previousParentId: existing.parentId, parentId: validatedParentId,
        },
      },
    });
    return NextResponse.json({ location });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ message: 'A location with these details already exists. Check the county, parent and spelling.' }, { status: 409 });
    }
    console.error('API_ROUTE_ERROR: [PATCH /api/admin/location-submissions]', error);
    return NextResponse.json({ message: 'Unable to update this location.' }, { status: 500 });
  }
}
