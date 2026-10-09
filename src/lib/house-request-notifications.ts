type HouseRequestNotice = {
  reference: string;
  name: string;
  phone: string;
  email?: string | null;
  contactPreference: string;
  propertyType: string;
  bedrooms: number;
  countyName: string;
  townName?: string | null;
  preferredAreas: string[];
  minRent?: number | null;
  maxRent: number;
  moveIn: string;
  mustHaves: string[];
  notes?: string | null;
  matchesCount: number;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] as string);
}

function formatRent(value: number) {
  return "KSh " + Math.round(value).toLocaleString("en-KE");
}

function summary(request: HouseRequestNotice) {
  return [
    "Request: " + request.reference,
    "Name: " + request.name,
    "Phone: " + request.phone,
    "Email: " + (request.email || "Not provided"),
    "House: " + request.propertyType + (request.bedrooms > 0 ? " · " + request.bedrooms + " bedroom(s)" : ""),
    "Location: " + [request.countyName, request.townName, request.preferredAreas.join(", ")].filter(Boolean).join(" · "),
    "Budget: " + (request.minRent ? formatRent(request.minRent) + "–" : "Up to ") + formatRent(request.maxRent) + " per month",
    "Move-in: " + request.moveIn,
    "Must-haves: " + (request.mustHaves.join(", ") || "Not specified"),
    "Notes: " + (request.notes || "None"),
    "Instant matches: " + request.matchesCount,
  ].join("\n");
}

async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { configured: false, sent: false };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html: "<div style=\"font-family:Arial,sans-serif;white-space:pre-line;line-height:1.65;color:#253126\">" + escapeHtml(text) + "</div>",
    }),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    console.error("HOUSE_REQUEST_EMAIL_FAILED", response.status, message.slice(0, 500));
    return { configured: true, sent: false };
  }
  return { configured: true, sent: true };
}

async function sendWhatsApp(to: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId || !to) return { configured: false, sent: false };
  const response = await fetch("https://graph.facebook.com/v21.0/" + encodeURIComponent(phoneNumberId) + "/messages", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/[^\d]/g, ""),
      type: "text",
      text: { preview_url: false, body: text.slice(0, 4000) },
    }),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    console.error("HOUSE_REQUEST_WHATSAPP_FAILED", response.status, message.slice(0, 500));
    return { configured: true, sent: false };
  }
  return { configured: true, sent: true };
}

export async function notifyHouseRequest(request: HouseRequestNotice) {
  const details = summary(request);
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminWhatsApp = process.env.WHATSAPP_ADMIN_PHONE;
  const emailTasks: Promise<{ configured: boolean; sent: boolean }>[] = [];
  if (adminEmail) {
    emailTasks.push(sendEmail(adminEmail, "New house-finding request · " + request.reference, details));
  }
  if (request.email) {
    emailTasks.push(sendEmail(
      request.email,
      "We've received your NyumbaFinder house request · " + request.reference,
      "Hi " + request.name + ",\n\nThank you for telling NyumbaFinder what you're looking for. Your request has been received.\n\n" +
      details + "\n\nYou can browse your suggested matches on the confirmation page. Our team can follow up using your selected contact method. We cannot guarantee listing availability until it is confirmed.\n\nNyumbaFinder",
    ));
  }
  const whatsappTask = adminWhatsApp ? sendWhatsApp(adminWhatsApp, "New NyumbaFinder house request\n\n" + details) : Promise.resolve({ configured: false, sent: false });
  const [emailResults, whatsappResult] = await Promise.all([
    Promise.all(emailTasks.map((task) => task.catch(() => ({ configured: true, sent: false })))),
    whatsappTask.catch(() => ({ configured: true, sent: false })),
  ]);
  return {
    adminEmailSent: Boolean(adminEmail && emailResults[0]?.sent),
    clientEmailSent: Boolean(request.email && emailResults[adminEmail ? 1 : 0]?.sent),
    whatsappAdminSent: whatsappResult.sent,
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    whatsappConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && adminWhatsApp),
  };
}
