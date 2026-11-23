const MAX_INPUT_CHARS = 150_000;
const MAX_OUTPUT_CHARS = 24_000;

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => {
      const point = Number(code);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : ' ';
    });
}

/**
 * Normalize user-supplied listing text or HTML for the property extraction model.
 * Content is treated as untrusted data; the model prompt must explicitly say so.
 * This does not fetch URLs, execute scripts, or render JavaScript applications.
 */
export function normalizePropertyContent(input: string) {
  const raw = input.trim();
  if (!raw) throw new Error('Paste the listing page text or HTML first.');
  if (raw.length > MAX_INPUT_CHARS) {
    throw new Error('The supplied content is too large. Keep pasted text/HTML below 150,000 characters.');
  }

  const looksLikeHtml = /<\\s*(?:!doctype|[a-z][a-z0-9-]*(?:\\s|>|\\/))/i.test(raw);
  if (!looksLikeHtml) {
    const text = decodeEntities(raw.replace(/\u0000/g, ' ')).replace(/\s+/g, ' ').trim();
    if (text.length < 80) throw new Error('The supplied text is too short. Paste the complete property description and its key details.');
    return text.slice(0, MAX_OUTPUT_CHARS);
  }

  const jsonLd = [...raw.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => decodeEntities(match[1]).slice(0, 12_000))
    .join('\n');
  const metadata = [...raw.matchAll(/<meta\b[^>]*(?:property|name)\s*=\s*["']([^"']+)["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/gi)]
    .map((match) => match[1] + ': ' + decodeEntities(match[2]))
    .join('\n');
  const title = raw.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  const visible = decodeEntities(raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(?:p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u0000/g, ' '))
    .replace(/[ \t\r]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
  const combined = [
    title ? 'PAGE TITLE:\n' + decodeEntities(title) : '',
    metadata ? 'PAGE METADATA:\n' + metadata : '',
    jsonLd ? 'STRUCTURED DATA (JSON-LD):\n' + jsonLd : '',
    visible ? 'VISIBLE PAGE TEXT:\n' + visible : '',
  ].filter(Boolean).join('\n\n');
  if (combined.trim().length < 100) {
    throw new Error('No meaningful listing content was found. Paste the rendered listing text rather than an empty page shell.');
  }
  return combined.slice(0, MAX_OUTPUT_CHARS);
}
