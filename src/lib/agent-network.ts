import { prisma } from "@/lib/prisma";

export function normalizeAgentMatch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

export function escapeAgentHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] as string);
}

export async function sendNetworkEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { configured: false, sent: false };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: "<div style=\"font-family:Arial,sans-serif;line-height:1.65;color:#263326;white-space:pre-line\">" + escapeAgentHtml(text) + "</div>",
      }),
    });
    if (!response.ok) {
      console.error("AGENT_NETWORK_EMAIL_FAILED", response.status, (await response.text().catch(() => "")).slice(0, 300));
      return { configured: true, sent: false };
    }
    return { configured: true, sent: true };
  } catch (error) {
    console.error("AGENT_NETWORK_EMAIL_ERROR", error);
    return { configured: true, sent: false };
  }
}

export async function notifyAgentApplication(name: string, email: string) {
  const admin = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
  const tasks = [
    sendNetworkEmail(email, "We received your NyumbaFinder agent application", "Hi " + name + ",\n\nThank you for applying to join the NyumbaFinder Agent Network. Your application is pending review. We will email you when its status changes.\n\nNyumbaFinder"),
  ];
  if (admin) tasks.push(sendNetworkEmail(admin, "New NyumbaFinder agent application", "A new agent application needs review.\n\nName: " + name + "\nEmail: " + email + "\n\nReview applications: " + (process.env.NEXT_PUBLIC_SITE_URL || "https://www.nyumba-finder.com") + "/admin/agents"));
  await Promise.all(tasks);
}

export async function notifyAgentStatus(email: string, name: string, status: string) {
  const message = status === "APPROVED"
    ? "Your NyumbaFinder Agent Network application has been approved. You may now receive relevant House Hunt enquiries for your coverage areas."
    : status === "REJECTED"
      ? "Thank you for applying to the NyumbaFinder Agent Network. We are unable to approve your application at this time."
      : status === "SUSPENDED"
        ? "Your NyumbaFinder Agent Network profile has been paused. Please contact NyumbaFinder if you believe this is a mistake."
        : "Your NyumbaFinder Agent Network application status has been updated to " + status.toLowerCase() + ".";
  await sendNetworkEmail(email, "NyumbaFinder agent application update", "Hi " + name + ",\n\n" + message + "\n\nNyumbaFinder");
}

export async function getMatchingAgents(requestId: string) {
  const request = await prisma.houseRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  const locations = Array.isArray(request.preferredLocations) ? request.preferredLocations as Array<{ name?: string; label?: string; countyName?: string; townName?: string; areaName?: string }> : [];
  const counties = [request.countyName, ...locations.map((item) => item.countyName || "")].filter(Boolean).map(normalizeAgentMatch);
  const towns = [request.townName || "", ...locations.map((item) => item.townName || "")].filter(Boolean).map(normalizeAgentMatch);
  const areas = [...request.preferredAreas, ...locations.flatMap((item) => [item.name || "", item.label || "", item.areaName || ""])].filter(Boolean).map(normalizeAgentMatch);
  const agents = await prisma.agent.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "asc" } });
  return agents.filter((agent) => {
    const countyMatch = agent.coverageCounties.some((item) => counties.includes(normalizeAgentMatch(item)));
    const townMatch = agent.coverageTowns.some((item) => towns.includes(normalizeAgentMatch(item)));
    const areaMatch = agent.coverageAreas.some((item) => areas.some((term) => term.includes(normalizeAgentMatch(item)) || normalizeAgentMatch(item).includes(term)));
    const locationMatch = countyMatch || townMatch || areaMatch;
    const typeMatch = agent.propertyTypes.length === 0 || agent.propertyTypes.includes("Any type") || agent.propertyTypes.includes(request.propertyType);
    const rentMatch = (agent.minRent == null || agent.minRent <= request.maxRent) && (agent.maxRent == null || agent.maxRent >= (request.minRent ?? 0));
    return locationMatch && typeMatch && rentMatch;
  });
}
