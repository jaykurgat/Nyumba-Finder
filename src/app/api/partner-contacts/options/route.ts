import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { isAdminSession } from "@/lib/admin-auth";

const PARTNER_ACCESS_USER_IDS = new Set([
  "5eef6f49-0836-44a5-bac4-c955b217cc3f",
  "7e448ea8-9424-453b-b912-a55cebbf9441",
]);

export async function GET() {
  try {
    const user = await getCurrentUser();
    const admin = await isAdminSession();
    if (!admin && (!user || !PARTNER_ACCESS_USER_IDS.has(user.id))) {
      return NextResponse.json({ contacts: [] }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
    }

    const contacts = await prisma.partnerContact.findMany({
      select: { id: true, companyName: true, contactName: true, phone: true, whatsapp: true, email: true },
      orderBy: [{ companyName: "asc" }, { contactName: "asc" }],
    });
    return NextResponse.json({ contacts }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("PARTNER_CONTACT_OPTIONS_GET", error);
    return NextResponse.json({ message: "Unable to load partner contacts." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
