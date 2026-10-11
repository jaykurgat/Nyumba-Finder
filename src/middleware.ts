import { NextRequest, NextResponse } from 'next/server';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(request: NextRequest) {
  if (!MUTATING_METHODS.has(request.method)) return NextResponse.next();
  const origin = request.headers.get('origin');
  // Browser requests with an Origin header must be same-origin for state changes.
  // Non-browser jobs can omit Origin and authenticate with their route-specific secret.
  if (!origin) return NextResponse.next();
  try {
    if (new URL(origin).origin !== request.nextUrl.origin) {
      return NextResponse.json({ message: 'Cross-origin state-changing requests are not allowed.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ message: 'Invalid request origin.' }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
