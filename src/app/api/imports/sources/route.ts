import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function authorized(request: NextRequest) {
  const secret = process.env.IMPORT_CRON_SECRET || process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('x-import-secret') === secret);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const sources = await prisma.importSource.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, baseUrl: true, listingUrl: true,
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

  if (!name || !baseUrl || !listingUrl) {
    return NextResponse.json({ message: 'name, baseUrl and listingUrl are required' }, { status: 400 });
  }

  const source = await prisma.importSource.upsert({
    where: { name },
    update: {
      baseUrl,
      listingUrl,
      enabled: body.enabled === true,
      accessApproved: body.accessApproved === true,
      accessMethod: typeof body.accessMethod === 'string' ? body.accessMethod : 'MANUAL',
      redisplayAllowed: body.redisplayAllowed === true,
    },
    create: {
      name,
      baseUrl,
      listingUrl,
      enabled: body.enabled === true,
      accessApproved: body.accessApproved === true,
      accessMethod: typeof body.accessMethod === 'string' ? body.accessMethod : 'MANUAL',
      redisplayAllowed: body.redisplayAllowed === true,
    },
  });

  return NextResponse.json(source, { status: 201 });
}
