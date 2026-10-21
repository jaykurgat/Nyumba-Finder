import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
const KEY = "manual_map_amenities_v1";
const CATEGORIES = ["Shopping", "Schools", "Healthcare", "Fitness", "Parks", "Transport", "Food & drink", "Services"] as const;
type Amenity = { id: string; name: string; category: string; address: string; lat: number; lng: number; createdAt: string };
async function readAmenities(): Promise<Amenity[]> {
 const row = await prisma.siteSetting.findUnique({ where: { key: KEY }, select: { value: true } });
 if (!row) return [];
 try { const parsed = JSON.parse(row.value); return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.lat === "number" && typeof item.lng === "number") : []; } catch { return []; }
}
export async function GET() {
 try { await requireAdmin(); return NextResponse.json({ amenities: await readAmenities(), categories: CATEGORIES }); }
 catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED_ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 }); return NextResponse.json({ message: "Unable to load map amenities." }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
 try {
  await requireAdmin(); const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const category = typeof body.category === "string" ? body.category : "";
  const address = typeof body.address === "string" ? body.address.trim().slice(0, 200) : "";
  const lat = Number(body.lat), lng = Number(body.lng);
  if (!name) return NextResponse.json({ message: "Enter a place name." }, { status: 400 });
  if (!CATEGORIES.includes(category as typeof CATEGORIES[number])) return NextResponse.json({ message: "Choose a valid category." }, { status: 400 });
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return NextResponse.json({ message: "Choose a valid point on the map." }, { status: 400 });
  const amenities = await readAmenities();
  const item: Amenity = { id: randomUUID(), name, category, address, lat, lng, createdAt: new Date().toISOString() };
  amenities.push(item);
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: JSON.stringify(amenities) }, update: { value: JSON.stringify(amenities) } });
  await prisma.auditLog.create({ data: { action: "MAP_AMENITY_CREATED", entityType: "MapAmenity", entityId: item.id, details: { name, category, lat, lng } } }).catch(() => undefined);
  return NextResponse.json({ amenity: item, message: "Place added to the map." }, { status: 201 });
 } catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED_ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 }); return NextResponse.json({ message: "Unable to save this place." }, { status: 500 }); }
}
export async function DELETE(request: NextRequest) {
 try {
  await requireAdmin(); const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Place ID is required." }, { status: 400 });
  const amenities = await readAmenities(), next = amenities.filter((item) => item.id !== id);
  if (next.length === amenities.length) return NextResponse.json({ message: "Place not found." }, { status: 404 });
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: JSON.stringify(next) }, update: { value: JSON.stringify(next) } });
  await prisma.auditLog.create({ data: { action: "MAP_AMENITY_DELETED", entityType: "MapAmenity", entityId: id } }).catch(() => undefined);
  return NextResponse.json({ amenities: next, message: "Place removed from the map." });
 } catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED_ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 }); return NextResponse.json({ message: "Unable to remove this place." }, { status: 500 }); }
}
