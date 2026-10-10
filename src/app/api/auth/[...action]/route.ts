import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { prisma } from '@/lib/prisma';
import { createUserSessionToken, randomToken, USER_COOKIE, USER_SESSION_TTL } from '@/lib/user-auth';
import { sendAuthEmail } from '@/lib/auth-email';

const scrypt = promisify(scryptCallback);
type Context = { params: Promise<{ action: string[] }> };
const baseUrl = (request: NextRequest) => (process.env.APP_URL || process.env.NEXTAUTH_URL || request.nextUrl.origin).replace(/\/$/, '');
const json = (message: string, status = 200) => NextResponse.json({ message }, { status });
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  return 'scrypt:' + salt + ':' + derived.toString('hex');
}
async function verifyPassword(password: string, stored: string) {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const actual = await scrypt(password, parts[1], 64) as Buffer;
  const expected = Buffer.from(parts[2], 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function setSession(response: NextResponse, userId: string) {
  response.cookies.set(USER_COOKIE, createUserSessionToken(userId), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: USER_SESSION_TTL,
  });
  return response;
}
function clearGoogleState(response: NextResponse) {
  response.cookies.set('nyumbafinder_google_state', '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/api/auth/google/callback', maxAge: 0,
  });
  return response;
}
export async function POST(request: NextRequest, context: Context) {
  const action = (await context.params).action.join('/');
  const body = await request.json().catch(() => ({}));
  if (action === 'register') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json('Enter a valid email address.', 400);
    if (password.length < 10 || password.length > 128) return json('Use a password between 10 and 128 characters.', 400);
    try {
      const user = await prisma.user.create({
        data: { email, passwordHash: await hashPassword(password), profile: { create: { displayName: name || email.split('@')[0], firstName: name || null } } },
        select: { id: true },
      });
      const emailSent = await sendAuthEmail({
        to: email,
        subject: 'Welcome to NyumbaFinder',
        html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#24332b"><h2>Welcome to NyumbaFinder</h2><p>Your account has been created successfully.</p><p>You can now sign in to manage your NyumbaFinder account and continue your house search.</p><p><a href="' + baseUrl(request) + '/account" style="display:inline-block;padding:12px 18px;background:#287b46;color:#fff;text-decoration:none;border-radius:8px">Open your account</a></p><p>If you did not create this account, please contact NyumbaFinder support.</p></div>',
        text: 'Welcome to NyumbaFinder. Your account has been created successfully. Open your account: ' + baseUrl(request) + '/account. If you did not create this account, please contact NyumbaFinder support.',
      }).then(() => true).catch((error) => { console.error('ACCOUNT_WELCOME_EMAIL_FAILED', error); return false; });
      const message = emailSent
        ? 'Account created successfully. A welcome email has been sent.'
        : 'Account created successfully, but we could not send the welcome email. You can continue using your account.';
      return setSession(NextResponse.json({ authenticated: true, message, emailSent }, { status: 201 }), user.id);
    } catch (error: any) {
      if (error?.code === 'P2002') return json('An account with that email already exists. Sign in or reset your password.', 409);
      console.error('ACCOUNT_REGISTER_FAILED', error);
      return json('Could not create your account right now.', 500);
    }
  }
  if (action === 'login') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) return json('Enter your email and password.', 400);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, status: true } });
    const valid = user?.passwordHash ? await verifyPassword(password, user.passwordHash).catch(() => false) : false;
    if (!user || !valid || user.status !== 'ACTIVE') return json('Email or password is incorrect.', 401);
    return setSession(NextResponse.json({ authenticated: true }), user.id);
  }
  if (action === 'logout') {
    const response = NextResponse.json({ authenticated: false });
    response.cookies.set(USER_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  }
  if (action === 'forgot-password') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const message = 'If an account exists for that email, a password reset link will be sent shortly.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(message);
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      console.error('PASSWORD_RESET_EMAIL_NOT_CONFIGURED: set RESEND_API_KEY and RESEND_FROM_EMAIL');
      return json('Password recovery email is temporarily unavailable. Please try again later or contact support.', 503);
    }
    try {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
      if (!user?.email) return json(message);
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      const token = randomToken();
      const record = await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
        select: { id: true },
      });
      const url = baseUrl(request) + '/account?mode=reset&token=' + encodeURIComponent(token);
      try {
        await sendAuthEmail({
          to: user.email,
          subject: 'Reset your NyumbaFinder password',
          html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#24332b"><h2>Reset your password</h2><p>We received a request to reset your NyumbaFinder password.</p><p><a href="' + url + '" style="display:inline-block;padding:12px 18px;background:#287b46;color:#fff;text-decoration:none;border-radius:8px">Reset password</a></p><p>This link expires in 30 minutes and can only be used once. If you did not request this, ignore this email.</p></div>',
          text: 'We received a request to reset your NyumbaFinder password. Use this link within 30 minutes: ' + url + '. The link can only be used once. If you did not request this, ignore this email.',
        });
      } catch (error) {
        await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => undefined);
        console.error('PASSWORD_RESET_EMAIL_FAILED', error);
        return json('We could not send the password recovery email. Please try again later.', 503);
      }
    } catch (error) {
      console.error('PASSWORD_RESET_REQUEST_FAILED', error);
      return json('Password recovery could not be started. Please try again later.', 500);
    }
    return json(message);
  }
  if (action === 'reset-password') {
    const token = typeof body.token === 'string' ? body.token : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!token || password.length < 10 || password.length > 128) return json('Use a valid reset link and a password between 10 and 128 characters.', 400);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { email: true } } },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date()) return json('This reset link is invalid or expired. Request a new one.', 400);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, id: { not: record.id } } }),
    ]);
    let notificationSent = true;
    if (record.user.email) {
      notificationSent = await sendAuthEmail({
        to: record.user.email,
        subject: 'Your NyumbaFinder password was changed',
        html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#24332b"><h2>Password changed</h2><p>Your NyumbaFinder password has been changed successfully.</p><p>If you did not make this change, contact NyumbaFinder support immediately.</p><p><a href="' + baseUrl(request) + '/account" style="color:#287b46">Go to NyumbaFinder</a></p></div>',
        text: 'Your NyumbaFinder password has been changed successfully. If you did not make this change, contact NyumbaFinder support immediately. Sign in: ' + baseUrl(request) + '/account',
      }).then(() => true).catch((error) => { console.error('PASSWORD_CHANGED_EMAIL_FAILED', error); return false; });
    }
    return json(notificationSent
      ? 'Password updated successfully. A confirmation email has been sent. You can now sign in.'
      : 'Password updated successfully, but we could not send the confirmation email. You can now sign in.');
  }
  return json('Unknown authentication action.', 404);
}
export async function GET(request: NextRequest, context: Context) {
  const action = (await context.params).action.join('/');
  if (action === 'me') {
    const { cookies } = await import('next/headers');
    const { verifyUserSessionToken } = await import('@/lib/user-auth');
    const store = await cookies();
    const session = verifyUserSessionToken(store.get(USER_COOKIE)?.value);
    if (!session) return NextResponse.json({ user: null });
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, status: true, profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
    return NextResponse.json({ user: user?.status === 'ACTIVE' ? user : null });
  }
  if (action === 'google/start') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) return NextResponse.redirect(new URL('/account?mode=login&error=google_not_configured', baseUrl(request)));
    const state = randomBytes(32).toString('hex');
    const callback = baseUrl(request) + '/api/auth/google/callback';
    const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    target.searchParams.set('client_id', clientId);
    target.searchParams.set('redirect_uri', callback);
    target.searchParams.set('response_type', 'code');
    target.searchParams.set('scope', 'openid email profile');
    target.searchParams.set('state', state);
    target.searchParams.set('prompt', 'select_account');
    const response = NextResponse.redirect(target);
    response.cookies.set('nyumbafinder_google_state', state, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      path: '/api/auth/google/callback', maxAge: 600,
    });
    return response;
  }
  if (action === 'google/callback') {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const storedState = request.cookies.get('nyumbafinder_google_state')?.value;
    const fail = (reason: string) => clearGoogleState(NextResponse.redirect(new URL('/account?mode=login&error=' + encodeURIComponent(reason), baseUrl(request))));
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callback = baseUrl(request) + '/api/auth/google/callback';
    if (!code || !state || !storedState || state !== storedState || !clientId || !clientSecret) return fail('google_signin_failed');
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: callback, grant_type: 'authorization_code' }),
        cache: 'no-store',
      });
      const tokens = await tokenResponse.json();
      if (!tokenResponse.ok || typeof tokens.access_token !== 'string') return fail('google_signin_failed');
      const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: 'Bearer ' + tokens.access_token }, cache: 'no-store',
      });
      const profile = await profileResponse.json();
      if (!profileResponse.ok || !profile.sub || !profile.email || profile.email_verified !== true) return fail('google_email_unverified');
      const identity = await prisma.authIdentity.findUnique({
        where: { provider_providerAccountId: { provider: 'google', providerAccountId: String(profile.sub) } },
        include: { user: { select: { id: true, status: true } } },
      });
      let userId: string;
      if (identity) {
        if (identity.user.status !== 'ACTIVE') return fail('account_unavailable');
        userId = identity.userId;
      } else {
        const email = String(profile.email).trim().toLowerCase();
        const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (existing) return fail('use_existing_signin');
        const created = await prisma.user.create({
          data: {
            email, emailVerifiedAt: new Date(),
            profile: { create: {
              displayName: typeof profile.name === 'string' ? profile.name.slice(0, 100) : email.split('@')[0],
              firstName: typeof profile.given_name === 'string' ? profile.given_name.slice(0, 80) : null,
              lastName: typeof profile.family_name === 'string' ? profile.family_name.slice(0, 80) : null,
              avatarUrl: typeof profile.picture === 'string' ? profile.picture : null,
            } },
            authIdentities: { create: { provider: 'google', providerAccountId: String(profile.sub) } },
          },
          select: { id: true },
        });
        userId = created.id;
      }
      return clearGoogleState(setSession(NextResponse.redirect(new URL('/', baseUrl(request))), userId));
    } catch (error) {
      console.error('GOOGLE_SIGNIN_FAILED', error);
      return fail('google_signin_failed');
    }
  }
  return json('Unknown authentication action.', 404);
}
