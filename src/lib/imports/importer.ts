import { prisma } from '@/lib/prisma';
import { discoverListingUrls, scrapeStructuredListing } from './scraper';
import { isLikelyDuplicateProperty } from './duplicates';
import type { ImportedListing } from './types';

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

async function resolveLocation(location?: string) {
  if (!location) return null;
  const value = location.trim();
  if (!value) return null;
  const normalized = normalize(value);
  return prisma.locationNode.findFirst({
    where: {
      searchable: true,
      OR: [
        { name: { contains: value, mode: 'insensitive' } },
        { slug: { contains: normalized.replace(/ /g, '-'), mode: 'insensitive' } },
        { aliases: { some: { alias: { contains: value, mode: 'insensitive' } } } },
      ],
    },
    orderBy: [{ searchPriority: 'desc' }, { level: 'asc' }],
  });
}

async function findExistingProperty(listing: ImportedListing) {
  const title = normalize(listing.title);
  if (!title) return null;
  const candidates = await prisma.property.findMany({
    where: {
      status: { in: ['ACTIVE', 'EXPIRED', 'SUSPENDED'] },
      ...(listing.price != null ? { price: { gte: listing.price * 0.95, lte: listing.price * 1.05 } } : {}),
      ...(listing.bedrooms != null ? { bedrooms: listing.bedrooms } : {}),
    },
    select: { id: true, title: true, location: true },
    take: 100,
  });
  return candidates.find((candidate) => isLikelyDuplicateProperty(candidate, listing)) ?? null;
}

export async function importListing(sourceId: string, listing: ImportedListing, redisplayAllowed: boolean) {
  const existingExternal = await prisma.externalListing.findUnique({
    where: { sourceId_externalId: { sourceId, externalId: listing.externalId } },
  });

  const title = listing.title.trim();
  if (!title) throw new Error('A property title is required.');
  const manualPreliminary = (listing.rawData as any)?.quickImport?.acquisitionMethod === 'USER_SUPPLIED_CONTENT';
  if (listing.sourceUrl && !/^https:\/\//i.test(listing.sourceUrl)) throw new Error('A secure HTTPS source URL is required.');
  if (!listing.sourceUrl && !manualPreliminary) throw new Error('A secure HTTPS source URL is required.');

  const locationNode = await resolveLocation(listing.location);
  const linkedPropertyId = existingExternal?.propertyId ?? null;
  const possibleDuplicate = linkedPropertyId ? null : await findExistingProperty(listing);
  const status = existingExternal?.status === 'REJECTED' ? 'REJECTED'
    : existingExternal?.status === 'IMPORTED' && linkedPropertyId ? 'IMPORTED'
    : possibleDuplicate ? 'POSSIBLE_DUPLICATE' : 'PENDING_REVIEW';

  const data = {
    sourceUrl: listing.sourceUrl,
    title,
    description: listing.description ?? '',
    price: listing.price,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    sizeSqm: listing.sizeSqm,
    propertyType: listing.propertyType || 'House',
    location: listing.location || locationNode?.name || '',
    amenities: listing.amenities ?? [],
    imageUrls: redisplayAllowed ? (listing.imageUrls ?? []) : [],
    latitude: listing.latitude,
    longitude: listing.longitude,
    rawData: {
      ...(listing.rawData && typeof listing.rawData === 'object' ? listing.rawData as Record<string, unknown> : {}),
      importer: 'AI_ASSISTED',
      possibleDuplicatePropertyId: possibleDuplicate?.id ?? null,
      currency: (listing.rawData as any)?.currency ?? null,
      listingType: (listing.rawData as any)?.quickImport?.listingType ?? 'FOR_SALE',
    } as any,
    status,
    lastSeenAt: new Date(),
    propertyId: linkedPropertyId,
  };

  await prisma.externalListing.upsert({
    where: { sourceId_externalId: { sourceId, externalId: listing.externalId } },
    update: data,
    create: {
      sourceId,
      externalId: listing.externalId,
      ...data,
    },
  });

  return { queued: status === 'PENDING_REVIEW', possibleDuplicate: status === 'POSSIBLE_DUPLICATE', status };
}

export async function runAuthorizedSourceImport(sourceName: string) {
  if (!process.env.GOOGLE_GENAI_API_KEY) throw new Error('AI extraction is not configured. Add GOOGLE_GENAI_API_KEY to the production environment before scanning sources.');
  const source = await prisma.importSource.findUnique({ where: { name: sourceName } });
  if (!source) throw new Error('Import source "' + sourceName + '" is not configured.');
  if (!source.enabled || !source.accessApproved) {
    throw new Error('Import source "' + sourceName + '" is disabled or not approved for automated access.');
  }

  const maxListings = Math.max(1, Math.min(source.maxPages * 100, 500));
  const urls = await discoverListingUrls(source.listingUrl || source.baseUrl, {
    maxListings,
    maxPages: source.maxPages,
    paginationParam: source.paginationParam || 'page',
    listingPatterns: source.listingPatterns,
  });

  let queued = 0;
  let possibleDuplicates = 0;
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const listing = await scrapeStructuredListing(url);
      const result = await importListing(source.id, listing, source.redisplayAllowed);
      if (result.queued) queued += 1;
      if (result.possibleDuplicate) possibleDuplicates += 1;
    } catch (error) {
      errors.push(url + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    if (source.requestDelayMs > 0) await sleep(source.requestDelayMs);
  }

  const runCompletedAt = new Date();

  // A listing that has not been seen for 48 hours is no longer treated as active.
  // We retain the record for audit/history and can reactivate it automatically
  // when the source publishes it again.
  const staleBefore = new Date(runCompletedAt.getTime() - 48 * 60 * 60 * 1000);
  if (urls.length > 0) {
    await prisma.externalListing.updateMany({
      where: {
        sourceId: source.id,
        status: 'ACTIVE',
        lastSeenAt: { lt: staleBefore },
      },
      data: { status: 'STALE' },
    });
  }

  await prisma.importSource.update({
    where: { id: source.id },
    data: {
      lastRunAt: runCompletedAt,
      lastSuccessAt: errors.length === urls.length && urls.length > 0 ? source.lastSuccessAt : runCompletedAt,
      lastError: errors.length ? errors.slice(0, 10).join('\n') : null,
    },
  });

  return {
    source: source.name,
    discovered: urls.length,
    queued,
    possibleDuplicates,
    errors,
  };
}
