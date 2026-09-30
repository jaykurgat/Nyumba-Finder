import { NextResponse } from 'next/server';
import { adminCookie } from '@/lib/admin-auth';

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(adminCookie, '', { httpOnly: true, expires: new Date(0), path: '/' });
  return response;
}
