import type { ImportedListing } from './types';

const DEFAULT_USER_AGENT = 'NyumbaFinder-PropertyImporter/1.0 (+authorized-property-feed)';

const absoluteUrl = (value: string, baseUrl: string) => {
  try { return new URL(value, baseUrl).toString(); } catch { return value; }
};

const cleanText = (value: unknown) =>
  typeof value === 'string'
    ? value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim()
    : '';

const firstNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = cleanText(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
};

const jsonLdBlocks = (html: string): unknown[] => {
  const blocks: unknown[] = [];
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {}
  }
  return blocks;
};

const flattenJsonLd = (blocks: unknown[]) => {
  const values: Record<string, unknown>[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const object = value as Record<string, unknown>;
    values.push(object);
    if (Array.isArray(object['@graph'])) object['@graph'].forEach(visit);
    if (object.item && typeof object.item === 'object') visit(object.item);
    if (object.mainEntity && typeof object.mainEntity === 'object') visit(object.mainEntity);
  };
  blocks.forEach(visit);
  return values;
};

const findListingObject = (blocks: unknown[]) => {
  for (const item of flattenJsonLd(blocks)) {
    const type = Array.isArray(item['@type']) ? item['@type'].join(' ') : String(item['@type'] ?? '');
    if (/residence|house|apartment|singlefamily|product|offer|realestate/i.test(type) ||
        item.offers || item.address || item.numberOfBedrooms || item.numberOfBathrooms) {
      return item;
    }
  }
  return null;
};

const collectImages = (value: unknown, baseUrl: string) => {
  const images: string[] = [];
  const add = (candidate: unknown) => {
    if (typeof candidate !== 'string' || !candidate.trim()) return;
    const url = absoluteUrl(candidate.trim(), baseUrl);
    if (/^https?:\/\//i.test(url) && !images.includes(url)) images.push(url);
  };
  if (typeof value === 'string') add(value);
  else if (Array.isArray(value)) value.forEach(add);
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    add(obj.url);
    add(obj.contentUrl);
  }
  return images;
};

const metaContent = (html: string, property: string) => {
  const escaped = property.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    '<meta[^>]+(?:property|name)=["\']' + escaped + '["\'][^>]+content=["\']([^"\']+)["\'][^>]*>',
    'i',
  );
  return html.match(pattern)?.[1] ?? '';
};

const canonicalUrl = (html: string, fallback: string) => {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  return absoluteUrl(match?.[1] || fallback, fallback);
};

const fetchHtml = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/json',
    },
    redirect: 'follow',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Source returned HTTP ' + response.status);
  return response.text();
};

export async function scrapeStructuredListing(url: string): Promise<ImportedListing> {
  const html = await fetchHtml(url);
  const item = findListingObject(jsonLdBlocks(html));
  const offers = item?.offers && typeof item.offers === 'object' ? item.offers as Record<string, unknown> : {};
  const address = item?.address && typeof item.address === 'object' ? item.address as Record<string, unknown> : {};
  const geo = item?.geo && typeof item.geo === 'object' ? item.geo as Record<string, unknown> : {};

  const title = cleanText(item?.name) || cleanText(metaContent(html, 'og:title')) || cleanText(metaContent(html, 'twitter:title'));
  if (!title) throw new Error('No supported property title found on source page.');

  const sourceUrl = canonicalUrl(html, url);
  const externalId = cleanText(item?.sku) || cleanText(item?.productID) || cleanText(item?.identifier) || sourceUrl;

  return {
    externalId,
    sourceUrl,
    title,
    description: cleanText(item?.description) || cleanText(metaContent(html, 'og:description')),
    price: firstNumber(offers.price ?? item?.price),
    bedrooms: firstNumber(item?.numberOfBedrooms ?? item?.bedrooms),
    bathrooms: firstNumber(item?.numberOfBathroomsTotal ?? item?.numberOfBathrooms ?? item?.bathrooms),
    sizeSqm: firstNumber(item?.floorSize && typeof item.floorSize === 'object'
      ? (item.floorSize as Record<string, unknown>).value
      : item?.floorSize),
    propertyType: cleanText(item?.additionalType ?? item?.['@type']),
    location: [
      cleanText(address.streetAddress),
      cleanText(address.addressLocality),
      cleanText(address.addressRegion),
    ].filter(Boolean).join(', '),
    imageUrls: collectImages(item?.image, url),
    latitude: firstNumber(geo.latitude),
    longitude: firstNumber(geo.longitude),
    rawData: item ?? { title },
  };
}

const isAllowedListingUrl = (url: string, listingPageUrl: string, patterns: string[]) => {
  try {
    const candidate = new URL(url);
    const root = new URL(listingPageUrl);
    if (candidate.hostname !== root.hostname) return false;
    if (candidate.pathname === root.pathname) return false;
    if (!patterns.length) return true;
    return patterns.some((pattern) => {
      try { return new RegExp(pattern, 'i').test(candidate.pathname); }
      catch { return candidate.pathname.includes(pattern); }
    });
  } catch {
    return false;
  }
};

export async function discoverListingUrls(
  listingPageUrl: string,
  options: {
    maxListings?: number;
    maxPages?: number;
    paginationParam?: string;
    listingPatterns?: string[];
  } = {},
): Promise<string[]> {
  const maxListings = Math.max(1, Math.min(options.maxListings ?? 25, 500));
  const maxPages = Math.max(1, Math.min(options.maxPages ?? 1, 50));
  const paginationParam = options.paginationParam || 'page';
  const urls = new Set<string>();

  for (let page = 1; page <= maxPages && urls.size < maxListings; page += 1) {
    const pageUrl = new URL(listingPageUrl);
    if (page > 1) pageUrl.searchParams.set(paginationParam, String(page));

    const html = await fetchHtml(pageUrl.toString());
    const pattern = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;

    for (const match of html.matchAll(pattern)) {
      const url = absoluteUrl(match[1], pageUrl.toString());
      if (!isAllowedListingUrl(url, listingPageUrl, options.listingPatterns ?? [])) continue;
      urls.add(url);
      if (urls.size >= maxListings) break;
    }

    if (!html.match(/<a[^>]+(?:rel=["']next["']|aria-label=["'][^"']*next)/i) &&
        page > 1 && urls.size === 0) break;
  }

  return [...urls];
}

export async function inspectListingPage(url: string) {
  const html = await fetchHtml(url);
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => absoluteUrl(match[1], url))
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 100);

  return {
    url,
    title: cleanText(metaContent(html, 'og:title')),
    description: cleanText(metaContent(html, 'og:description')),
    discoveredLinks: links.length,
    links,
  };
}
