import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';
import { scrapeStructuredListing } from '@/lib/imports/scraper';
import { importListing } from '@/lib/imports/importer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const scanId = typeof body.scanId === 'string' ? body.scanId : '';
    if (!scanId) return NextResponse.json({ message: 'Scan ID is required.' }, { status: 400 });

    const scan = await prisma.importScan.findUnique({ where: { id: scanId }, include: { source: true } });
    if (!scan) return NextResponse.json({ message: 'Scan not found.' }, { status: 404 });
    if (['COMPLETED', 'CANCELLED'].includes(scan.status)) return NextResponse.json({ done: true, scan });

    const candidate = await prisma.importScanItem.findFirst({
      where: { scanId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    if (!candidate) {
      const remaining = await prisma.importScanItem.count({ where: { scanId, status: { in: ['PENDING', 'PROCESSING'] } } });
      if (remaining === 0) {
        const final = await prisma.importScan.update({
          where: { id: scanId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        await prisma.importSource.update({ where: { id: scan.sourceId }, data: { lastRunAt: new Date(), lastSuccessAt: new Date(), lastError: null } });
        return NextResponse.json({ done: true, scan: final });
      }
      return NextResponse.json({ done: false, busy: true, scan });
    }

    const claimed = await prisma.importScanItem.updateMany({
      where: { id: candidate.id, status: 'PENDING' },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });
    if (!claimed.count) return NextResponse.json({ done: false, busy: true });

    try {
      if (!process.env.GOOGLE_GENAI_API_KEY) throw new Error('GOOGLE_GENAI_API_KEY is not configured.');
      const listing = await scrapeStructuredListing(candidate.url);
      const result = await importListing(scan.sourceId, listing, scan.source.redisplayAllowed);
      await prisma.importScanItem.update({
        where: { id: candidate.id },
        data: { status: 'COMPLETED', externalListingId: listing.externalId, error: null },
      });
      await prisma.importScan.update({
        where: { id: scanId },
        data: {
          processed: { increment: 1 },
          queued: result.queued ? { increment: 1 } : undefined,
          possibleDuplicates: result.possibleDuplicate ? { increment: 1 } : undefined,
          rejected: result.status === 'REJECTED' ? { increment: 1 } : undefined,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown listing processing error.';
      await prisma.importScanItem.update({ where: { id: candidate.id }, data: { status: 'FAILED', error: message } });
      await prisma.importScan.update({ where: { id: scanId }, data: { processed: { increment: 1 }, failed: { increment: 1 }, lastError: message.slice(0, 1000) } });
    }

    const updated = await prisma.importScan.findUnique({
      where: { id: scanId },
      select: { id: true, status: true, discovered: true, processed: true, queued: true, possibleDuplicates: true, rejected: true, failed: true },
    });
    return NextResponse.json({ done: false, processedOne: true, scan: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('AI_IMPORTER_WORKER', error);
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Scan worker failed.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const scanId = typeof body.scanId === 'string' ? body.scanId : '';
    const action = body.action;
    if (!scanId || !['retry-failed', 'cancel'].includes(action)) return NextResponse.json({ message: 'Invalid scan action.' }, { status: 400 });
    const scan = await prisma.importScan.findUnique({ where: { id: scanId } });
    if (!scan) return NextResponse.json({ message: 'Scan not found.' }, { status: 404 });
    if (action === 'cancel') {
      const updated = await prisma.importScan.update({ where: { id: scanId }, data: { status: 'CANCELLED', completedAt: new Date() } });
      await prisma.importScanItem.updateMany({ where: { scanId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
      return NextResponse.json({ scan: updated });
    }
    const retried = await prisma.importScanItem.updateMany({ where: { scanId, status: 'FAILED' }, data: { status: 'PENDING', error: null } });
    await prisma.importScan.update({ where: { id: scanId }, data: { status: 'PROCESSING', completedAt: null, failed: { decrement: retried.count } } });
    return NextResponse.json({ retried: retried.count });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('AI_IMPORTER_WORKER_ACTION', error);
    return NextResponse.json({ message: 'Unable to update scan.' }, { status: 500 });
  }
}
