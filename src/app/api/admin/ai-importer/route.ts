import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const clean = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const int = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.trunc(parsed))) : fallback;
};

export async function GET() {
  try {
    await requireAdmin();
    const [sources, listings, scans] = await Promise.all([
      prisma.importSource.findMany({ orderBy: { name: 'asc' } }),
      prisma.externalListing.findMany({
        where: { status: { in: ['PENDING_REVIEW', 'POSSIBLE_DUPLICATE'] } },
        include: { source: { select: { name: true, baseUrl: true, redisplayAllowed: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      prisma.importScan.findMany({ include: { source: { select: { name: true } }, items: { select: { id: true, url: true, status: true, attempts: true, error: true, updatedAt: true }, orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    return NextResponse.json({ sources, listings, scans });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('AI_IMPORTER_GET', error);
    return NextResponse.json({ message: 'Unable to load the AI importer.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const action = clean(body.action);

    if (action === 'save-source') {
      const name = clean(body.name);
      const baseUrl = clean(body.baseUrl);
      const listingUrl = clean(body.listingUrl);
      if (!name || !baseUrl || !listingUrl) return NextResponse.json({ message: 'Source name, website URL and listing/search URL are required.' }, { status: 400 });
      let base: URL; let listing: URL;
      try { base = new URL(baseUrl); listing = new URL(listingUrl); } catch { return NextResponse.json({ message: 'Enter valid source URLs.' }, { status: 400 }); }
      if (base.protocol !== 'https:' || listing.protocol !== 'https:' || base.hostname !== listing.hostname) return NextResponse.json({ message: 'Use HTTPS URLs from the same website.' }, { status: 400 });
      const source = await prisma.importSource.upsert({
        where: { name },
        update: {
          baseUrl: base.origin, listingUrl: listing.toString(),
          listingPatterns: Array.isArray(body.listingPatterns) ? body.listingPatterns.filter((v: unknown) => typeof v === 'string').slice(0, 20) : [],
          maxPages: int(body.maxPages, 1, 1, 5),
          requestDelayMs: int(body.requestDelayMs, 1500, 1000, 10000),
          enabled: body.enabled === true,
          accessApproved: body.accessApproved === true,
          accessMethod: clean(body.accessMethod) || 'AUTHORIZED_WEB',
          redisplayAllowed: body.redisplayAllowed === true,
        },
        create: {
          name, baseUrl: base.origin, listingUrl: listing.toString(),
          listingPatterns: Array.isArray(body.listingPatterns) ? body.listingPatterns.filter((v: unknown) => typeof v === 'string').slice(0, 20) : [],
          maxPages: int(body.maxPages, 1, 1, 5),
          requestDelayMs: int(body.requestDelayMs, 1500, 1000, 10000),
          enabled: body.enabled === true,
          accessApproved: body.accessApproved === true,
          accessMethod: clean(body.accessMethod) || 'AUTHORIZED_WEB',
          redisplayAllowed: body.redisplayAllowed === true,
        },
      });
      return NextResponse.json({ source });
    }

    if (action === 'start-scan') {
      if (!process.env.GOOGLE_GENAI_API_KEY) return NextResponse.json({ message: 'AI extraction is not configured. Add GOOGLE_GENAI_API_KEY to Vercel and redeploy.' }, { status: 503 });
      const name = clean(body.name);
      if (!name) return NextResponse.json({ message: 'Select a source to scan.' }, { status: 400 });
      const source = await prisma.importSource.findUnique({ where: { name } });
      if (!source) return NextResponse.json({ message: 'Import source not found.' }, { status: 404 });
      if (!source.enabled || !source.accessApproved) return NextResponse.json({ message: 'This source is disabled or not approved for automated access.' }, { status: 403 });
      if (!source.listingPatterns.length) return NextResponse.json({ message: 'Add at least one listing URL pattern before scanning. This prevents navigation and unrelated pages from entering the import queue.' }, { status: 422 });
      const { discoverListingUrls } = await import('@/lib/imports/scraper');
      const urls = await discoverListingUrls(source.listingUrl || source.baseUrl, {
        maxListings: Math.max(1, Math.min(source.maxPages * 100, 500)),
        maxPages: source.maxPages,
        paginationParam: source.paginationParam || 'page',
        listingPatterns: source.listingPatterns,
      });
      if (!urls.length) return NextResponse.json({ message: 'No candidate listing URLs were discovered. Check the listings page and URL patterns.' }, { status: 422 });
      const scan = await prisma.importScan.create({
        data: {
          sourceId: source.id,
          status: 'PROCESSING',
          discovered: urls.length,
          items: { create: urls.map(url => ({ url })) },
        },
      });
      await prisma.importSource.update({ where: { id: source.id }, data: { lastRunAt: new Date(), lastError: null } });
      return NextResponse.json({ scan }, { status: 202 });
    }

    if (action === 'run-source') {
      return NextResponse.json({ message: 'The synchronous scan has been replaced. Start a resumable scan instead.' }, { status: 410 });
    }

    return NextResponse.json({ message: 'Unsupported importer action.' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('AI_IMPORTER_POST', error);
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Importer action failed.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const id = clean(body.id);
    const action = clean(body.action);

    if (action === 'update-source') {
      if (!id) return NextResponse.json({ message: 'Source ID is required.' }, { status: 400 });
      const name = clean(body.name);
      const baseUrl = clean(body.baseUrl);
      const listingUrl = clean(body.listingUrl);
      if (!name || !baseUrl || !listingUrl) return NextResponse.json({ message: 'Source name, website URL and listing/search URL are required.' }, { status: 400 });
      let base: URL; let listing: URL;
      try { base = new URL(baseUrl); listing = new URL(listingUrl); } catch { return NextResponse.json({ message: 'Enter valid source URLs.' }, { status: 400 }); }
      if (base.protocol !== 'https:' || listing.protocol !== 'https:' || base.hostname !== listing.hostname) return NextResponse.json({ message: 'Use HTTPS URLs from the same website.' }, { status: 400 });
      const existing = await prisma.importSource.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ message: 'Source not found.' }, { status: 404 });
      const duplicate = await prisma.importSource.findFirst({ where: { name, NOT: { id } } });
      if (duplicate) return NextResponse.json({ message: 'Another source already uses that name.' }, { status: 409 });
      const source = await prisma.importSource.update({
        where: { id },
        data: {
          name, baseUrl: base.origin, listingUrl: listing.toString(),
          listingPatterns: Array.isArray(body.listingPatterns) ? body.listingPatterns.filter((v: unknown) => typeof v === 'string').slice(0, 20) : [],
          maxPages: int(body.maxPages, 1, 1, 5),
          requestDelayMs: int(body.requestDelayMs, 1500, 1000, 10000),
          enabled: body.enabled === true,
          accessApproved: body.accessApproved === true,
          accessMethod: clean(body.accessMethod) || 'AUTHORIZED_WEB',
          redisplayAllowed: body.redisplayAllowed === true,
        },
      });
      return NextResponse.json({ source });
    }

    if (!id || !['approve', 'reject'].includes(action)) return NextResponse.json({ message: 'Invalid review action.' }, { status: 400 });

    const external = await prisma.externalListing.findUnique({
      where: { id },
      include: { source: true },
    });
    if (!external) return NextResponse.json({ message: 'Imported listing not found.' }, { status: 404 });
    if (action === 'reject') {
      await prisma.externalListing.update({ where: { id }, data: { status: 'REJECTED' } });
      return NextResponse.json({ message: 'Imported listing rejected.' });
    }
    if (external.status === 'POSSIBLE_DUPLICATE') return NextResponse.json({ message: 'Review the possible duplicate against the existing property before importing it.' }, { status: 409 });
    if (!external.price || external.price <= 0) return NextResponse.json({ message: 'A valid asking price is required before approval.' }, { status: 400 });
    if (!external.location?.trim()) return NextResponse.json({ message: 'A verified location is required before approval.' }, { status: 400 });

    const locationText = external.location.trim();
    const locationNode = await prisma.locationNode.findFirst({
      where: { searchable: true, OR: [
        { name: { contains: locationText, mode: 'insensitive' } },
        { aliases: { some: { alias: { contains: locationText, mode: 'insensitive' } } } },
      ] },
      orderBy: [{ searchPriority: 'desc' }, { level: 'asc' }],
    });
    const normalizedType = (external.propertyType || '').toLowerCase();
    const propertyType = /apartment|flat/.test(normalizedType) ? 'Apartment'
      : /villa/.test(normalizedType) ? 'Villa'
      : /maisonette/.test(normalizedType) ? 'Maisonette'
      : /townhouse|town house/.test(normalizedType) ? 'Townhouse'
      : /bungalow/.test(normalizedType) ? 'Bungalow'
      : /bedsitter|studio/.test(normalizedType) ? 'Bedsitter'
      : /single room/.test(normalizedType) ? 'Single Room'
      : 'House';
    const property = await prisma.property.create({
      data: {
        title: external.title,
        description: external.description || '',
        location: locationText,
        price: external.price,
        listingType: 'FOR_SALE',
        pricePeriod: 'ONE_TIME',
        bedrooms: Math.max(0, Math.trunc(external.bedrooms ?? 0)),
        bathrooms: Math.max(1, Math.trunc(external.bathrooms ?? 1)),
        sizeSqm: external.sizeSqm,
        amenities: external.amenities,
        images: external.source.redisplayAllowed ? external.imageUrls : [],
        propertyCategory: 'RESIDENTIAL',
        propertyType,
        status: 'ACTIVE',
        countyId: locationNode?.countyId ?? null,
        locationNodeId: locationNode?.id ?? null,
        latitude: external.latitude ?? locationNode?.latitude ?? null,
        longitude: external.longitude ?? locationNode?.longitude ?? null,
        locationSource: 'EXTERNAL_IMPORT',
        locationAccuracy: external.latitude != null && external.longitude != null ? 'SOURCE_PROPERTY_PIN' : 'SOURCE_LOCATION',
      },
    });
    await prisma.externalListing.update({ where: { id }, data: { status: 'IMPORTED', importedAt: new Date(), propertyId: property.id } });
    await prisma.auditLog.create({ data: { action: 'AI_IMPORTED_PROPERTY_APPROVED', entityType: 'Property', entityId: property.id, details: { externalListingId: id, sourceId: external.sourceId, sourceUrl: external.sourceUrl, aiAssisted: true } } });
    return NextResponse.json({ message: 'Listing approved and published.', propertyId: property.id });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('AI_IMPORTER_REVIEW', error);
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to review imported listing.' }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = clean(new URL(request.url).searchParams.get('id'));
    if (!id) return NextResponse.json({ message: 'Source ID is required.' }, { status: 400 });
    const source = await prisma.importSource.findUnique({ where: { id }, include: { _count: { select: { listings: true } } } });
    if (!source) return NextResponse.json({ message: 'Source not found.' }, { status: 404 });
    if (source._count.listings > 0) {
      return NextResponse.json({ message: 'This source has import history. Disable it instead of deleting it so listing and audit history are preserved.' }, { status: 409 });
    }
    await prisma.importSource.delete({ where: { id } });
    return NextResponse.json({ message: 'Source removed.' });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('AI_IMPORTER_DELETE_SOURCE', error);
    return NextResponse.json({ message: 'Unable to remove source.' }, { status: 500 });
  }
}
