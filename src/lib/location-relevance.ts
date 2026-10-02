import type { PrismaClient } from '@prisma/client';

export type LocationContext = {
  query: string;
  center?: { lat: number; lng: number; label: string };
  locationNodeId?: string;
  canonicalCountyId?: string;
  canonicalCounty?: string;
  canonicalPlace?: string;
  exactPlaceTerms: string[];
  countyTerms: string[];
  neighboringCountyTerms: string[];
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function containsTerm(text: string, term: string) {
  return normalize(text).includes(normalize(term));
}

export async function resolveLocationContext(rawQuery: string, prisma: PrismaClient): Promise<LocationContext | null> {
  const query = rawQuery.trim();
  if (!query) return null;

  const normalized = normalize(query);
  const node = await prisma.locationNode.findFirst({
    where: {
      searchable: true,
      OR: [
        { name: { equals: query, mode: "insensitive" } },
        { slug: normalized.replace(/ /g, "-") },
        { aliases: { some: { normalized } } },
      ],
    },
    include: {
      county: { select: { id: true, name: true } },
    },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });

  const county = node?.county;
  const neighboring = county
    ? await prisma.countyNeighbor.findMany({
        where: { countyId: county.id },
        include: { neighbor: { select: { name: true } } },
        orderBy: { neighbor: { name: "asc" } },
      })
    : [];

  const exactPlaceTerms = [query];
  const countyTerms = county ? [county.name, query] : [query];

  return {
    query,
    center: node?.latitude != null && node?.longitude != null
      ? { lat: node.latitude, lng: node.longitude, label: node.name }
      : undefined,
    locationNodeId: node?.id,
    canonicalCountyId: county?.id,
    canonicalCounty: county?.name,
    canonicalPlace: node?.name,
    exactPlaceTerms,
    countyTerms,
    neighboringCountyTerms: neighboring.map((item) => item.neighbor.name),
  };
}

export function locationRelevanceScore(location: string, context: LocationContext | null) {
  if (!context) return 0;
  const text = normalize(location);
  const query = normalize(context.query);
  let score = 0;

  if (text === query) score += 1000;
  if (text.includes(query)) score += 500;
  for (const term of context.exactPlaceTerms) if (containsTerm(location, term)) score += 900;
  if (context.canonicalCounty && containsTerm(location, context.canonicalCounty)) score += 650;
  for (const county of context.neighboringCountyTerms) if (containsTerm(location, county)) score += 300;

  return score;
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
