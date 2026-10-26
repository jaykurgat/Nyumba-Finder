import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function contactInput(body: Record<string, unknown>) {
  return {
    companyName: clean(body.companyName, 160),
    contactName: clean(body.contactName, 120) || null,
    role: clean(body.role, 120) || null,
    phone: clean(body.phone, 50) || null,
    whatsapp: clean(body.whatsapp, 50) || null,
    email: clean(body.email, 254).toLowerCase() || null,
    website: clean(body.website, 300) || null,
    notes: clean(body.notes, 3000),
  };
}
function unauthorized(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHORIZED_ADMIN";
}

export async function GET() {
  try {
    await requireAdmin();
    const contacts = await prisma.partnerContact.findMany({
      include: { _count: { select: { properties: true } } },
      orderBy: [{ companyName: "asc" }, { contactName: "asc" }],
    });
    return NextResponse.json({ contacts: contacts.map(({ _count, ...contact }) => ({ ...contact, propertyCount: _count.properties })) });
  } catch (error) {
    if (unauthorized(error)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    console.error("ADMIN_PARTNER_CONTACTS_GET", error);
    return NextResponse.json({ message: "Unable to load partner contacts." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const data = contactInput(body);
    if (!data.companyName) return NextResponse.json({ message: "Company name is required." }, { status: 400 });
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
    const contact = await prisma.partnerContact.create({ data });
    await prisma.auditLog.create({ data: { action: "PARTNER_CONTACT_CREATED", entityType: "PartnerContact", entityId: contact.id, details: { companyName: contact.companyName } } }).catch(() => undefined);
    return NextResponse.json({ contact, message: "Partner contact saved." }, { status: 201 });
  } catch (error) {
    if (unauthorized(error)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    console.error("ADMIN_PARTNER_CONTACTS_POST", error);
    return NextResponse.json({ message: "Unable to save partner contact." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const id = clean(body.id, 64);
    const data = contactInput(body);
    if (!id || !data.companyName) return NextResponse.json({ message: "Contact ID and company name are required." }, { status: 400 });
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
    const contact = await prisma.partnerContact.update({ where: { id }, data });
    await prisma.auditLog.create({ data: { action: "PARTNER_CONTACT_UPDATED", entityType: "PartnerContact", entityId: id, details: { companyName: contact.companyName } } }).catch(() => undefined);
    return NextResponse.json({ contact, message: "Partner contact updated." });
  } catch (error: any) {
    if (unauthorized(error)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (error?.code === "P2025") return NextResponse.json({ message: "Partner contact not found." }, { status: 404 });
    console.error("ADMIN_PARTNER_CONTACTS_PATCH", error);
    return NextResponse.json({ message: "Unable to update partner contact." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Contact ID is required." }, { status: 400 });
    const contact = await prisma.partnerContact.findUnique({ where: { id }, select: { id: true, companyName: true } });
    if (!contact) return NextResponse.json({ message: "Partner contact not found." }, { status: 404 });
    await prisma.partnerContact.delete({ where: { id } });
    await prisma.auditLog.create({ data: { action: "PARTNER_CONTACT_DELETED", entityType: "PartnerContact", entityId: id, details: { companyName: contact.companyName } } }).catch(() => undefined);
    return NextResponse.json({ message: "Partner contact deleted. Associated properties were kept." });
  } catch (error) {
    if (unauthorized(error)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    console.error("ADMIN_PARTNER_CONTACTS_DELETE", error);
    return NextResponse.json({ message: "Unable to delete partner contact." }, { status: 500 });
  }
}
