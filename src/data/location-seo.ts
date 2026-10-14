export type LocationSeoTarget = {
  slug: string;
  name: string;
  county: string;
  kind: "county" | "city" | "town" | "estate" | "area";
  description: string;
  /** Search-market grouping; this does not change the official county. */
  market: "nairobi-metro" | "nakuru" | "mombasa" | "kisumu" | "eldoret";
};

export const LOCATION_SEO_TARGETS: LocationSeoTarget[] = [
  { slug: "nairobi", name: "Nairobi", county: "Nairobi", kind: "city", market: "nairobi-metro", description: "Explore rental homes across Nairobi, with options by estate, property type and budget." },
  { slug: "westlands", name: "Westlands", county: "Nairobi", kind: "estate", market: "nairobi-metro", description: "Browse rental homes in Westlands and compare available properties, rents and features." },
  { slug: "kilimani", name: "Kilimani", county: "Nairobi", kind: "estate", market: "nairobi-metro", description: "Explore apartments and rental homes in Kilimani, Nairobi." },
  { slug: "kileleshwa", name: "Kileleshwa", county: "Nairobi", kind: "estate", market: "nairobi-metro", description: "Explore rental apartments and homes in Kileleshwa, Nairobi." },
  { slug: "lavington", name: "Lavington", county: "Nairobi", kind: "estate", market: "nairobi-metro", description: "Find rental homes in Lavington and compare available options." },
  { slug: "parklands", name: "Parklands", county: "Nairobi", kind: "estate", market: "nairobi-metro", description: "Browse rental properties in Parklands, Nairobi." },
  { slug: "south-b", name: "South B", county: "Nairobi", kind: "estate", market: "nairobi-metro", description: "Explore rental apartments and homes in South B, Nairobi." },
  { slug: "south-c", name: "South C", county: "Nairobi", kind: "estate", market: "nairobi-metro", description: "Browse available rental homes in South C, Nairobi." },
  { slug: "langata", name: "Langata", county: "Nairobi", kind: "area", market: "nairobi-metro", description: "Explore rental homes in Langata and nearby Nairobi neighborhoods." },
  { slug: "rongai", name: "Rongai", county: "Kajiado", kind: "town", market: "nairobi-metro", description: "Compare rental homes in Ongata Rongai and nearby areas south of Nairobi." },
  { slug: "kasarani", name: "Kasarani", county: "Nairobi", kind: "estate", market: "nairobi-metro", description: "Browse houses and apartments for rent in Kasarani, Nairobi." },
  { slug: "roysambu", name: "Roysambu", county: "Nairobi", kind: "estate", market: "nairobi-metro", description: "Explore bedsitters, apartments and other rentals in Roysambu." },
  { slug: "ruaka", name: "Ruaka", county: "Kiambu", kind: "town", market: "nairobi-metro", description: "Browse rental homes in Ruaka and the surrounding Nairobi metropolitan area." },
  { slug: "banana", name: "Banana", county: "Kiambu", kind: "area", market: "nairobi-metro", description: "Explore rental homes in Banana and nearby areas of Kiambu County." },
  { slug: "kiambu-town", name: "Kiambu Town", county: "Kiambu", kind: "town", market: "nairobi-metro", description: "Compare available rental homes in Kiambu Town." },
  { slug: "thika", name: "Thika", county: "Kiambu", kind: "town", market: "nairobi-metro", description: "Explore houses and apartments for rent in Thika, Kiambu County." },
  { slug: "ruiru", name: "Ruiru", county: "Kiambu", kind: "town", market: "nairobi-metro", description: "Browse rental homes in Ruiru, with available options across property types and budgets." },
  { slug: "juja", name: "Juja", county: "Kiambu", kind: "town", market: "nairobi-metro", description: "Explore rental homes in Juja and compare current listings." },
  { slug: "kikuyu", name: "Kikuyu", county: "Kiambu", kind: "town", market: "nairobi-metro", description: "Browse rental houses and apartments in Kikuyu, west of Nairobi." },
  { slug: "thogoto", name: "Thogoto", county: "Kiambu", kind: "area", market: "nairobi-metro", description: "Explore rental options in Thogoto and nearby Kikuyu areas." },
  { slug: "kinoo", name: "Kinoo", county: "Kiambu", kind: "area", market: "nairobi-metro", description: "Browse rental homes in Kinoo and the surrounding Kikuyu corridor." },
  { slug: "zambezi", name: "Zambezi", county: "Kiambu", kind: "area", market: "nairobi-metro", description: "Explore rental properties around Zambezi in the greater Kikuyu area." },
  { slug: "kidfarmaco", name: "Kidfarmaco", county: "Kiambu", kind: "area", market: "nairobi-metro", description: "Browse rental options in Kidfarmaco and nearby Kikuyu neighborhoods." },
  { slug: "limuru", name: "Limuru", county: "Kiambu", kind: "town", market: "nairobi-metro", description: "Explore rental houses and apartments in Limuru and nearby areas." },
  { slug: "rironi", name: "Rironi", county: "Kiambu", kind: "area", market: "nairobi-metro", description: "Browse rental options in Rironi and the Limuru corridor." },
  { slug: "tigoni", name: "Tigoni", county: "Kiambu", kind: "area", market: "nairobi-metro", description: "Explore homes for rent in Tigoni and the surrounding Limuru area." },
  { slug: "ngong", name: "Ngong", county: "Kajiado", kind: "town", market: "nairobi-metro", description: "Compare rental houses and apartments in Ngong, within the wider Nairobi commuter region." },
  { slug: "kiserian", name: "Kiserian", county: "Kajiado", kind: "town", market: "nairobi-metro", description: "Explore rental homes in Kiserian and nearby towns south of Nairobi." },
  { slug: "kitengela", name: "Kitengela", county: "Kajiado", kind: "town", market: "nairobi-metro", description: "Browse rental houses and apartments in Kitengela, Kajiado County." },
  { slug: "athi-river", name: "Athi River", county: "Machakos", kind: "town", market: "nairobi-metro", description: "Explore rental homes in Athi River and the wider Nairobi metropolitan area." },
  { slug: "syokimau", name: "Syokimau", county: "Machakos", kind: "area", market: "nairobi-metro", description: "Browse rental apartments and houses in Syokimau, near Nairobi and the airport corridor." },
  { slug: "mlolongo", name: "Mlolongo", county: "Machakos", kind: "town", market: "nairobi-metro", description: "Explore rental homes in Mlolongo and nearby areas along Mombasa Road." },
  { slug: "machakos-town", name: "Machakos Town", county: "Machakos", kind: "town", market: "nairobi-metro", description: "Browse available rental homes in Machakos Town." },
  { slug: "nakuru", name: "Nakuru", county: "Nakuru", kind: "city", market: "nakuru", description: "Explore rental homes in Nakuru and compare options by location, home type and budget." },
  { slug: "milimani-nakuru", name: "Milimani", county: "Nakuru", kind: "estate", market: "nakuru", description: "Browse rental properties in Milimani, Nakuru." },
  { slug: "pipeline-nakuru", name: "Pipeline", county: "Nakuru", kind: "estate", market: "nakuru", description: "Explore rental homes in Pipeline, Nakuru." },
  { slug: "mombasa", name: "Mombasa", county: "Mombasa", kind: "city", market: "mombasa", description: "Browse rental homes across Mombasa and its residential neighborhoods." },
  { slug: "nyali", name: "Nyali", county: "Mombasa", kind: "estate", market: "mombasa", description: "Explore rental apartments and houses in Nyali, Mombasa." },
  { slug: "bamburi", name: "Bamburi", county: "Mombasa", kind: "area", market: "mombasa", description: "Browse rental properties in Bamburi and nearby coastal neighborhoods." },
  { slug: "likoni", name: "Likoni", county: "Mombasa", kind: "area", market: "mombasa", description: "Explore rental homes in Likoni, Mombasa." },
  { slug: "kisauni", name: "Kisauni", county: "Mombasa", kind: "area", market: "mombasa", description: "Browse rental homes in Kisauni and nearby areas of Mombasa." },
  { slug: "kisumu", name: "Kisumu", county: "Kisumu", kind: "city", market: "kisumu", description: "Explore rental houses and apartments in Kisumu and its surrounding neighborhoods." },
  { slug: "milimani-kisumu", name: "Milimani", county: "Kisumu", kind: "estate", market: "kisumu", description: "Browse rental homes in Milimani, Kisumu." },
  { slug: "mamboleo", name: "Mamboleo", county: "Kisumu", kind: "area", market: "kisumu", description: "Explore rental options in Mamboleo and nearby Kisumu neighborhoods." },
  { slug: "nyalenda", name: "Nyalenda", county: "Kisumu", kind: "area", market: "kisumu", description: "Browse rental homes in Nyalenda, Kisumu." },
  { slug: "eldoret", name: "Eldoret", county: "Uasin Gishu", kind: "city", market: "eldoret", description: "Explore rental homes in Eldoret and compare available listings by budget and property type." },
  { slug: "kapsoya", name: "Kapsoya", county: "Uasin Gishu", kind: "estate", market: "eldoret", description: "Browse houses and apartments for rent in Kapsoya, Eldoret." },
  { slug: "langas", name: "Langas", county: "Uasin Gishu", kind: "area", market: "eldoret", description: "Explore rental options in Langas and nearby areas of Eldoret." },
  { slug: "huruma-eldoret", name: "Huruma", county: "Uasin Gishu", kind: "area", market: "eldoret", description: "Browse rental homes in Huruma, Eldoret." },
];

export function getLocationSeoTarget(slug: string) {
  return LOCATION_SEO_TARGETS.find((target) => target.slug === slug);
}

export function normalizeLocationSlug(value: string) {
  return value.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
