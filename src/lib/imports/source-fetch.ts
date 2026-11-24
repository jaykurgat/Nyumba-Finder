import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

type Resolver = (hostname: string) => Promise<Array<{ address: string; family: number }>>;
type Fetcher = typeof fetch;

function isPrivateIpv4(ip: string) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

function isPrivateIpv6(ip: string) {
  const value = ip.toLowerCase();
  return value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') ||
    /^fe[89ab]/.test(value) || value.startsWith('ff') || value.startsWith('::ffff:');
}

export async function assertPublicHttpsUrl(value: string, resolve: Resolver = async (hostname) => lookup(hostname, { all: true, verbatim: true })) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Enter a valid property URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Only public HTTPS property URLs are supported.');
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Private and local network addresses cannot be imported.');
  }
  if (isIP(host)) {
    if (isIP(host) === 6 ? isPrivateIpv6(host) : isPrivateIpv4(host)) {
      throw new Error('Private and local network addresses cannot be imported.');
    }
  } else {
    let records: Array<{ address: string; family: number }>;
    try { records = await resolve(host); }
    catch { throw new Error('The URL does not resolve to a public address.'); }
    if (!records.length || records.some((record) => record.family === 4
      ? isPrivateIpv4(record.address)
      : isPrivateIpv6(record.address))) {
      throw new Error('The URL does not resolve exclusively to public addresses.');
    }
  }
  return url;
}

export async function fetchListingPage(
  initialUrl: URL,
  dependencies: { resolve?: Resolver; fetcher?: Fetcher; timeoutMs?: number; maxBytes?: number } = {},
) {
  const resolve = dependencies.resolve;
  const fetcher = dependencies.fetcher ?? fetch;
  const timeoutMs = dependencies.timeoutMs ?? 20_000;
  const maxBytes = dependencies.maxBytes ?? 1_500_000;
  let current = initialUrl;

  for (let hop = 0; hop < 4; hop += 1) {
    await assertPublicHttpsUrl(current.toString(), resolve);
    const response = await fetcher(current, {
      headers: { 'User-Agent': 'NyumbaFinder-QuickImport/1.0', Accept: 'text/html,application/xhtml+xml' },
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('The source redirected without a destination.');
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(response.status === 403
      ? 'The source website denied access (HTTP 403). This URL cannot be imported automatically.'
      : 'The source website returned HTTP ' + response.status + '.');
    const type = response.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml\+xml/i.test(type)) throw new Error('The URL did not return an HTML property page.');
    const html = await response.text();
    if (html.length > maxBytes) throw new Error('The property page is larger than the 1.5 MB import limit.');
    return { html, finalUrl: current.toString() };
  }
  throw new Error('The source redirected too many times.');
}

