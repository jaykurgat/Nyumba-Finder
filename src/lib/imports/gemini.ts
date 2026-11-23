// Both models below have standard free-tier input/output pricing in Google's Gemini API pricing.
// Keep this allowlist explicit so a stale Vercel environment variable cannot select a paid model.
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const FALLBACK_CANDIDATES = ['gemini-2.5-flash'];
const GENERATE_TIMEOUT_MS = 10_000;

type GeminiPayload = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  usageMetadata?: unknown;
  promptFeedback?: unknown;
};

export type GeminiResult = {
  payload: GeminiPayload;
  model: string;
  latencyMs: number;
  attempts: number;
  fallbackUsed: boolean;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function errorMessage(status: number, body: string) {
  const detail = (() => { try { return JSON.parse(body)?.error?.message; } catch { return null; } })();
  if (status === 400) return 'Gemini rejected the request (HTTP 400): ' + (detail || body.slice(0, 500));
  if (status === 401 || status === 403) return 'Gemini API key or project access was rejected (HTTP ' + status + '): ' + (detail || body.slice(0, 500));
  if (status === 404) return 'Gemini model was not found or is unavailable to this API project (HTTP 404): ' + (detail || body.slice(0, 500));
  if (status === 429) return 'Gemini rate/quota limit reached (HTTP 429): ' + (detail || body.slice(0, 500));
  if (status === 503) return 'AI extraction service returned HTTP 503: ' + (detail || body.slice(0, 500));
  return 'Gemini API returned HTTP ' + status + ': ' + (detail || body.slice(0, 500));
}

async function requestModel(key: string, model: string, prompt: string, timeoutMs = GENERATE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
      cache: 'no-store',
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) {
      const error = new Error(errorMessage(response.status, raw)) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    let payload: GeminiPayload;
    try { payload = JSON.parse(raw) as GeminiPayload; }
    catch { throw new Error('Gemini returned an invalid API response.'); }
    return payload;
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      throw new Error('AI extraction service timed out after ' + timeoutMs + ' ms.');
    }
    if (error instanceof TypeError) throw new Error('AI extraction service network request failed: ' + error.message);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function listGeminiModels() {
  const key = process.env.GOOGLE_GENAI_API_KEY;
  if (!key) throw new Error('GOOGLE_GENAI_API_KEY is missing from this deployment environment.');
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': key },
    cache: 'no-store',
    signal: AbortSignal.timeout(4_000),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(errorMessage(response.status, raw));
  const data = JSON.parse(raw) as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> };
  return (data.models ?? [])
    .filter((model) => model.name && model.supportedGenerationMethods?.includes('generateContent'))
    .map((model) => model.name!.replace(/^models\//, ''));
}

export async function generateGeminiJson(prompt: string): Promise<GeminiResult> {
  const key = process.env.GOOGLE_GENAI_API_KEY;
  if (!key) throw new Error('GOOGLE_GENAI_API_KEY is missing from this deployment environment.');
  const primary = DEFAULT_MODEL;
  // Never honor GEMINI_MODEL / GEMINI_FALLBACK_MODEL here: older deployments may
  // still define those variables with a different model. This importer is free-tier only.
  const started = Date.now();
  let attempts = 0;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    attempts += 1;
    try {
      const payload = await requestModel(key, primary, prompt);
      return { payload, model: primary, latencyMs: Date.now() - started, attempts, fallbackUsed: false };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown Gemini error.');
      const status = (error as Error & { status?: number }).status;
      const transient = status === 429 || status === 503 || status === 502 || status === 504 ||
        /timed out|network request failed/i.test(lastError.message);
      if (!transient || attempt === 1) break;
      await sleep(1_000);
      if (status === 429) break;
    }
  }

  // Only attempt a fallback after Google's own model catalogue confirms it supports generateContent.
  // A 429 is a project quota/rate limit and is not bypassed by switching models.
  if (lastError && !/HTTP 429/.test(lastError.message) &&
      (/HTTP 503|HTTP 502|HTTP 504|timed out|network request failed/i.test(lastError.message))) {
    try {
      const available = await listGeminiModels();
      const fallback = FALLBACK_CANDIDATES.find((value) => value !== primary && available.includes(value));
      if (fallback) {
        attempts += 1;
        const payload = await requestModel(key, fallback, prompt);
        return { payload, model: fallback, latencyMs: Date.now() - started, attempts, fallbackUsed: true };
      }
      throw new Error('No configured fallback model supporting generateContent is available to this API key.');
    } catch (fallbackError) {
      const detail = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error.';
      throw new Error(lastError.message + ' Fallback was not successful: ' + detail);
    }
  }
  throw lastError ?? new Error('Gemini request failed.');
}
