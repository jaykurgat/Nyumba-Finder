import { NextRequest } from 'next/server';
export { isSupportedImage } from './image-validation';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Best-effort per-instance throttle. It reduces repeated abuse on warm instances;
 * use a shared Redis/Upstash limiter for a hard distributed limit across serverless instances.
 */
export function allowRateLimitedRequest(request: NextRequest, scope: string, limit: number, windowMs: number) {
  // Prefer the reverse-proxy supplied single client IP; X-Forwarded-For may contain
  // client-provided values before trusted proxy values.
  const address = request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',').pop()?.trim()
    || 'unknown';
  const key = scope + ':' + address.slice(0, 100);
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
      if (buckets.size > 5000) buckets.clear();
    }
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function hasValidRequestOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}
