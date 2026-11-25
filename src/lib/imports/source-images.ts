// Explicit extensions allow the built-in Node test runner to load these helpers without a bundler.
// @ts-expect-error Next and Node's strip-types runner both resolve this TypeScript module.
import { assertPublicHttpsUrl } from './source-fetch.ts';
// @ts-expect-error Node's strip-types test runner consumes the explicit extension.
import { isSupportedImage } from '../image-validation.ts';

export type ImageCandidate = { url: string; alt: string; kind: 'PROPERTY' | 'LOGO' | 'BANNER' | 'UNRELATED' };

function attributes(tag: string) {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return result;
}

function classify(text: string, width?: number, height?: number): ImageCandidate['kind'] {
  if (/logo|brand|avatar|icon|favicon|watermark/i.test(text)) return 'LOGO';
  if (/banner|header|hero|promo|advert|campaign|background/i.test(text)) return 'BANNER';
  if ((width && width < 140) || (height && height < 100)) return 'UNRELATED';
  return 'PROPERTY';
}

export function discoverPropertyImages(html: string, pageUrl: string): ImageCandidate[] {
  const base = new URL(pageUrl);
  const candidates = new Map<string, ImageCandidate>();
  const add = (rawUrl: string, alt = '', hint = '', width?: number, height?: number) => {
    const value = rawUrl.trim().replace(/&amp;/gi, '&');
    if (!value || /^(?:data:|blob:|javascript:)/i.test(value)) return;
    try {
      const url = new URL(value, base);
      if (url.protocol !== 'https:' || url.username || url.password) return;
      const kind = classify(`${alt} ${hint} ${url.pathname}`, width, height);
      const existing = candidates.get(url.toString());
      if (!existing || (existing.kind !== 'PROPERTY' && kind === 'PROPERTY')) candidates.set(url.toString(), { url: url.toString(), alt: alt.slice(0, 240), kind });
    } catch { /* Ignore malformed image references. */ }
  };

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const alt = attrs.alt ?? '';
    const width = Number(attrs.width) || undefined;
    const height = Number(attrs.height) || undefined;
    const source = attrs['data-src'] ?? attrs['data-original'] ?? attrs.src;
    if (source) add(source, alt, `${attrs.class ?? ''} ${attrs.id ?? ''}`, width, height);
    if (attrs.srcset) {
      for (const option of attrs.srcset.split(',')) add(option.trim().split(/\s+/)[0], alt, `${attrs.class ?? ''} ${attrs.id ?? ''}`, width, height);
    }
  }
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (/^(?:og:image|twitter:image)$/i.test(attrs.property ?? attrs.name ?? '')) add(attrs.content ?? '', '', attrs.property ?? attrs.name ?? '');
  }
  const jsonLd = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of jsonLd) {
    try {
      const visit = (value: unknown) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) return value.forEach(visit);
        const record = value as Record<string, unknown>;
        const images = record.image;
        if (typeof images === 'string') add(images);
        else if (Array.isArray(images)) images.forEach(image => typeof image === 'string' ? add(image) : image && typeof image === 'object' && typeof (image as any).url === 'string' ? add((image as any).url) : undefined);
        else if (images && typeof images === 'object' && typeof (images as any).url === 'string') add((images as any).url);
        Object.values(record).forEach(visit);
      };
      visit(JSON.parse(match[1]));
    } catch { /* Ignore malformed structured data. */ }
  }
  return [...candidates.values()].slice(0, 40);
}

export async function downloadPublicImage(value: string, dependencies: { fetcher?: typeof fetch; timeoutMs?: number; maxBytes?: number; resolve?: (hostname: string) => Promise<Array<{ address: string; family: number }>> } = {}) {
  const fetcher = dependencies.fetcher ?? fetch;
  const maxBytes = dependencies.maxBytes ?? 3_000_000;
  const timeoutMs = dependencies.timeoutMs ?? 15_000;
  let current = new URL(value);
  for (let hop = 0; hop < 4; hop += 1) {
    current = await assertPublicHttpsUrl(current.toString(), dependencies.resolve);
    const response = await fetcher(current, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'image/jpeg,image/png,image/webp' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('The image source redirected without a destination.');
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`The image source returned HTTP ${response.status}.`);
    const mimeType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw new Error('Only JPEG, PNG or WebP property photos can be saved.');
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) throw new Error('Each image must be 3 MB or smaller.');
    if (!response.body) throw new Error('The image source returned an empty response.');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new Error('Each image must be 3 MB or smaller.'); }
      chunks.push(value);
    }
    const data = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
    if (!isSupportedImage(data, mimeType)) throw new Error('The downloaded file is not a valid supported image.');
    return { data, mimeType, sourceUrl: current.toString() };
  }
  throw new Error('The image source redirected too many times.');
}
