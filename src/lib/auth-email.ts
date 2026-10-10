type AuthEmail = { to: string; subject: string; html: string; text: string };

/**
 * Sends account/security emails through Resend. Throws when delivery is not
 * accepted so callers can report and log delivery failures instead of silently
 * pretending an email was sent.
 */
export async function sendAuthEmail({ to, subject, html, text }: AuthEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('Configure RESEND_API_KEY and RESEND_FROM_EMAIL.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error('Resend rejected email (' + response.status + '): ' + detail.slice(0, 500));
  }
}
