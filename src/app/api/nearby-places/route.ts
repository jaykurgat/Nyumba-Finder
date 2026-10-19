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

const CATEGORY_GROUPS = [
  { category: "Shopping", query: "commercial.supermarket,commercial.shopping_mall,commercial.marketplace,commercial.convenience" },
  { category: "Schools", query: "education.school,education.college,education.university,childcare" },
  { category: "Healthcare", query: "healthcare.hospital,healthcare.clinic_or_praxis,healthcare.pharmacy" },
  { category: "Parks", query: "leisure.park,leisure.playground,leisure.garden,leisure.recreation_ground" },
  { category: "Fitness", query: "sport,leisure.sports_centre,leisure.fitness_centre" },
  { category: "Transport", query: "public_transport" },
  { category: "Food & drink", query: "catering" },
  { category: "Services", query: "service" },
] as const;

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function category(categories: string[] = [], fallback: string) {
  const values = categories.map((value) => value.toLowerCase());
  // Match specific place types before broad parent categories. Grounds and parks must not become gyms.
  if (values.some((value) => value.startsWith("leisure.park") || value.startsWith("leisure.playground") || value.startsWith("leisure.garden") || value.startsWith("leisure.recreation_ground") || value.startsWith("natural."))) return "Parks";
  if (values.some((value) => value.startsWith("education.") || value.startsWith("childcare"))) return "Schools";
  if (values.some((value) => value.startsWith("healthcare.") || value.startsWith("medical."))) return "Healthcare";
  if (values.some((value) => value.startsWith("commercial."))) return "Shopping";
  if (values.some((value) => value.startsWith("public_transport") || value.startsWith("transport."))) return "Transport";
  if (values.some((value) => value.startsWith("catering."))) return "Food & drink";
  if (values.some((value) => value.startsWith("service.") || value.startsWith("office.") || value.startsWith("finance."))) return "Services";
  if (values.some((value) => value.startsWith("sport.") || value.includes("fitness"))) return "Fitness";
  return fallback;
}

function diversifyPlaces(places: NearbyPlace[]) {
  const priority = CATEGORY_GROUPS.map((group) => group.category);
  const groups = new Map(priority.map((name) => [name, places.filter((place) => place.category === name).sort((a, b) => a.distanceKm - b.distanceKm)]));
  const result: NearbyPlace[] = [];
  for (let index = 0; index < 20; index += 1) {
    for (const name of priority) {
      const place = groups.get(name)?.[index];
      if (place) result.push(place);
      if (result.length >= 80) return result;
    }
  }
  return result;
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

  try {
    // Query each category family independently so a dense family cannot crowd out every other amenity type.
    const results = await Promise.all(CATEGORY_GROUPS.map(async (group) => {
      const params = new URLSearchParams({
        categories: group.query,
        filter: `circle:${lng},${lat},${radius}`,
        bias: `proximity:${lng},${lat}`,
        limit: "100",
        lang: "en",
        apiKey,
      });
      const response = await fetch("https://api.geoapify.com/v2/places?" + params.toString(), {
        method: "GET",
        signal: AbortSignal.timeout(12000),
        next: { revalidate: 3600 },
      });
      if (!response.ok) throw new Error("Geoapify category query failed");
      const payload = await response.json() as { features?: GeoapifyFeature[] };
      return (payload.features || []).map((feature): NearbyPlace | null => {
        const properties = feature.properties || {};
        const coordinates = feature.geometry?.coordinates;
        const pointLat = typeof properties.lat === "number" ? properties.lat : coordinates?.[1];
        const pointLng = typeof properties.lon === "number" ? properties.lon : coordinates?.[0];
        if (typeof pointLat !== "number" || typeof pointLng !== "number") return null;
        const name = properties.name || properties.address_line1 || properties.formatted;
        if (!name) return null;
        const id = properties.place_id || name.toLowerCase() + ":" + pointLat.toFixed(5) + ":" + pointLng.toFixed(5);
        return {
          id,
          name,
          category: category(properties.categories, group.category),
          distanceKm: typeof properties.distance === "number" ? properties.distance / 1000 : distanceKm(lat, lng, pointLat, pointLng),
          lat: pointLat,
          lng: pointLng,
          source: "Geoapify",
        };
      }).filter((place): place is NearbyPlace => place !== null);
    }));

    const unique = new Map<string, NearbyPlace>();
    for (const place of results.flat()) {
      const existing = unique.get(place.id);
      // Prefer the more specific category returned by a dedicated category-family query.
      if (!existing || existing.category === "Fitness" && place.category !== "Fitness") unique.set(place.id, place);
    }
    const places = [...unique.values()].sort((a, b) => a.distanceKm - b.distanceKm);
    return NextResponse.json(
      { places: diversifyPlaces(places), radiusMeters: radius, source: "Geoapify" },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json(
      { message: "Nearby place lookup failed." },
      { status: 502, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
    );
  }
}
