import { prisma } from '@/lib/prisma';
import { scrapeStructuredListing, discoverListingUrls } from './scraper';
import type { ImportedListing } from './types';

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

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
      ...(listing.price != null ? { price: listing.price } : {}),
      ...(listing.bedrooms != null ? { bedrooms: listing.bedrooms } : {}),
    },
    select: { id: true, title: true, location: true },
    take: 50,
  });
  const location = normalize(listing.location ?? '');
  return candidates.find((candidate) => {
    const sameTitle = normalize(candidate.title) === title;
    const candidateLocation = normalize(candidate.location);
    return sameTitle && (!location || candidateLocation.includes(location) || location.includes(candidateLocation));
  }) ?? null;
}

export async function importListing(sourceId: string, listing: ImportedListing, redisplayAllowed: boolean) {
  const existingExternal = await prisma.externalListing.findUnique({
    where: { sourceId_externalId: { sourceId, externalId: listing.externalId } },
  });

  const locationNode = await resolveLocation(listing.location);
  const existingProperty = existingExternal?.propertyId
    ? { id: existingExternal.propertyId }
    : await findExistingProperty(listing);

  const propertyData = {
    title: listing.title,
    description: listing.description ?? '',
    location: listing.location || locationNode?.name || 'Kenya',
    price: listing.price ?? 0,
    bedrooms: Math.max(0, Math.trunc(listing.bedrooms ?? 0)),
    bathrooms: Math.max(1, Math.trunc(listing.bathrooms ?? 1)),
    sizeSqm: listing.sizeSqm ?? null,
    amenities: listing.amenities ?? [],
    images: redisplayAllowed ? (listing.imageUrls ?? []) : [],
    phoneNumber: null,
    propertyType: listing.propertyType || 'Apartment',
    status: 'ACTIVE' as const,
    countyId: locationNode?.countyId ?? null,
    locationNodeId: locationNode?.id ?? null,
    latitude: listing.latitude ?? locationNode?.latitude ?? null,
    longitude: listing.longitude ?? locationNode?.longitude ?? null,
    locationSource: 'EXTERNAL_IMPORT',
    locationAccuracy: listing.latitude != null && listing.longitude != null ? 'SOURCE_PROPERTY_PIN' : 'SOURCE_LOCATION',
  };

  const property = existingProperty
    ? await prisma.property.update({ where: { id: existingProperty.id }, data: propertyData })
    : await prisma.property.create({ data: propertyData });

  await prisma.externalListing.upsert({
    where: { sourceId_externalId: { sourceId, externalId: listing.externalId } },
    update: {
      sourceUrl: listing.sourceUrl,
      title: listing.title,
      description: listing.description ?? '',
      price: listing.price,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      sizeSqm: listing.sizeSqm,
      propertyType: listing.propertyType,
      location: listing.location,
      amenities: listing.amenities ?? [],
      imageUrls: listing.imageUrls ?? [],
      latitude: listing.latitude,
      longitude: listing.longitude,
      rawData: listing.rawData as any,
      status: 'ACTIVE',
      lastSeenAt: new Date(),
      importedAt: new Date(),
      propertyId: property.id,
    },
    create: {
      sourceId,
      externalId: listing.externalId,
      sourceUrl: listing.sourceUrl,
      title: listing.title,
      description: listing.description ?? '',
      price: listing.price,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      sizeSqm: listing.sizeSqm,
      propertyType: listing.propertyType,
      location: listing.location,
      amenities: listing.amenities ?? [],
      imageUrls: listing.imageUrls ?? [],
      latitude: listing.latitude,
      longitude: listing.longitude,
      rawData: listing.rawData as any,
      status: 'ACTIVE',
      importedAt: new Date(),
      propertyId: property.id,
    },
  });

  return { propertyId: property.id, deduplicated: Boolean(existingProperty) };
}

export async function runAuthorizedSourceImport(sourceName: string) {
  const source = await prisma.importSource.findUnique({ where: { name: sourceName } });
  if (!source) throw new Error(`Import source "${sourceName}" is not configured.`);
  if (!source.enabled || !source.accessApproved) {
    throw new Error(`Import source "${sourceName}" is disabled or not approved for automated access.`);
  }

  const urls = await discoverListingUrls(source.listingUrl || source.baseUrl, 25);
  let imported = 0;
  let deduplicated = 0;
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const listing = await scrapeStructuredListing(url);
      const result = await importListing(source.id, listing, source.redisplayAllowed);
      imported += 1;
      if (result.deduplicated) deduplicated += 1;
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  await prisma.importSource.update({
    where: { id: source.id },
    data: {
      lastRunAt: new Date(),
      lastSuccessAt: errors.length === urls.length && urls.length > 0 ? source.lastSuccessAt : new Date(),
      lastError: errors.length ? errors.slice(0, 10).join('\n') : null,
    },
  });

  return { source: source.name, discovered: urls.length, imported, deduplicated, errors };
}
