import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const USER_COOKIE = 'nyumbafinder_user_session';
export const USER_SESSION_TTL = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.USER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('Configure USER_SESSION_SECRET with at least 32 characters.');
  return value;
}
function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}
export function createUserSessionToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + USER_SESSION_TTL })).toString('base64url');
  return payload + '.' + sign(payload);
}
export function verifyUserSessionToken(token?: string | null): { userId: string } | null {
  if (!token) return null;
  const [payload, supplied] = token.split('.');
  if (!payload || !supplied) return null;
  try {
    const expected = sign(payload);
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string; exp?: number };
    if (!data.sub || !Number.isFinite(data.exp) || Number(data.exp) <= Math.floor(Date.now() / 1000)) return null;
    return { userId: data.sub };
  } catch { return null; }
}
export async function getCurrentUser() {
  const store = await cookies();
  const parsed = verifyUserSessionToken(store.get(USER_COOKIE)?.value);
  if (!parsed) return null;
  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: { id: true, email: true, status: true, profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true } } },
  });
  return user?.status === 'ACTIVE' ? user : null;
}
export function randomToken() { return randomBytes(32).toString('hex'); }
