import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'nyumbafinder_admin_session';
const TTL_SECONDS = 60 * 60 * 4;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters.');
  return value;
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

function credentialFingerprint() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD must be configured.');
  return createHash('sha256').update(password).digest('hex');
}

export function createAdminToken() {
  const payload = 'admin:' + (Date.now() + TTL_SECONDS * 1000) + ':' + credentialFingerprint();
  return payload + '.' + sign(payload);
}

export function isValidAdminToken(token?: string | null) {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const parts = payload.split(':');
  const expiry = Number(parts[1]);
  const fingerprint = parts[2];
  if (!payload.startsWith('admin:') || !Number.isFinite(expiry) || expiry <= Date.now() || !fingerprint) return false;
  try {
    const expectedFingerprint = Buffer.from(credentialFingerprint(), 'hex');
    const suppliedFingerprint = Buffer.from(fingerprint, 'hex');
    return expectedFingerprint.length === suppliedFingerprint.length && timingSafeEqual(expectedFingerprint, suppliedFingerprint);
  } catch {
    return false;
  }
}

export async function isAdminSession() {
  const store = await cookies();
  return isValidAdminToken(store.get(COOKIE)?.value);
}

export const adminCookie = COOKIE;
export const adminTtlSeconds = TTL_SECONDS;
