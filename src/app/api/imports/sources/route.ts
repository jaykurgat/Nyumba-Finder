import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function authorized(request: NextRequest) {
  const secret = process.env.IMPORT_CRON_SECRET || process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('x-import-secret') === secret);
}

const boundedInt = (value: unknown, fallback: number, min: number, max: number) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.trunc(number))) : fallback;
};

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
    : [];

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const sources = await prisma.importSource.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, baseUrl: true, listingUrl: true,
      listingPatterns: true, paginationParam: true, maxPages: true, requestDelayMs: true,
      enabled: true, accessApproved: true, accessMethod: true,
      redisplayAllowed: true, lastRunAt: true, lastSuccessAt: true, lastError: true,
    },
  });
  return NextResponse.json(sources);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : '';
  const listingUrl = typeof body.listingUrl === 'string' ? body.listingUrl.trim() : '';
  const listingPatterns = stringArray(body.listingPatterns);
  const paginationParam = typeof body.paginationParam === 'string' && body.paginationParam.trim()
    ? body.paginationParam.trim()
    : 'page';
  const maxPages = boundedInt(body.maxPages, 1, 1, 50);
  const requestDelayMs = boundedInt(body.requestDelayMs, 750, 250, 10000);

  if (!name || !baseUrl || !listingUrl) {
    return NextResponse.json({ message: 'name, baseUrl and listingUrl are required' }, { status: 400 });
  }

  const sourceData = {
    baseUrl,
    listingUrl,
    listingPatterns,
    paginationParam,
    maxPages,
    requestDelayMs,
    enabled: body.enabled === true,
    accessApproved: body.accessApproved === true,
    accessMethod: typeof body.accessMethod === 'string' ? body.accessMethod : 'MANUAL',
    redisplayAllowed: body.redisplayAllowed === true,
  };

  const source = await prisma.importSource.upsert({
    where: { name },
    update: sourceData,
    create: { name, ...sourceData },
  });

  return NextResponse.json(source, { status: 201 });
}
