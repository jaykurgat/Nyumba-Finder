import locationSeoTargets from "./location-seo-targets.json";

export type LocationSeoTarget = {
  slug: string;
  name: string;
  county: string;
  kind: "county" | "city" | "town" | "estate" | "area";
  description: string;
  market: "nairobi-metro" | "nakuru" | "mombasa" | "kisumu" | "eldoret" | "other";
  parentName?: string;
};

export const LOCATION_SEO_TARGETS: LocationSeoTarget[] = locationSeoTargets as LocationSeoTarget[];

export function getLocationSeoTarget(slug: string) {
  return LOCATION_SEO_TARGETS.find((target) => target.slug === slug);
}

export function normalizeLocationSlug(value: string) {
  return value.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
