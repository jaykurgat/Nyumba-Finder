import { prisma } from "@/lib/prisma";

export type EmailTemplate = {
  key: string;
  name: string;
  description: string;
  subject: string;
  preheader: string;
  headline: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
};
export type EmailStudioState = { drafts: EmailTemplate[]; published: EmailTemplate[]; publishedAt: string | null };
const SETTING_KEY = "email_studio_v1";

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  { key: "house_request_client", name: "House Hunt — customer confirmation", description: "Sent to a renter after submitting a House Hunt request.", subject: "Your house search is in motion · {{reference}}", preheader: "We've received your preferences and will be in touch about next steps.", headline: "Your search starts here.", body: "Hi {{name}},\n\nThank you for sharing what you are looking for. Your House Hunt request {{reference}} has been received. Our team will review your preferences and contact you about next steps.\n\nYour search: {{propertyType}} · {{bedrooms}} bedroom(s)\nPreferred locations: {{locations}}\nBudget: {{budget}}\nMove-in: {{moveIn}}\n\nProperty availability is confirmed before any viewing. We look forward to helping you find a place that feels right.", buttonLabel: "Explore homes", buttonUrl: "https://www.nyumba-finder.com/find-a-house" },
  { key: "house_request_admin", name: "House Hunt — admin alert", description: "Sent to the admin team when a new House Hunt request arrives.", subject: "New House Hunt request · {{reference}}", preheader: "A new renter request is ready for review.", headline: "A new request needs your attention.", body: "A new House Hunt request has been submitted.\n\nReference: {{reference}}\nName: {{name}}\nPhone: {{phone}}\nEmail: {{email}}\nProperty: {{propertyType}} · {{bedrooms}} bedroom(s)\nLocations: {{locations}}\nBudget: {{budget}}\nMove-in: {{moveIn}}\nMust-haves: {{mustHaves}}\nNotes: {{notes}}", buttonLabel: "Review requests", buttonUrl: "https://www.nyumba-finder.com/admin/house-requests" },
];

function mergeTemplates(saved: unknown): EmailTemplate[] {
  const existing = Array.isArray(saved) ? saved.filter((item): item is EmailTemplate => Boolean(item && typeof item === "object" && typeof (item as EmailTemplate).key === "string")) : [];
  const byKey = new Map(existing.map((item) => [item.key, item]));
  return DEFAULT_TEMPLATES.map((template) => byKey.get(template.key) || template);
}

export async function getEmailStudioState(): Promise<EmailStudioState> {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY }, select: { value: true } });
  if (!row) return { drafts: DEFAULT_TEMPLATES, published: DEFAULT_TEMPLATES, publishedAt: null };
  try {
    const parsed = JSON.parse(row.value) as Partial<EmailStudioState>;
    return {
      drafts: mergeTemplates(parsed.drafts),
      published: mergeTemplates(parsed.published),
      publishedAt: typeof parsed.publishedAt === "string" ? parsed.publishedAt : null,
    };
  } catch { return { drafts: DEFAULT_TEMPLATES, published: DEFAULT_TEMPLATES, publishedAt: null }; }
}
export async function saveEmailStudioState(state: EmailStudioState) {
  await prisma.siteSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: JSON.stringify(state) },
    update: { value: JSON.stringify(state) },
  });
}
export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}
export function fillEmailTemplate(template: EmailTemplate, variables: Record<string, string>) {
  const fill = (input: string) => input.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, (_, key: string) => variables[key] ?? "");
  return { ...template, subject: fill(template.subject), preheader: fill(template.preheader), headline: fill(template.headline), body: fill(template.body), buttonLabel: fill(template.buttonLabel), buttonUrl: fill(template.buttonUrl) };
}
export function renderPremiumEmail(template: EmailTemplate, variables: Record<string, string> = {}) {
  const t = fillEmailTemplate(template, variables);
  const safeUrl = /^https:\/\//i.test(t.buttonUrl) ? t.buttonUrl : "https://www.nyumba-finder.com/find-a-house";
  const paragraphs = t.body.split(/\n\s*\n/).map((p) => '<p style="margin:0 0 18px;color:#46534b;font-size:15px;line-height:1.8;white-space:pre-line">' + escapeEmailHtml(p) + "</p>").join("");
  const html = '<!doctype html><html><body style="margin:0;background:#f4f3ed;font-family:Arial,Helvetica,sans-serif;color:#1f3026"><div style="display:none;max-height:0;overflow:hidden;opacity:0">' + escapeEmailHtml(t.preheader) + '</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f3ed;padding:32px 12px"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:18px;overflow:hidden"><tr><td style="background:#233d30;padding:26px 34px"><div style="font-size:20px;font-weight:700;letter-spacing:-.4px;color:#fff">Nyumba<span style="color:#d8c58a">Finder</span></div><div style="margin-top:6px;color:#d9e2dc;font-size:11px;letter-spacing:1.8px;text-transform:uppercase">Find a place to call home</div></td></tr><tr><td style="padding:36px 34px 16px"><div style="font-size:11px;color:#8a7844;letter-spacing:1.7px;text-transform:uppercase;font-weight:700;margin-bottom:14px">A note from NyumbaFinder</div><h1 style="font-size:28px;line-height:1.25;letter-spacing:-.8px;margin:0 0 24px;color:#233d30">' + escapeEmailHtml(t.headline) + "</h1>" + paragraphs + '<p style="margin:28px 0 8px"><a href="' + escapeEmailHtml(safeUrl) + '" style="display:inline-block;background:#2e6048;color:#fff;text-decoration:none;padding:14px 21px;border-radius:8px;font-weight:700;font-size:14px">' + escapeEmailHtml(t.buttonLabel) + '</a></p></td></tr><tr><td style="padding:20px 34px 30px;border-top:1px solid #e8e9e2"><p style="font-size:12px;line-height:1.7;color:#7b847d;margin:0">NyumbaFinder · Helping you find the right place in Kenya.</p><p style="font-size:11px;color:#9aa19b;margin:8px 0 0">This is an operational email about your NyumbaFinder activity.</p></td></tr></table><div style="font-size:11px;color:#9aa19b;padding:18px">Thoughtfully finding home.</div></td></tr></table></body></html>';
  return { subject: t.subject, html, text: [t.headline, "", t.body, "", t.buttonLabel + ": " + safeUrl, "", "NyumbaFinder · Helping you find the right place in Kenya."].join("\n") };
}
