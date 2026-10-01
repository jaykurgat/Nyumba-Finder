import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const proposedName = typeof body.proposedName === 'string' ? body.proposedName.trim() : '';
    const parentLocationId = typeof body.parentLocationId === 'string' ? body.parentLocationId : undefined;
    const context = typeof body.context === 'string' ? body.context.trim().slice(0, 500) : undefined;
    const latitude = Number.isFinite(Number(body.latitude)) ? Number(body.latitude) : undefined;
    const longitude = Number.isFinite(Number(body.longitude)) ? Number(body.longitude) : undefined;

    if (proposedName.length < 2 || proposedName.length > 120) {
      return NextResponse.json({ message: 'Please provide a location name.' }, { status: 400 });
    }

    const normalized = normalize(proposedName);
    if (!normalized) return NextResponse.json({ message: 'Invalid location name.' }, { status: 400 });

    const duplicate = await prisma.geoLocation.findFirst({
      where: {
        searchable: true,
        OR: [
          { name: { equals: proposedName, mode: 'insensitive' } },
          { aliases: { some: { normalized } } },
        ],
      },
      select: { id: true, name: true },
    });

    if (duplicate) {
      return NextResponse.json({
        message: 'This location already exists.',
        location: duplicate,
      }, { status: 409 });
    }

    const existingSubmission = await prisma.locationSubmission.findFirst({
      where: { normalized, status: 'PENDING' },
      select: { id: true },
    });
    if (existingSubmission) {
      return NextResponse.json({ message: 'This location is already awaiting review.' }, { status: 409 });
    }

    const submission = await prisma.locationSubmission.create({
      data: {
        proposedName,
        normalized,
        parentLocationId,
        latitude,
        longitude,
        context,
      },
    });

    return NextResponse.json({ message: 'Location submitted for review.', submissionId: submission.id }, { status: 201 });
  } catch (error) {
    console.error('LOCATION_SUBMISSION_ERROR', error);
    return NextResponse.json({ message: 'Unable to submit location.' }, { status: 500 });
  }
}
