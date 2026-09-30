import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId : '';
    const type = typeof body.type === 'string' ? body.type.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    if (!propertyId || !type) return NextResponse.json({ message: 'Property and report type are required.' }, { status: 400 });

    const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
    if (!property) return NextResponse.json({ message: 'Property not found.' }, { status: 404 });

    const report = await prisma.propertyReport.create({ data: { propertyId, type, description } });
    return NextResponse.json({ reportId: report.id }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Unable to submit report.' }, { status: 500 });
  }
}
