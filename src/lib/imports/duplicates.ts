const normalizeComparableText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const tokenSet = (value: string) => new Set(normalizeComparableText(value).split(/\s+/).filter(Boolean));

function overlapRatio(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return (2 * shared) / (left.size + right.size);
}

export function isLikelyDuplicateProperty(
  existing: { title: string; location: string; price?: number | null; bedrooms?: number | null },
  incoming: { title: string; location?: string | null; price?: number | null; bedrooms?: number | null },
) {
  const titleSimilarity = overlapRatio(tokenSet(existing.title), tokenSet(incoming.title));
  if (titleSimilarity < 0.75) return false;

  const existingLocation = tokenSet(existing.location);
  const incomingLocation = tokenSet(incoming.location ?? '');
  if (existingLocation.size && incomingLocation.size && overlapRatio(existingLocation, incomingLocation) < 0.5) return false;

  if (existing.bedrooms != null && incoming.bedrooms != null && existing.bedrooms !== incoming.bedrooms) return false;
  if (existing.price != null && incoming.price != null) {
    const tolerance = Math.max(50_000, Math.max(existing.price, incoming.price) * 0.05);
    if (Math.abs(existing.price - incoming.price) > tolerance) return false;
  }
  return true;
}
