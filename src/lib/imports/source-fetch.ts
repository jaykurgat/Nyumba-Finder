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

export type ListingAcquisitionMethod = 'SERVER_FETCH' | 'PLAYWRIGHT_BROWSERLESS';

type BrowserRenderer = (url: string) => Promise<{ html: string; finalUrl: string }>;

function visibleHtmlText(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** A cheap check that decides whether an allowed 200 page looks like an empty JS shell. */
export function needsBrowserRendering(html: string) {
  const visible = visibleHtmlText(html);
  const structuredData = /application\/ld\+json/i.test(html);
  const listingFacts = /(?:for\s+sale|for\s+rent|KSh|KES|\b\d+\s*(?:bed(?:room)?s?|bath(?:room)?s?|sqm|m²)\b)/i.test(visible);
  if (structuredData && listingFacts) return false;
  return visible.length < 350 || (!structuredData && !listingFacts && visible.length < 1_200);
}

function browserlessEndpoint() {
  if (process.env.BROWSERLESS_ENABLE !== 'true') return null;
  const token = process.env.BROWSERLESS_API_TOKEN?.trim();
  if (!token) throw new Error('Managed Playwright is enabled but BROWSERLESS_API_TOKEN is not configured.');
  const region = (process.env.BROWSERLESS_REGION || 'production-sfo').trim();
  if (!/^(?:production-sfo|production-lon|production-ams)$/.test(region)) {
    throw new Error('Browser retrieval is misconfigured. Set BROWSERLESS_REGION to a supported Browserless region.');
  }
  const endpoint = new URL(`wss://${region}.browserless.io/chromium/playwright`);
  endpoint.searchParams.set('token', token);
  return endpoint.toString();
}

async function renderWithBrowserless(url: string): Promise<{ html: string; finalUrl: string }> {
  const endpoint = browserlessEndpoint();
  if (!endpoint) throw new Error('This page loaded as a JavaScript shell, but managed Playwright is not enabled. Paste the rendered page text/HTML or enable it after confirming the Browserless plan and costs.');

  let browser: { newContext: (options?: unknown) => Promise<any>; close: () => Promise<void> } | undefined;
  try {
    // Loaded only when explicitly configured, keeping the browser dependency out of ordinary requests.
    const playwright = await import('playwright-core') as { chromium: { connect: (endpoint: string, options?: unknown) => Promise<typeof browser> } };
    browser = await playwright.chromium.connect(endpoint, { timeout: 8_000 });
    if (!browser) throw new Error('Browserless did not return a browser session.');
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.routeWebSocket(/.*/, (socket: any) => socket.close());
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(18_000);

    // Validate every browser request and redirect to prevent private-network access.
    await page.route('**/*', async (route: any) => {
      const requestUrl = route.request().url();
      if (requestUrl.startsWith('data:') || requestUrl.startsWith('blob:')) return route.continue();
      try {
        await assertPublicHttpsUrl(requestUrl);
        return route.continue();
      } catch {
        return route.abort('blockedbyclient');
      }
    });

    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 18_000 });
    const status = response?.status() ?? 0;
    if (status === 403) throw new Error('The source website denied access (HTTP 403). Browser retrieval stopped without retrying or bypassing the denial.');
    if (status === 401 || status === 429) throw new Error(`The source website denied automated access (HTTP ${status}). Browser retrieval stopped.`);
    if (status >= 400) throw new Error(`The source website returned HTTP ${status} during browser retrieval.`);
    await page.waitForLoadState('networkidle', { timeout: 2_000 }).catch(() => undefined);
    const title = await page.title().catch(() => '');
    const text = await page.locator('body').innerText({ timeout: 3_000 }).catch(() => '');
    if (/captcha|verify you are human|unusual traffic|access denied|automated requests/i.test(`${title}\n${text.slice(0, 2_000)}`)) {
      throw new Error('The source requires verification or denies automated access. Browser retrieval stopped; paste page content you are authorized to use.');
    }
    const finalUrl = page.url();
    await assertPublicHttpsUrl(finalUrl);
    const html = await page.content();
    if (html.length > 1_500_000) throw new Error('The rendered property page is larger than the 1.5 MB import limit.');
    if (!visibleHtmlText(html)) throw new Error('The browser did not find readable listing content.');
    return { html, finalUrl };
  } catch (error) {
    if (error instanceof Error && /denied access|denied automated access|requires verification|returned HTTP|larger than|did not find|managed Playwright|misconfigured/.test(error.message)) throw error;
    // Do not expose the Browserless endpoint because its query string contains the secret token.
    throw new Error('Managed Playwright retrieval failed or timed out. Try again later or paste the rendered listing content.');
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

export async function acquireListingPage(
  initialUrl: URL,
  dependencies: {
    resolve?: Resolver;
    fetcher?: Fetcher;
    timeoutMs?: number;
    maxBytes?: number;
    browserRenderer?: BrowserRenderer;
  } = {},
) {
  const direct = await fetchListingPage(initialUrl, dependencies);
  if (!needsBrowserRendering(direct.html)) return { ...direct, method: 'SERVER_FETCH' as const };

  const renderer = dependencies.browserRenderer ?? renderWithBrowserless;
  const rendered = await renderer(direct.finalUrl);
  return { ...rendered, method: 'PLAYWRIGHT_BROWSERLESS' as const };
}
