import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

type NearbyPlace = { id: string; name: string; category: string; distanceKm: number; lat: number; lng: number; source: string };
type GeoapifyFeature = {
  properties?: {
    place_id?: string;
    name?: string;
    address_line1?: string;
    formatted?: string;
    lat?: number;
    lon?: number;
    distance?: number;
    categories?: string[];
  };
  geometry?: { coordinates?: [number, number] };
};

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function category(categories: string[] = []) {
  const values = categories.join(" ").toLowerCase();
  if (values.includes("education") || values.includes("childcare.kindergarten")) return "Schools";
  if (values.includes("healthcare") || values.includes("medical")) return "Healthcare";
  if (values.includes("commercial") || values.includes("building.marketplace")) return "Shopping";
  if (values.includes("sport") || values.includes("fitness")) return "Fitness";
  if (values.includes("leisure.park") || values.includes("leisure.playground") || values.includes("natural")) return "Parks";
  if (values.includes("public_transport") || values.includes("transport")) return "Transport";
  if (values.includes("catering") || values.includes("coffee") || values.includes("restaurant")) return "Food & drink";
  if (values.includes("service") || values.includes("finance") || values.includes("post")) return "Services";
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Math.max(250, Math.min(5000, Number(searchParams.get("radius")) || 5000));
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ message: "A valid property latitude and longitude are required." }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ message: "Nearby place service is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const params = new URLSearchParams({
    categories: "education,childcare,healthcare,commercial,sport,leisure,public_transport,catering,service",
    filter: `circle:${lng},${lat},${radius}`,
    bias: `proximity:${lng},${lat}`,
    limit: "500",
    lang: "en",
    apiKey,
  });

  try {
    const response = await fetch("https://api.geoapify.com/v2/places?" + params.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return NextResponse.json({ message: "Nearby place lookup failed." }, { status: 502, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
    }
    const payload = await response.json() as { features?: GeoapifyFeature[] };
    const seen = new Set<string>();
    const places = (payload.features || []).map((feature) => {
      const properties = feature.properties || {};
      const coordinates = feature.geometry?.coordinates;
      const pointLat = typeof properties.lat === "number" ? properties.lat : coordinates?.[1];
      const pointLng = typeof properties.lon === "number" ? properties.lon : coordinates?.[0];
      if (typeof pointLat !== "number" || typeof pointLng !== "number") return null;
      const group = category(properties.categories);
      if (!group) return null;
      const name = properties.name || properties.address_line1 || properties.formatted;
      if (!name) return null;
      const id = properties.place_id || group + ":" + name.toLowerCase() + ":" + pointLat.toFixed(5) + ":" + pointLng.toFixed(5);
      if (seen.has(id)) return null;
      seen.add(id);
      return { id, name, category: group, distanceKm: typeof properties.distance === "number" ? properties.distance / 1000 : distanceKm(lat, lng, pointLat, pointLng), lat: pointLat, lng: pointLng, source: "Geoapify" };
    }).filter((place): place is NearbyPlace => place !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 80);

    return NextResponse.json({ places, radiusMeters: radius, source: "Geoapify" }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ message: "Nearby place lookup failed." }, { status: 502, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
  }
}
