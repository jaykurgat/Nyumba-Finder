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
    normalizeLocationSlug(node.name) === normalizeLocationSlug(target.name) || node.slug === target.slug
  ).sort((a, b) => {
    const rank = (level: string) => level === "CITY" ? 5 : level === "TOWN" ? 4 : level === "ESTATE" ? 3 : level === "NEIGHBORHOOD" ? 2 : 1;
    return rank(b.level) - rank(a.level);
  });
  const nodeIds = new Set<string>(matchingNodes.slice(0, 1).map((node) => node.id));
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
  const isCityPage = ["nairobi", "nakuru", "mombasa", "kisumu", "eldoret"].includes(target.slug);
  const conditions = [
    ...(nodeIds.size ? [{ locationNodeId: { in: [...nodeIds] } }] : []),
    { location: { contains: target.name, mode: "insensitive" as const } },
    ...(target.slug === "rongai" ? [{ location: { contains: "Ongata Rongai", mode: "insensitive" as const } }] : []),
  ];
  const properties = await prisma.property.findMany({
    where: { status: "ACTIVE", OR: isCityPage ? [{ countyId: county.id }, { location: { contains: target.name, mode: "insensitive" } }] : conditions },
    select: { id: true, title: true, location: true, price: true, pricePeriod: true, listingType: true, propertyType: true, bedrooms: true, bathrooms: true, images: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });
  return { target, county, properties, indexable: properties.length >= 2, canonical: `${SITE_URL}/locations/${target.slug}` };
}

export async function getLocationSeoSitemapEntries() {
  const [counties, nodes, properties] = await Promise.all([
    prisma.county.findMany({ select: { id: true, name: true } }),
    prisma.locationNode.findMany({ where: { searchable: true }, select: { id: true, countyId: true, name: true, parentId: true } }),
    prisma.property.findMany({ where: { status: "ACTIVE" }, select: { location: true, locationNodeId: true, countyId: true } }),
  ]);
  const countyByName = new Map(counties.map((county) => [normalizeLocationSlug(county.name), county.id]));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const descendantIds = new Map<string, Set<string>>();
  for (const target of LOCATION_SEO_TARGETS) {
    const countyId = countyByName.get(normalizeLocationSlug(target.county));
    const ids = new Set(nodes.filter((node) => node.countyId === countyId && normalizeLocationSlug(node.name) === normalizeLocationSlug(target.name)).map((node) => node.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of nodes) if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) { ids.add(node.id); changed = true; }
    }
    descendantIds.set(target.slug, ids);
  }

  const counts = new Map(LOCATION_SEO_TARGETS.map((target) => [target.slug, 0]));
  for (const property of properties) {
    const ancestorKeys = new Set<string>();
    let node = property.locationNodeId ? nodeById.get(property.locationNodeId) : undefined;
    while (node) {
      ancestorKeys.add(`${node.countyId}|${normalizeLocationSlug(node.name)}`);
      node = node.parentId ? nodeById.get(node.parentId) : undefined;
    }
    const locationText = normalizeLocationSlug(property.location);
    for (const target of LOCATION_SEO_TARGETS) {
      const countyId = countyByName.get(normalizeLocationSlug(target.county));
      const isCityPage = ["nairobi", "nakuru", "mombasa", "kisumu", "eldoret"].includes(target.slug);
      const match = (isCityPage && property.countyId === countyId) ||
        locationText.includes(normalizeLocationSlug(target.name)) ||
        (target.slug === "rongai" && locationText.includes("ongata-rongai")) ||
        (property.locationNodeId ? descendantIds.get(target.slug)?.has(property.locationNodeId) : false) ||
        Boolean(countyId && ancestorKeys.has(`${countyId}|${normalizeLocationSlug(target.name)}`));
      if (match) counts.set(target.slug, (counts.get(target.slug) ?? 0) + 1);
    }
  }
  return LOCATION_SEO_TARGETS.filter((target) => (counts.get(target.slug) ?? 0) >= 2).map((target) => ({
    url: `${SITE_URL}/locations/${target.slug}`,
    changeFrequency: "daily" as const,
    priority: target.kind === "city" ? 0.78 : target.kind === "county" ? 0.74 : 0.65,
  }));
}
