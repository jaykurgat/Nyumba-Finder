import Link from "next/link";
import { MapPin, ArrowUpRight, Search } from "lucide-react";
import { getActiveLocationDirectory } from "@/lib/location-seo";

export const revalidate = 60;

const kindLabel = (kind: string) => kind === "estate" ? "Estate" : kind === "area" ? "Area" : kind === "city" ? "City" : kind === "town" ? "Town" : "County";

export default async function LocationsIndexPage() {
  const locations = await getActiveLocationDirectory();
  const counties = [...new Set(locations.map((place) => place.county))].sort((a, b) => a.localeCompare(b));
  const groups = counties.map((county) => ({
    county,
    places: locations.filter((place) => place.county === county).sort((a, b) =>
      (a.parentName ?? a.name).localeCompare(b.parentName ?? b.name) || a.name.localeCompare(b.name)
    ),
  }));

  return (
    <main className="min-h-screen bg-[#fbfaf6] text-[#202b21]">
      <section className="border-b border-[#e3e9df] bg-gradient-to-br from-[#f2f6ee] via-[#fbfcf9] to-[#f7f1e7]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <p className="inline-flex items-center gap-2 rounded-none border border-[#d9e4d2] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#486341]"><MapPin className="h-3.5 w-3.5" /> Browse by location</p>
          <div className="mt-4 grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-[#233323] sm:text-4xl lg:text-[2.8rem]">Find a rental home in the right neighborhood</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#606d5c] sm:text-base">Browse towns, cities, estates and neighborhoods where homes are currently listed on NyumbaFinder. This directory updates as active listings change.</p>
            </div>
            <Link href="/find-a-house" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-none bg-[#238447] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1c6c39]"><Search className="h-4 w-4" /> Search all homes</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {groups.length ? groups.map(({ county, places }) => (
          <section key={county} aria-labelledby={`location-group-${county.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id={`location-group-${county.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`} className="text-xl font-semibold tracking-tight sm:text-2xl">{county} County</h2>
                <p className="mt-1 text-sm text-[#687565]">Locations with active property listings</p>
              </div>
              <span className="text-xs text-[#778271]">{places.length} {places.length === 1 ? "location" : "locations"}</span>
            </div>
            <div className="rounded-none border border-[#e2e8dd] bg-white px-4 py-2 shadow-[0_2px_10px_rgba(25,40,24,0.025)] sm:px-5">
              <div className="grid grid-cols-1 divide-y divide-[#edf0e9] sm:grid-cols-2 sm:divide-y-0 sm:gap-x-8 lg:grid-cols-3 xl:grid-cols-4">
                {places.map((place) => (
                  <Link key={place.slug} href={`/locations/${place.slug}`} className="group flex min-w-0 items-center justify-between gap-3 py-3 text-sm transition-colors hover:text-[#237b40] sm:border-b sm:border-[#edf0e9]">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-none bg-[#83a77a] transition-colors group-hover:bg-[#237b40]" />
                      <span className="truncate font-medium text-[#344333] group-hover:text-[#237b40]">{place.name}</span>
                      <span className="shrink-0 text-xs text-[#879080]">{kindLabel(place.kind)}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-[#879080]">{place.count}</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#9aa494] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )) : (
          <div className="rounded-none border border-dashed border-[#d5dfcf] bg-white px-6 py-10 text-center">
            <MapPin className="mx-auto h-7 w-7 text-[#7a8b72]" />
            <h2 className="mt-3 text-base font-semibold">Locations will appear here as homes are listed</h2>
            <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-[#6d7868]">Once active property listings have a selected town or neighborhood, those locations will be added automatically.</p>
            <Link href="/find-a-house" className="mt-4 inline-flex min-h-10 items-center rounded-none bg-[#238447] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1c6c39]">Search all homes</Link>
          </div>
        )}
        <div className="rounded-none border border-[#dce5d6] bg-[#f1f4ec] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div><h2 className="text-lg font-semibold text-[#2d3b29]">Can’t see your preferred location?</h2><p className="mt-1 text-sm leading-6 text-[#606a5d]">Search for it or add a listing with its correct county, town and area. New locations with active listings will appear here automatically.</p></div>
          <Link href="/find-a-house" className="mt-4 inline-flex min-h-10 shrink-0 items-center justify-center rounded-none border border-[#cbd9c4] bg-white px-4 py-2 text-sm font-semibold text-[#385638] hover:bg-[#e8f0e2] sm:mt-0">Find a house</Link>
        </div>
      </section>
    </main>
  );
}
