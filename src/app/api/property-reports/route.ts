import { createHash, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SERIOUS_REPORT_TYPES = new Set(['Possible scam', 'Inappropriate content']);

function getReporterHash(request: NextRequest) {
  const existing = request.cookies.get('nf_reporter_id')?.value;
  const reporterId = existing || randomUUID();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const userAgent = request.headers.get('user-agent') || '';
  return {
    reporterId,
    hash: createHash('sha256').update(reporterId + '|' + forwarded + '|' + userAgent).digest('hex'),
    isNew: !existing,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId : '';
    const type = typeof body.type === 'string' ? body.type.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    if (!propertyId || !type) return NextResponse.json({ message: 'Property and report type are required.' }, { status: 400 });

    const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, status: true } });
    if (!property) return NextResponse.json({ message: 'Property not found.' }, { status: 404 });

    const reporter = getReporterHash(request);
    const existingReport = await prisma.propertyReport.findUnique({
      where: { propertyId_reporterHash: { propertyId, reporterHash: reporter.hash } },
      select: { id: true },
    });

    if (existingReport) {
      return NextResponse.json({ message: 'You have already reported this listing.' }, { status: 409 });
    }

    const report = await prisma.propertyReport.create({
      data: { propertyId, type, description, reporterHash: reporter.hash },
    });

    const openReports = await prisma.propertyReport.count({
      where: { propertyId, status: { in: ['OPEN', 'REVIEWING'] } },
    });

    const needsReview = openReports >= 5 || SERIOUS_REPORT_TYPES.has(type);

    if (needsReview && property.status === 'ACTIVE') {
      await prisma.$transaction([
        prisma.property.update({
          where: { id: propertyId },
          data: { status: 'PENDING_REVIEW' },
        }),
        prisma.auditLog.create({
          data: {
            action: openReports >= 5 ? 'PROPERTY_AUTO_FLAGGED_REPORT_THRESHOLD' : 'PROPERTY_AUTO_FLAGGED_SERIOUS_REPORT',
            entityType: 'Property',
            entityId: propertyId,
            details: { reportId: report.id, reportType: type, openReports },
          },
        }),
      ]);
    }

    const response = NextResponse.json({
      reportId: report.id,
      message: needsReview ? 'Report submitted. This listing has been flagged for review.' : 'Report submitted successfully.',
      flaggedForReview: needsReview,
    }, { status: 201 });

    if (reporter.isNew) {
      response.cookies.set('nf_reporter_id', reporter.reporterId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ message: 'You have already reported this listing.' }, { status: 409 });
    console.error('API_ROUTE_ERROR: [POST /api/property-reports]', error);
    return NextResponse.json({ message: 'Unable to submit report.' }, { status: 500 });
  }
}
