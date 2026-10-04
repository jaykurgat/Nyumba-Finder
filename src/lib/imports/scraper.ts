import type { ImportedListing } from './types';

const absoluteUrl = (value: string, baseUrl: string) => {
  try { return new URL(value, baseUrl).toString(); } catch { return value; }
};

const cleanText = (value: unknown) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim() : '';

const firstNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = cleanText(value).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
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

const findListingObject = (blocks: unknown[]) => {
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const root = block as Record<string, unknown>;
    const graph = Array.isArray(root['@graph']) ? root['@graph'] : [];
    for (const candidate of [root, ...graph]) {
      if (!candidate || typeof candidate !== 'object') continue;
      const item = candidate as Record<string, unknown>;
      const type = Array.isArray(item['@type']) ? item['@type'].join(' ') : String(item['@type'] ?? '');
      if (/residence|house|apartment|singlefamily|product|offer/i.test(type) || item.offers || item.address) return item;
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
    add(obj.url); add(obj.contentUrl);
  }
  return images;
};

export async function scrapeStructuredListing(url: string): Promise<ImportedListing> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'NyumbaFinder-PropertyImporter/1.0 (+authorized-property-feed)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);

  const html = await response.text();
  const item = findListingObject(jsonLdBlocks(html));
  if (!item) throw new Error('No supported JSON-LD property data found on source page.');

  const offers = item.offers && typeof item.offers === 'object' ? item.offers as Record<string, unknown> : {};
  const address = item.address && typeof item.address === 'object' ? item.address as Record<string, unknown> : {};
  const geo = item.geo && typeof item.geo === 'object' ? item.geo as Record<string, unknown> : {};

  return {
    externalId: cleanText(item.url) || cleanText(item.sku) || cleanText(item.productID) || url,
    sourceUrl: url,
    title: cleanText(item.name) || 'Imported property',
    description: cleanText(item.description),
    price: firstNumber(offers.price ?? item.price),
    bedrooms: firstNumber(item.numberOfBedrooms ?? item.bedrooms),
    bathrooms: firstNumber(item.numberOfBathroomsTotal ?? item.numberOfBathrooms ?? item.bathrooms),
    sizeSqm: firstNumber(item.floorSize && typeof item.floorSize === 'object' ? (item.floorSize as Record<string, unknown>).value : item.floorSize),
    propertyType: cleanText(item.additionalType ?? item['@type']),
    location: [cleanText(address.streetAddress), cleanText(address.addressLocality), cleanText(address.addressRegion)].filter(Boolean).join(', '),
    imageUrls: collectImages(item.image, url),
    latitude: firstNumber(geo.latitude),
    longitude: firstNumber(geo.longitude),
    rawData: item,
  };
}

export async function discoverListingUrls(listingPageUrl: string, maxListings = 25): Promise<string[]> {
  const response = await fetch(listingPageUrl, {
    headers: {
      'User-Agent': 'NyumbaFinder-PropertyImporter/1.0 (+authorized-property-feed)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);

  const html = await response.text();
  const urls = new Set<string>();
  const pattern = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const pageUrl = new URL(listingPageUrl);

  for (const match of html.matchAll(pattern)) {
    const href = match[1];
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
    const url = absoluteUrl(href, listingPageUrl);
    try {
      if (new URL(url).hostname !== pageUrl.hostname) continue;
    } catch { continue; }
    urls.add(url);
    if (urls.size >= maxListings) break;
  }
  return [...urls];
}
