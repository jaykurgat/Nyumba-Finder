import { prisma } from '@/lib/prisma';
import { sendAuthEmail } from '@/lib/auth-email';
import { SUPERLANDLORD_EMAILS } from '@/lib/listing-access';

type ReportInput = { id: string; type: string; description: string | null; propertyId: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] as string);
}

function configuredAdminEmails() {
  return [...new Set([process.env.ADMIN_NOTIFICATION_EMAIL, process.env.ADMIN_EMAIL]
    .flatMap((value) => (value || '').split(/[;,]/))
    .map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

export async function notifyPropertyReport(report: ReportInput) {
  const [property, superlandlords] = await Promise.all([
    prisma.property.findUnique({
      where: { id: report.propertyId },
      select: { id: true, title: true, location: true, owner: { select: { id: true, email: true, status: true } } },
    }),
    prisma.user.findMany({
      where: { accessRole: 'SUPERLANDLORD', status: 'ACTIVE' },
      select: { id: true, email: true },
    }),
  ]);
  if (!property) return { inAppCreated: 0, emailSent: 0, emailFailed: 0, emailConfigured: false };

  const users = new Map<string, { id: string; email: string | null; role: 'LANDLORD' | 'SUPERLANDLORD' }>();
  if (property.owner?.status === 'ACTIVE') {
    users.set(property.owner.id, { ...property.owner, role: 'LANDLORD' });
  }
  for (const user of superlandlords) {
    users.set(user.id, { ...user, role: 'SUPERLANDLORD' });
  }

  const issueDetails = report.description?.trim();
  const summary = [
    'Listing: ' + property.title,
    'Location: ' + property.location,
    'Reported issue: ' + report.type,
    issueDetails ? 'Details: ' + issueDetails : '',
  ].filter(Boolean).join(' · ');

  let inAppCreated = 0;
  try {
    const notices = [
      ...[...users.values()].map((user) => ({
        reportId: report.id,
        recipientUserId: user.id,
        recipientKey: 'USER:' + user.id,
        recipientRole: user.role,
        title: user.role === 'LANDLORD' ? 'A listing you manage was reported' : 'A property report needs review',
        message: summary,
        href: '/my-listings',
      })),
      {
        reportId: report.id,
        recipientUserId: null,
        recipientKey: 'ADMIN',
        recipientRole: 'ADMIN',
        title: 'New property report needs review',
        message: summary,
        href: '/admin/reports',
      },
    ];
    const result = await prisma.propertyReportNotification.createMany({ data: notices, skipDuplicates: true });
    inAppCreated = result.count;
  } catch (error) {
    console.error('PROPERTY_REPORT_IN_APP_NOTIFICATION_FAILED', { reportId: report.id, error });
  }

  const emailTargets = new Map<string, { href: string; roles: Set<string> }>();
  const addEmail = (email: string | null | undefined, role: string, href: string) => {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) return;
    const existing = emailTargets.get(normalized) || { href, roles: new Set<string>() };
    existing.roles.add(role);
    if (role === 'platform administrator') existing.href = href;
    emailTargets.set(normalized, existing);
  };
  for (const user of users.values()) addEmail(user.email, user.role === 'LANDLORD' ? 'listing owner' : 'Superlandlord', '/my-listings');
  for (const email of SUPERLANDLORD_EMAILS) addEmail(email, 'Superlandlord', '/my-listings');
  for (const email of configuredAdminEmails()) addEmail(email, 'platform administrator', '/admin/reports');

  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  if (!emailConfigured) {
    console.error('PROPERTY_REPORT_EMAIL_NOT_CONFIGURED', { reportId: report.id, recipients: emailTargets.size });
    return { inAppCreated, emailSent: 0, emailFailed: emailTargets.size, emailConfigured: false };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nyumba-finder.com').replace(/\/$/, '');
  const results = await Promise.all([...emailTargets.entries()].map(async ([email, target]) => {
    const href = baseUrl + target.href;
    const roles = [...target.roles].join(', ');
    const text = [
      'A NyumbaFinder property report needs your attention.',
      '',
      summary.replaceAll(' · ', '\n'),
      '',
      'You are receiving this because you are a ' + roles + ' on NyumbaFinder.',
      'Review: ' + href,
      '',
      'The reporter’s identity is not shared.',
      'NyumbaFinder',
    ].join('\n');
    const html = '<div style="font-family:Arial,sans-serif;line-height:1.65;color:#26372d">' +
      '<h2 style="margin:0 0 16px">A property report needs your attention</h2>' +
      '<p style="margin:0 0 8px"><strong>Listing:</strong> ' + escapeHtml(property.title) + '</p>' +
      '<p style="margin:0 0 8px"><strong>Location:</strong> ' + escapeHtml(property.location) + '</p>' +
      '<p style="margin:0 0 8px"><strong>Reported issue:</strong> ' + escapeHtml(report.type) + '</p>' +
      (issueDetails ? '<p style="margin:0 0 8px"><strong>Details:</strong> ' + escapeHtml(issueDetails) + '</p>' : '') +
      '<p style="margin:16px 0">You are receiving this because you are a ' + escapeHtml(roles) + ' on NyumbaFinder. The reporter’s identity is not shared.</p>' +
      '<p><a href="' + escapeHtml(href) + '" style="display:inline-block;background:#244c2c;color:#fff;padding:11px 16px;text-decoration:none">Review report</a></p>' +
      '<p style="color:#71806f;font-size:12px">NyumbaFinder</p></div>';
    try {
      await sendAuthEmail({ to: email, subject: 'Listing report: ' + property.title, html, text });
      return true;
    } catch (error) {
      console.error('PROPERTY_REPORT_EMAIL_FAILED', { reportId: report.id, error });
      return false;
    }
  }));

  return {
    inAppCreated,
    emailSent: results.filter(Boolean).length,
    emailFailed: results.filter((sent) => !sent).length,
    emailConfigured: true,
  };
}

