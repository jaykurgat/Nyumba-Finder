import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, BedDouble, Bath, ArrowUpRight, Search } from "lucide-react";
import { getLocationSeoData } from "@/lib/location-seo";
import { LOCATION_SEO_TARGETS } from "@/data/location-seo";

const SITE_URL = "https://www.nyumba-finder.com";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getLocationSeoData(slug);
  if (!data) return { title: "Location not found | NyumbaFinder", robots: { index: false, follow: true } };

  const { target, canonical } = data;
  const title = `Houses for Rent in ${target.name} | NyumbaFinder`;
  const description = `${target.description} View current rental listings on NyumbaFinder and compare available homes.`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: data.indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { type: "website", url: canonical, siteName: "NyumbaFinder", title, description, locale: "en_KE" },
  };
}

const money = (price: number, period: string, listingType: string) => {
  const formatted = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(price);
  if (listingType === "FOR_SALE") return formatted;
  const suffix = period === "NIGHT" ? "/ night" : period === "WEEK" ? "/ week" : period === "ONE_TIME" ? "" : "/ month";
  return `${formatted} ${suffix}`.trim();
};

export default async function LocationLandingPage({ params }: Props) {
  const { slug } = await params;
  const data = await getLocationSeoData(slug);
  if (!data) notFound();

  const { target, properties, canonical } = data;
  const related = LOCATION_SEO_TARGETS
    .filter((item) => item.slug !== target.slug && item.market === target.market)
    .slice(0, 10);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#collection`,
    url: canonical,
    name: `Houses for Rent in ${target.name} | NyumbaFinder`,
    description: target.description,
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "NyumbaFinder", url: SITE_URL },
    about: { "@type": "Place", name: target.name, containedInPlace: { "@type": "AdministrativeArea", name: `${target.county} County, Kenya` } },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: properties.length,
      itemListElement: properties.map((property, index) => ({
        "@type": "ListItem", position: index + 1,
        url: `${SITE_URL}/properties/${property.id}`,
        name: property.title,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-[#fafbf8] text-[#202b21]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <section className="border-b border-[#e3e9df] bg-gradient-to-br from-[#f2f6ee] via-[#fbfcf9] to-[#f7f1e7]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[#687566]">
            <Link href="/" className="hover:text-[#236a3a]">Home</Link><span>/</span>
            <Link href="/find-a-house" className="hover:text-[#236a3a]">Find a house</Link><span>/</span>
            <span aria-current="page" className="font-medium text-[#354432]">{target.name}</span>
          </nav>
          <div className="grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d9e4d2] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#486341]">
                <MapPin className="h-3.5 w-3.5" /> {target.county} County · Kenya
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#233323] sm:text-4xl lg:text-[2.65rem]">Houses for rent in {target.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#606d5c] sm:text-base">{target.description} Compare listing details and contact the advertiser to confirm availability before arranging a viewing.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/find-a-house?location=${encodeURIComponent(target.name)}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#238447] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1c6c39]">
                  <Search className="h-4 w-4" /> Search {target.name}
                </Link>
                <Link href="/properties" className="inline-flex min-h-11 items-center rounded-xl border border-[#d9e1d5] bg-white px-4 py-2.5 text-sm font-semibold text-[#3b4d38] transition hover:bg-[#f3f6ef]">All properties</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-white bg-white/85 p-5 shadow-[0_12px_35px_rgba(40,65,35,0.07)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#71806b]">Local rental search</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#263b28]">{properties.length}</p>
              <p className="mt-1 text-sm text-[#697565]">{properties.length === 1 ? "listing currently shown" : "listings currently shown"}</p>
              <div className="mt-4 border-t border-[#edf0e9] pt-3 text-xs leading-5 text-[#6d7868]">Listings can change. Confirm rent, location and availability directly with the advertiser.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71806b]">Explore the area</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Available homes in {target.name}</h2>
          </div>
          <span className="text-sm text-[#758071]">Updated as listings change</span>
        </div>

        {properties.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => {
              const imageUrl = property.images.find((url) => url.startsWith("/") || url.startsWith("https://placehold.co/") || url.includes(".public.blob.vercel-storage.com"));
              return (
                <article key={property.id} className="group overflow-hidden rounded-2xl border border-[#e4e9e0] bg-white shadow-[0_3px_14px_rgba(25,40,24,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[#cbdcc5] hover:shadow-[0_12px_30px_rgba(25,40,24,0.09)]">
                  <Link href={`/properties/${property.id}`} className="block">
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#eef1eb]">
                      {imageUrl ? <Image src={imageUrl} alt={property.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover transition duration-300 group-hover:scale-[1.025]" /> : <div className="flex h-full items-center justify-center text-sm text-[#778271]">Photo not available</div>}
                      <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#3c5838]">{property.listingType === "FOR_SALE" ? "For sale" : property.pricePeriod === "NIGHT" ? "Short stay" : "For rent"}</span>
                    </div>
                    <div className="p-4">
                      <p className="text-lg font-semibold tracking-tight text-[#243a27]">{money(property.price, property.pricePeriod, property.listingType)}</p>
                      <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#29342a] group-hover:text-[#237b40]">{property.title}</h3>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-[#6d7868]"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="line-clamp-1">{property.location}</span></p>
                      <div className="mt-4 flex items-center gap-4 border-t border-[#edf0e9] pt-3 text-xs font-medium text-[#5c6858]">
                        <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4" />{property.bedrooms} bed</span>
                        <span className="inline-flex items-center gap-1.5"><Bath className="h-4 w-4" />{property.bathrooms} bath</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-[#287a40]">View home <ArrowUpRight className="h-3.5 w-3.5" /></span>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d5dfcf] bg-white px-6 py-10 text-center">
            <MapPin className="mx-auto h-7 w-7 text-[#7a8b72]" />
            <h3 className="mt-3 text-base font-semibold">No matching listings to show yet</h3>
            <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-[#6d7868]">Try the wider search to see nearby options. We only want to feature homes that are actually listed, not invent local availability.</p>
            <Link href="/find-a-house" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[#238447] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1c6c39]">Search all homes</Link>
          </div>
        )}

        <div className="mt-10 border-t border-[#e2e8dd] pt-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71806b]">More places to explore</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Nearby rental markets</h2></div>
            <Link href="/find-a-house" className="text-sm font-semibold text-[#24783e] hover:underline">Open house search</Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {related.map((place) => <Link key={place.slug} href={`/locations/${place.slug}`} className="inline-flex items-center rounded-full border border-[#e0e7dc] bg-white px-3.5 py-2 text-sm font-medium text-[#475844] transition hover:border-[#b8cfaf] hover:bg-[#f1f6ed] hover:text-[#216c37]">{place.name}</Link>)}
          </div>
        </div>
      </section>
    </main>
  );
}
