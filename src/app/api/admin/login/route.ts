import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken, adminCookie, adminTtlSeconds } from '@/lib/admin-auth';
import { allowRateLimitedRequest, hasValidRequestOrigin } from '@/lib/security';

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) return NextResponse.json({ message: 'Invalid request origin.' }, { status: 403 });
  if (!allowRateLimitedRequest(request, 'admin-login', 5, 15 * 60 * 1000)) {
    return NextResponse.json({ message: 'Too many sign-in attempts. Please wait 15 minutes and try again.' }, { status: 429, headers: { 'Retry-After': '900' } });
  }
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredEmail || !configuredPassword) {
    return NextResponse.json({ message: 'Admin credentials are not configured.' }, { status: 503 });
  }

  if (email !== configuredEmail || password !== configuredPassword) {
    return NextResponse.json({ message: 'Invalid admin credentials.' }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(adminCookie, createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: adminTtlSeconds,
  });
  return response;
}
