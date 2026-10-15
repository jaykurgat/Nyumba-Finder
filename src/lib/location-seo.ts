import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getLocationSeoTarget, LOCATION_SEO_TARGETS, normalizeLocationSlug, type LocationSeoTarget } from "@/data/location-seo";

const SITE_URL = "https://www.nyumba-finder.com";
type DirectoryNode = { id: string; countyId: string; name: string; slug: string; level: string; parentId: string | null; county: { id: string; name: string; slug: string }; parent: { id: string; name: string; level: string } | null };

function kindForLevel(level: string): LocationSeoTarget["kind"] {
  if (level === "CITY") return "city";
  if (level === "TOWN") return "town";
  if (level === "ESTATE") return "estate";
  return "area";
}

function marketForCounty(county: string): LocationSeoTarget["market"] {
  const value = normalizeLocationSlug(county);
  if (["nairobi-city", "kiambu", "kajiado", "machakos"].includes(value)) return "nairobi-metro";
  if (value === "nakuru") return "nakuru";
  if (value === "mombasa") return "mombasa";
  if (value === "kisumu") return "kisumu";
  if (value === "uasin-gishu") return "eldoret";
  return "other";
}

function targetForNode(node: DirectoryNode): LocationSeoTarget {
  const curated = LOCATION_SEO_TARGETS.find((item) =>
    normalizeLocationSlug(item.name) === normalizeLocationSlug(node.name) &&
    normalizeLocationSlug(item.county) === normalizeLocationSlug(node.county.name)
  );
  const name = node.name;
  const kind = kindForLevel(node.level);
  return {
    slug: curated?.slug ?? `${normalizeLocationSlug(node.slug || name)}-${normalizeLocationSlug(node.county.slug || node.county.name)}`,
    name,
    county: node.county.name,
    kind,
    market: marketForCounty(node.county.name),
    parentName: node.parent?.name ?? undefined,
    description: curated?.description ?? `Browse houses and apartments for rent in ${name}${node.parent?.name ? `, near ${node.parent.name}` : ""}, ${node.county.name} County, Kenya. Compare current listings, rent and property details on NyumbaFinder.`,
  };
}

async function getActiveLocationContext() {
  const [nodes, properties] = await Promise.all([
    prisma.locationNode.findMany({
      where: { searchable: true },
      select: { id: true, countyId: true, name: true, slug: true, level: true, parentId: true, county: { select: { id: true, name: true, slug: true } }, parent: { select: { id: true, name: true, level: true } } },
    }),
    prisma.property.findMany({ where: { status: "ACTIVE" }, select: { id: true, location: true, locationNodeId: true, countyId: true, townId: true, areaId: true } }),
  ]);
  const nodeById = new Map(nodes.map((node) => [node.id, node as DirectoryNode]));
  const counts = new Map<string, number>();
  for (const property of properties) {
    let node = property.locationNodeId ? nodeById.get(property.locationNodeId) : undefined;
    const visited = new Set<string>();
    while (node && !visited.has(node.id)) {
      visited.add(node.id);
      counts.set(node.id, (counts.get(node.id) ?? 0) + 1);
      node = node.parentId ? nodeById.get(node.parentId) : undefined;
    }
  }
  const targets = nodes
    .filter((node) => (counts.get(node.id) ?? 0) > 0)
    .map((node) => ({ node: node as DirectoryNode, target: targetForNode(node as DirectoryNode), count: counts.get(node.id) ?? 0 }))
    .sort((a, b) => a.target.county.localeCompare(b.target.county) || (a.node.parent?.name ?? "").localeCompare(b.node.parent?.name ?? "") || a.target.name.localeCompare(b.target.name));
  return { nodes: nodes as DirectoryNode[], nodeById, properties, targets };
}

export const getActiveLocationDirectory = cache(async () => {
  const context = await getActiveLocationContext();
  return context.targets.map(({ target, count, node }) => ({ ...target, count, parentName: node.parent?.name ?? undefined }));
});

export const getLocationSeoData = cache(async (slug: string) => {
  const curated = getLocationSeoTarget(slug);
  const context = await getActiveLocationContext();
  const dynamic = context.targets.find((entry) => entry.target.slug === slug);
  const target = curated ?? dynamic?.target;
  if (!target) return null;

  const matchingNodes = context.nodes.filter((node) =>
    normalizeLocationSlug(node.name) === normalizeLocationSlug(target.name) &&
    normalizeLocationSlug(node.county.name) === normalizeLocationSlug(target.county)
  );
  const rootNode = matchingNodes.sort((a, b) => {
    const rank = (level: string) => level === "CITY" ? 5 : level === "TOWN" ? 4 : level === "ESTATE" ? 3 : level === "NEIGHBORHOOD" ? 2 : 1;
    return rank(b.level) - rank(a.level);
  })[0];
  const nodeIds = new Set<string>();
  if (rootNode) {
    nodeIds.add(rootNode.id);
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of context.nodes) if (node.parentId && nodeIds.has(node.parentId) && !nodeIds.has(node.id)) { nodeIds.add(node.id); changed = true; }
    }
  }

  const isCityPage = ["nairobi", "nakuru", "mombasa", "kisumu", "eldoret"].includes(target.slug);
  const countyId = rootNode?.countyId ?? context.nodes.find((node) => normalizeLocationSlug(node.county.name) === normalizeLocationSlug(target.county))?.countyId;
  const propertyIds = new Set(context.properties.filter((property) => {
    if (property.locationNodeId && nodeIds.has(property.locationNodeId)) return true;
    if (isCityPage && property.countyId === countyId) return true;
    return normalizeLocationSlug(property.location).includes(normalizeLocationSlug(target.name));
  }).map((property) => property.id));
  const properties = propertyIds.size ? await prisma.property.findMany({
    where: { id: { in: [...propertyIds] }, status: "ACTIVE" },
    select: { id: true, title: true, location: true, price: true, pricePeriod: true, listingType: true, propertyType: true, bedrooms: true, bathrooms: true, images: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 24,
  }) : [];
  return { target, county: rootNode?.county ?? null, properties, indexable: properties.length >= 2, canonical: `${SITE_URL}/locations/${target.slug}` };
});

export async function getLocationSeoSitemapEntries() {
  const activeTargets = await getActiveLocationDirectory();
  return activeTargets.filter((target) => target.count >= 2).map((target) => ({
    url: `${SITE_URL}/locations/${target.slug}`,
    changeFrequency: "daily" as const,
    priority: target.kind === "city" ? 0.78 : target.kind === "town" ? 0.7 : 0.65,
  }));
}
