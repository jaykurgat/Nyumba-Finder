export type LocationContext = {
  query: string;
  center?: { lat: number; lng: number; label: string };
  canonicalCounty?: string;
  canonicalPlace?: string;
  exactPlaceTerms: string[];
  countyTerms: string[];
  neighboringCountyTerms: string[];
};

const COUNTY_ALIASES: Record<string, string> = {
  "nairobi": "Nairobi City",
  "nairobi city": "Nairobi City",
  "nairobi county": "Nairobi City",
  "uasin gishu": "Uasin Gishu",
  "trans nzoia": "Trans Nzoia",
  "trans-nzoia": "Trans Nzoia",
  "elgeyo marakwet": "Elgeyo Marakwet",
  "taita taveta": "Taita Taveta",
  "tharaka nithi": "Tharaka Nithi",
  "muranga": "Murang'a",
  "murang'a": "Murang'a",
  "homa bay": "Homa Bay",
  "nandi": "Nandi",
  "kisumu": "Kisumu",
  "kakamega": "Kakamega",
  "vihiga": "Vihiga",
  "kericho": "Kericho",
  "uasin": "Uasin Gishu",
};

const COUNTY_NEIGHBORS: Record<string, string[]> = {
  "Nandi": ["Kakamega", "Uasin Gishu", "Kericho", "Kisumu", "Vihiga"],
  "Kakamega": ["Nandi", "Vihiga", "Bungoma", "Siaya", "Busia"],
  "Uasin Gishu": ["Nandi", "Trans Nzoia", "Elgeyo Marakwet", "Baringo", "Kericho", "Kakamega"],
  "Kericho": ["Nandi", "Uasin Gishu", "Baringo", "Nakuru", "Bomet", "Kisumu"],
  "Kisumu": ["Nandi", "Kericho", "Vihiga", "Siaya", "Homa Bay", "Nyamira"],
  "Vihiga": ["Nandi", "Kakamega", "Kisumu", "Siaya"],
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsTerm(text: string, term: string) {
  return normalize(text).includes(normalize(term));
}

export function resolveLocationContext(rawQuery: string): LocationContext | null {
  const query = rawQuery.trim();
  if (!query) return null;

  const normalizedQuery = normalize(query);
  let canonicalCounty: string | undefined;

  for (const [alias, county] of Object.entries(COUNTY_ALIASES)) {
    if (normalizedQuery === normalize(alias) || normalizedQuery.includes(normalize(alias))) {
      canonicalCounty = county;
      break;
    }
  }

  const exactPlaceTerms = [query];
  if (normalizedQuery === "kapsabet" || normalizedQuery.includes("kapsabet")) {
    canonicalCounty = "Nandi";
    exactPlaceTerms.push("Kapsabet");
  }

  const countyTerms = canonicalCounty ? [canonicalCounty, query] : [query];
  const neighboringCountyTerms = canonicalCounty
    ? (COUNTY_NEIGHBORS[canonicalCounty] || [])
    : [];

  return {
    query,
    center: normalizedQuery === "kapsabet" ? { lat: 0.20387, lng: 35.105, label: "Kapsabet" } : undefined,
    canonicalCounty,
    canonicalPlace: normalizedQuery === "kapsabet" ? "Kapsabet" : undefined,
    exactPlaceTerms,
    countyTerms,
    neighboringCountyTerms,
  };
}

export function locationRelevanceScore(location: string, context: LocationContext | null) {
  if (!context) return 0;

  const text = normalize(location);
  const query = normalize(context.query);
  let score = 0;

  if (text === query) score += 1000;
  if (text.includes(query)) score += 500;

  for (const term of context.exactPlaceTerms) {
    if (containsTerm(location, term)) score += 900;
  }

  if (context.canonicalCounty && containsTerm(location, context.canonicalCounty)) {
    score += 650;
  }

  for (const county of context.neighboringCountyTerms) {
    if (containsTerm(location, county)) score += 300;
  }

  return score;
}

export function countySearchTerms(context: LocationContext | null) {
  if (!context) return [];
  return [
    ...(context.canonicalCounty ? [context.canonicalCounty] : []),
    ...context.neighboringCountyTerms,
  ];
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
