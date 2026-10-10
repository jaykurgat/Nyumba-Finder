import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { notifyAgentStatus } from "@/lib/agent-network";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const agents = await prisma.agent.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { notifications: true } } },
    });
    return NextResponse.json({ agents });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message === "UNAUTHORIZED_ADMIN" ? "Please sign in as an admin." : "Unable to load agents." }, { status: error instanceof Error && error.message === "UNAUTHORIZED_ADMIN" ? 401 : 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const parsed = z.object({
      id: z.string().uuid(),
      status: z.enum(["APPROVED", "REJECTED", "SUSPENDED", "PENDING"]),
    }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "Invalid agent update." }, { status: 400 });
    const agent = await prisma.agent.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
      select: { id: true, name: true, email: true, status: true },
    });
    await prisma.auditLog.create({
      data: { action: "AGENT_STATUS_" + agent.status, entityType: "Agent", entityId: agent.id, details: { email: agent.email } },
    }).catch((error) => console.error("AGENT_AUDIT_LOG_FAILED", error));
    await notifyAgentStatus(agent.email, agent.name, agent.status);
    return NextResponse.json({ agent, message: "Agent status updated." });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED_ADMIN";
    return NextResponse.json({ message: unauthorized ? "Please sign in as an admin." : "Unable to update agent." }, { status: unauthorized ? 401 : 500 });
  }
}
