import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getMatchingAgents, sendNetworkEmail } from "@/lib/agent-network";

export const runtime = "nodejs";

function rent(value: number | null | undefined) {
  return value == null ? "Not specified" : "KSh " + Math.round(value).toLocaleString("en-KE");
}

export async function GET() {
  try {
    await requireAdmin();
    const requests = await prisma.houseRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        agentNotifications: {
          include: { agent: { select: { id: true, name: true, email: true, phone: true, businessName: true } } },
          orderBy: { sentAt: "desc" },
        },
      },
    });
    return NextResponse.json({ requests });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED_ADMIN";
    return NextResponse.json({ message: unauthorized ? "Please sign in as an admin." : "Unable to load House Hunt requests." }, { status: unauthorized ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const parsed = z.object({
      requestId: z.string().uuid().optional(),
      notificationId: z.string().uuid().optional(),
      action: z.enum(["notify-matching-agents", "update-notification"]),
      status: z.enum(["RESPONDED", "UNAVAILABLE"]).optional(),
      responseNote: z.string().trim().max(500).optional(),
    }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "Invalid notification request." }, { status: 400 });
    if (parsed.data.action === "update-notification") {
      if (!parsed.data.notificationId || !parsed.data.status) return NextResponse.json({ message: "Choose a response status." }, { status: 400 });
      const updated = await prisma.agentRequestNotification.update({
        where: { id: parsed.data.notificationId },
        data: { status: parsed.data.status, respondedAt: new Date(), responseNote: parsed.data.responseNote || null },
      });
      await prisma.auditLog.create({ data: { action: "AGENT_REQUEST_" + updated.status, entityType: "AgentRequestNotification", entityId: updated.id } }).catch((error) => console.error("AGENT_RESPONSE_AUDIT_FAILED", error));
      return NextResponse.json({ message: "Agent response recorded." });
    }
    if (!parsed.data.requestId) return NextResponse.json({ message: "House Hunt request is required." }, { status: 400 });
    const houseRequest = await prisma.houseRequest.findUnique({ where: { id: parsed.data.requestId } });
    if (!houseRequest) return NextResponse.json({ message: "House Hunt request not found." }, { status: 404 });
    if (!houseRequest.agentSharingConsent) return NextResponse.json({ message: "This renter has not consented to sharing their contact details with matching agents. Ask the renter to update their consent before notifying agents." }, { status: 409 });

    const matches = await getMatchingAgents(houseRequest.id);
    const alreadyNotified = await prisma.agentRequestNotification.findMany({
      where: { houseRequestId: houseRequest.id },
      select: { agentId: true },
    });
    const alreadyIds = new Set(alreadyNotified.map((item) => item.agentId));
    const targets = matches.filter((agent) => !alreadyIds.has(agent.id));
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.nyumba-finder.com").replace(/\/$/, "");
    const locations = Array.isArray(houseRequest.preferredLocations)
      ? (houseRequest.preferredLocations as Array<{ label?: string; name?: string }>).map((item) => item.label || item.name || "").filter(Boolean).join(" · ")
      : "";
    const locationText = locations || [houseRequest.townName, houseRequest.countyName, ...houseRequest.preferredAreas].filter(Boolean).join(" · ");
    const budget = (houseRequest.minRent != null ? rent(houseRequest.minRent) + " – " : "Up to ") + rent(houseRequest.maxRent) + " per month";
    const contact = [
      "Name: " + houseRequest.name,
      "Phone / WhatsApp: " + houseRequest.phone,
      "Email: " + (houseRequest.email || "Not provided"),
      "Preferred contact: " + houseRequest.contactPreference,
    ].join("\n");
    const details = [
      "A renter's House Hunt request matches your approved NyumbaFinder coverage.",
      "Request reference: " + houseRequest.reference,
      "Location: " + locationText,
      "Property: " + houseRequest.propertyType + (houseRequest.bedrooms > 0 ? " · " + houseRequest.bedrooms + " bedroom(s)" : ""),
      "Budget: " + budget,
      "Move-in: " + houseRequest.moveIn,
      "Must-haves: " + (houseRequest.mustHaves.join(", ") || "Not specified"),
      "Notes: " + (houseRequest.notes || "None"),
      "",
      "Renter contact details (shared with their consent):",
      contact,
      "",
      "Please confirm availability and accuracy before arranging a viewing. Do not request payment from the renter on behalf of NyumbaFinder.",
      "NyumbaFinder: " + siteUrl,
    ].join("\n");

    const results = await Promise.all(targets.map(async (agent) => {
      const email = await sendNetworkEmail(agent.email, "Matching House Hunt request · " + houseRequest.reference, "Hi " + agent.name + ",\n\n" + details);
      if (!email.sent) return { agentId: agent.id, sent: false };
      await prisma.agentRequestNotification.create({
        data: { agentId: agent.id, houseRequestId: houseRequest.id, status: "NOTIFIED" },
      });
      return { agentId: agent.id, sent: true };
    }));
    const sentCount = results.filter((item) => item.sent).length;
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
    if (sentCount > 0 && houseRequest.email) {
      await sendNetworkEmail(
        houseRequest.email,
        "NyumbaFinder has contacted matching local agents · " + houseRequest.reference,
        "Hi " + houseRequest.name + ",\n\nWe've contacted " + sentCount + " approved agent" + (sentCount === 1 ? "" : "s") + " whose coverage matches your House Hunt request. An agent may contact you to confirm availability. Please verify property details and availability before making any payment.\n\nRequest: " + houseRequest.reference + "\nPreferred location: " + locationText + "\nBudget: " + budget + "\n\nNyumbaFinder",
      );
    }
    if (adminEmail) {
      await sendNetworkEmail(adminEmail, "Agent notifications sent · " + houseRequest.reference, "Request: " + houseRequest.reference + "\nMatching approved agents: " + matches.length + "\nNew notifications sent: " + sentCount + "\nAlready notified: " + alreadyIds.size + "\nEmail failures: " + (targets.length - sentCount));
    }
    await prisma.auditLog.create({
      data: { action: "HOUSE_REQUEST_AGENTS_NOTIFIED", entityType: "HouseRequest", entityId: houseRequest.id, details: { reference: houseRequest.reference, matchingAgents: matches.length, sentCount } },
    }).catch((error) => console.error("AGENT_NOTIFICATION_AUDIT_FAILED", error));
    return NextResponse.json({
      message: sentCount ? "Notifications sent to " + sentCount + " matching agent" + (sentCount === 1 ? "." : "s.") : matches.length ? "No new notifications were sent. Check email configuration or previous notifications." : "No approved agents match this request's location, property type and budget.",
      matchingCount: matches.length,
      sentCount,
      alreadyNotifiedCount: alreadyIds.size,
      failedCount: targets.length - sentCount,
    });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED_ADMIN";
    console.error("HOUSE_REQUEST_AGENT_NOTIFY_FAILED", error);
    return NextResponse.json({ message: unauthorized ? "Please sign in as an admin." : "Unable to notify matching agents." }, { status: unauthorized ? 401 : 500 });
  }
}
