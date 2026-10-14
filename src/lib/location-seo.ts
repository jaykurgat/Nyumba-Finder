import { prisma } from "@/lib/prisma";
import { getLocationSeoTarget, LOCATION_SEO_TARGETS, normalizeLocationSlug } from "@/data/location-seo";

const SITE_URL = "https://www.nyumba-finder.com";

export async function getLocationSeoData(slug: string) {
  const target = getLocationSeoTarget(slug);
  if (!target) return null;

  const county = await prisma.county.findFirst({
    where: { name: { equals: target.county, mode: "insensitive" } },
    select: { id: true, name: true, slug: true },
  });
  if (!county) return { target, county: null, properties: [], indexable: false, canonical: `${SITE_URL}/locations/${target.slug}` };

  const nodes = await prisma.locationNode.findMany({
    where: { countyId: county.id, searchable: true },
    select: { id: true, name: true, slug: true, level: true, parentId: true },
  });

  const matchingNodes = nodes.filter((node) =>
    normalizeLocationSlug(node.name) === normalizeLocationSlug(target.name) ||
    node.slug === target.slug
  ).sort((a, b) => {
    const rank = (level: string) => level === "CITY" ? 5 : level === "TOWN" ? 4 : level === "ESTATE" ? 3 : level === "NEIGHBORHOOD" ? 2 : 1;
    return rank(b.level) - rank(a.level);
  });
  const rootIds = new Set(matchingNodes.slice(0, 1).map((node) => node.id));
  const nodeIds = new Set(rootIds);
  let added = true;
  while (added) {
    added = false;
    for (const node of nodes) {
      if (node.parentId && nodeIds.has(node.parentId) && !nodeIds.has(node.id)) {
        nodeIds.add(node.id);
        added = true;
      }
    }
  }

  const propertyWhere = target.kind === "county" || target.slug === "nairobi" || target.slug === "nakuru" || target.slug === "mombasa" || target.slug === "kisumu" || target.slug === "eldoret"
    ? { status: "ACTIVE" as const, OR: [{ countyId: county.id }, { location: { contains: target.name, mode: "insensitive" as const } }] }
    : {
        status: "ACTIVE" as const,
        OR: [
          ...(nodeIds.size ? [{ locationNodeId: { in: [...nodeIds] } }] : []),
          { location: { contains: target.name, mode: "insensitive" as const } },
          ...(target.name === "Rongai" ? [{ location: { contains: "Ongata Rongai", mode: "insensitive" as const } }] : []),
        ],
      };

  const properties = await prisma.property.findMany({
    where: propertyWhere,
    select: {
      id: true, title: true, location: true, price: true, pricePeriod: true,
      listingType: true, propertyType: true, bedrooms: true, bathrooms: true,
      images: true, updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });

  return {
    target,
    county,
    properties,
    indexable: properties.length >= 2,
    canonical: `${SITE_URL}/locations/${target.slug}`,
  };
}

export async function getLocationSeoSitemapEntries() {
  const nodes = await prisma.locationNode.findMany({
    where: { searchable: true },
    select: { id: true, countyId: true, name: true, parentId: true },
  });
  const properties = await prisma.property.findMany({
    where: { status: "ACTIVE" },
    select: { location: true, locationNodeId: true, countyId: true },
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const counts = new Map<string, number>();

  for (const target of LOCATION_SEO_TARGETS) {
    const targetNodeIds = new Set(
      nodes.filter((node) =>
        node.countyId === properties.find((p) => p.countyId === node.countyId)?.countyId &&
        normalizeLocationSlug(node.name) === normalizeLocationSlug(target.name)
      ).map((node) => node.id)
    );
    const descendantIds = new Set(targetNodeIds);
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of nodes) {
        if (node.parentId && descendantIds.has(node.parentId) && !descendantIds.has(node.id)) {
          descendantIds.add(node.id);
          changed = true;
        }
      }
    }
    const count = properties.filter((property) => {
      if (target.slug === "nairobi" || target.slug === "nakuru" || target.slug === "mombasa" || target.slug === "kisumu" || target.slug === "eldoret") {
        return property.location.toLowerCase().includes(target.name.toLowerCase()) ||
          (property.countyId && nodes.some((node) => node.countyId === property.countyId && node.name.toLowerCase() === target.name.toLowerCase()));
      }
      if (property.location.toLowerCase().includes(target.name.toLowerCase())) return true;
      let current = property.locationNodeId ? nodeById.get(property.locationNodeId) : undefined;
      while (current) {
        if (descendantIds.has(current.id)) return true;
        current = current.parentId ? nodeById.get(current.parentId) : undefined;
      }
      return false;
    }).length;
    counts.set(target.slug, count);
  }

  return LOCATION_SEO_TARGETS
    .filter((target) => (counts.get(target.slug) ?? 0) >= 2)
    .map((target) => ({
      url: `${SITE_URL}/locations/${target.slug}`,
      changeFrequency: "daily" as const,
      priority: target.kind === "city" ? 0.78 : target.kind === "county" ? 0.74 : 0.65,
    }));
}
