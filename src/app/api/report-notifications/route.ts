import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { isAdminSession } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { hasValidRequestOrigin } from '@/lib/security';

async function recipientFilter() {
  const [user, admin] = await Promise.all([getCurrentUser(), isAdminSession()]);
  const OR = [
    ...(user ? [{ recipientUserId: user.id }] : []),
    ...(admin ? [{ recipientKey: 'ADMIN' }] : []),
  ];
  return OR.length ? OR : null;
}

export async function GET() {
  try {
    const OR = await recipientFilter();
    if (!OR) return NextResponse.json({ message: 'Sign in to view notifications.' }, { status: 401 });
    const notifications = await prisma.propertyReportNotification.findMany({
      where: { OR },
      select: { id: true, title: true, message: true, href: true, readAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((item) => !item.readAt).length,
    }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch (error) {
    console.error('REPORT_NOTIFICATIONS_LOAD_FAILED', error);
    return NextResponse.json({ message: 'Unable to load notifications.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!hasValidRequestOrigin(request)) return NextResponse.json({ message: 'Invalid request origin.' }, { status: 403 });
    const OR = await recipientFilter();
    if (!OR) return NextResponse.json({ message: 'Sign in to update notifications.' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    const where = { OR, readAt: null as Date | null, ...(id ? { id } : {}) };
    if (!id && body.all !== true) return NextResponse.json({ message: 'Choose a notification to update.' }, { status: 400 });
    const result = await prisma.propertyReportNotification.updateMany({
      where,
      data: { readAt: new Date() },
    });
    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('REPORT_NOTIFICATION_UPDATE_FAILED', error);
    return NextResponse.json({ message: 'Unable to update notification.' }, { status: 500 });
  }
}

