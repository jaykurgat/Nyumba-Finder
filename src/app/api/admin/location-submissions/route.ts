import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

const slugify = (value: string) =>
  value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function GET() {
  try {
    await requireAdmin();
    const [submissions, parents] = await Promise.all([
      prisma.locationSubmission.findMany({
        where: { status: 'PENDING' },
        include: { suggestedParent: { select: { id: true, name: true, countyName: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.geoLocation.findMany({
        where: { searchable: true, level: { in: [1, 3] } },
        select: { id: true, name: true, level: true, countyName: true },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      }),
    ]);
    return NextResponse.json({ submissions, parents });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Unable to load location submissions.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const action = typeof body.action === 'string' ? body.action : '';
    const parentLocationId = typeof body.parentLocationId === 'string' ? body.parentLocationId : undefined;
    if (!id || !['approve', 'reject', 'merge'].includes(action)) {
      return NextResponse.json({ message: 'Invalid location review action.' }, { status: 400 });
    }

    const submission = await prisma.locationSubmission.findUnique({ where: { id } });
    if (!submission || submission.status !== 'PENDING') {
      return NextResponse.json({ message: 'Location submission not found or already resolved.' }, { status: 404 });
    }

    if (action === 'reject') {
      await prisma.locationSubmission.update({
        where: { id },
        data: { status: 'REJECTED', resolutionNote: typeof body.note === 'string' ? body.note.slice(0, 500) : null },
      });
      return NextResponse.json({ message: 'Location rejected.' });
    }

    const resolvedParent = parentLocationId || submission.parentLocationId;
    if (!resolvedParent) {
      return NextResponse.json({ message: 'A parent location is required before approval.' }, { status: 400 });
    }

    if (action === 'merge') {
      const resolvedLocationId = typeof body.resolvedLocationId === 'string' ? body.resolvedLocationId : '';
      if (!resolvedLocationId) return NextResponse.json({ message: 'Select the existing location to merge into.' }, { status: 400 });
      const target = await prisma.geoLocation.findUnique({ where: { id: resolvedLocationId }, select: { id: true } });
      if (!target) return NextResponse.json({ message: 'Target location not found.' }, { status: 404 });

      await prisma.$transaction([
        prisma.geoLocationAlias.create({
          data: { geoLocationId: target.id, alias: submission.proposedName, normalized: submission.normalized, source: 'user_submission' },
        }),
        prisma.locationSubmission.update({
          where: { id },
          data: { status: 'MERGED', resolvedLocationId: target.id },
        }),
      ]);
      return NextResponse.json({ message: 'Location merged and alias added.' });
    }

    const locationId = `KE-USER-${submission.id}`;
    const created = await prisma.geoLocation.create({
      data: {
        id: locationId,
        parentId: resolvedParent,
        level: 5,
        levelName: 'User-submitted locality',
        type: 'AREA',
        name: submission.proposedName,
        slug: slugify(submission.proposedName),
        latitude: submission.latitude,
        longitude: submission.longitude,
        countyName: (await prisma.geoLocation.findUnique({ where: { id: resolvedParent }, select: { countyName: true } }))?.countyName,
        source: 'user_submission',
        sourceKey: submission.id,
      },
    });

    await prisma.locationSubmission.update({
      where: { id },
      data: { status: 'APPROVED', resolvedLocationId: created.id },
    });

    return NextResponse.json({ message: 'New location approved.', locationId: created.id }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (error?.code === 'P2002') return NextResponse.json({ message: 'That location or alias already exists.' }, { status: 409 });
    console.error('ADMIN_LOCATION_REVIEW_ERROR', error);
    return NextResponse.json({ message: 'Unable to review location.' }, { status: 500 });
  }
}
