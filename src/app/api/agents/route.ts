import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyAgentApplication } from "@/lib/agent-network";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  businessName: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  whatsapp: z.string().trim().max(30).optional().default(""),
  agentType: z.enum(["Independent agent", "Property manager", "Landlord", "Agency"]),
  coverageCounties: z.array(z.string().trim().min(2).max(100)).min(1).max(20),
  coverageTowns: z.array(z.string().trim().min(2).max(100)).max(30).default([]),
  coverageAreas: z.array(z.string().trim().min(2).max(100)).max(50).default([]),
  propertyTypes: z.array(z.string().trim().min(2).max(60)).min(1).max(10),
  minRent: z.coerce.number().min(0).max(100000000).optional().nullable(),
  maxRent: z.coerce.number().min(0).max(100000000).optional().nullable(),
  canVideoPreview: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional().default(""),
  consent: z.literal(true),
  website: z.string().max(0).optional().default(""),
}).refine((value) => value.minRent == null || value.maxRent == null || value.minRent <= value.maxRent, {
  message: "Minimum rent must not exceed maximum rent.",
  path: ["minRent"],
});

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || "Please check your details." }, { status: 400 });
    const data = parsed.data;
    if (data.website) return NextResponse.json({ message: "Application could not be submitted." }, { status: 400 });
    const email = data.email.toLowerCase();
    const existing = await prisma.agent.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ message: "An application with this email already exists. Contact our team if you need to update it." }, { status: 409 });
    const agent = await prisma.agent.create({
      data: {
        name: data.name,
        businessName: data.businessName || null,
        email,
        phone: data.phone,
        whatsapp: data.whatsapp || null,
        agentType: data.agentType,
        coverageCounties: data.coverageCounties,
        coverageTowns: data.coverageTowns,
        coverageAreas: data.coverageAreas,
        propertyTypes: data.propertyTypes,
        minRent: data.minRent ?? null,
        maxRent: data.maxRent ?? null,
        canVideoPreview: data.canVideoPreview,
        notes: data.notes || null,
        consent: data.consent,
      },
      select: { id: true, name: true, email: true, status: true },
    });
    await notifyAgentApplication(agent.name, agent.email);
    return NextResponse.json({ message: "Application received. We'll email you after review.", status: agent.status }, { status: 201 });
  } catch (error) {
    console.error("AGENT_APPLICATION_FAILED", error);
    return NextResponse.json({ message: "We couldn't submit your application just now. Please try again." }, { status: 500 });
  }
}
