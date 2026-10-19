import { NextRequest, NextResponse } from "next/server";

type OSMElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function category(tags: Record<string, string>) {
  if (tags.amenity === "school" || tags.amenity === "kindergarten" || tags.amenity === "college" || tags.amenity === "university") return "Schools";
  if (["hospital", "clinic", "doctors", "pharmacy", "dentist"].includes(tags.amenity || "")) return "Healthcare";
  if (tags.shop === "supermarket" || tags.shop === "convenience" || tags.amenity === "marketplace") return "Shopping";
  if (tags.leisure === "fitness_centre" || tags.amenity === "gym" || tags.sport === "fitness") return "Fitness";
  if (tags.leisure === "park" || tags.leisure === "garden") return "Parks";
  if (["bus_station", "bus_stop", "taxi"].includes(tags.amenity || "") || tags.public_transport) return "Transport";
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Math.max(250, Math.min(5000, Number(searchParams.get("radius")) || 2000));

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ message: "A valid property latitude and longitude are required." }, { status: 400 });
  }

  const query = `[out:json][timeout:15];(node(around:${radius},${lat},${lng})[amenity~"^(school|kindergarten|college|university|hospital|clinic|doctors|pharmacy|dentist|gym|marketplace|bus_station|bus_stop|taxi)$"];way(around:${radius},${lat},${lng})[amenity~"^(school|kindergarten|college|university|hospital|clinic|doctors|pharmacy|dentist|gym|marketplace|bus_station|taxi)$"];relation(around:${radius},${lat},${lng})[amenity~"^(school|kindergarten|college|university|hospital|clinic|doctors|pharmacy|dentist|gym|marketplace)$"];node(around:${radius},${lat},${lng})[shop~"^(supermarket|convenience)$"];way(around:${radius},${lat},${lng})[shop~"^(supermarket|convenience)$"];node(around:${radius},${lat},${lng})[leisure~"^(fitness_centre|park|garden)$"];way(around:${radius},${lat},${lng})[leisure~"^(fitness_centre|park|garden)$"];node(around:${radius},${lat},${lng})[public_transport];);out center tags;`;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": "NyumbaFinder/1.0 (nearby places lookup)" },
      body: "data=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(18000),
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return NextResponse.json({ message: "Nearby place data is temporarily unavailable." }, { status: 502, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
    }
    const payload = await response.json() as { elements?: OSMElement[] };
    const seen = new Set<string>();
    const places = (payload.elements || []).map((element) => {
      const tags = element.tags || {};
      const point = element.lat != null && element.lon != null ? { lat: element.lat, lng: element.lon } : element.center ? { lat: element.center.lat, lng: element.center.lon } : null;
      if (!point) return null;
      const group = category(tags);
      const name = tags.name || tags["name:en"] || tags.brand || tags.operator;
      if (!group || !name) return null;
      const key = group + ":" + name.toLowerCase() + ":" + point.lat.toFixed(4) + ":" + point.lng.toFixed(4);
      if (seen.has(key)) return null;
      seen.add(key);
      return { id: element.type + "-" + element.id, name, category: group, distanceKm: distanceKm(lat, lng, point.lat, point.lng), lat: point.lat, lng: point.lng, source: "OpenStreetMap" };
    }).filter((place): place is NonNullable<typeof place> => Boolean(place))
      .filter((place) => place.distanceKm * 1000 <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 80);

    return NextResponse.json({ places, radiusMeters: radius, source: "OpenStreetMap" }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ message: "Nearby place data is temporarily unavailable." }, { status: 502, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
  }
}
