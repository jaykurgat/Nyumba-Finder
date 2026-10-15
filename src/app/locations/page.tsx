"use client";

import Link from "next/link";
import { MapPin, ArrowUpRight, Search } from "lucide-react";
import { LOCATION_SEO_TARGETS } from "@/data/location-seo";

const groups = [
  { id: "nairobi-metro", title: "Nairobi & the commuter belt", description: "Search Nairobi estates and connected towns across Kiambu, Kajiado and Machakos." },
  { id: "nakuru", title: "Nakuru", description: "Explore rental homes in Nakuru and its residential areas." },
  { id: "mombasa", title: "Mombasa", description: "Browse rentals across Mombasa and coastal neighborhoods." },
  { id: "kisumu", title: "Kisumu", description: "Find rental options in Kisumu and nearby residential areas." },
  { id: "eldoret", title: "Eldoret", description: "Explore rental homes across Eldoret and surrounding neighborhoods." },
] as const;

export default function LocationsIndexPage() {
  return (
    <main className="min-h-screen bg-[#fafbf8] text-[#202b21]">
      <section className="border-b border-[#e3e9df] bg-gradient-to-br from-[#f2f6ee] via-[#fbfcf9] to-[#f7f1e7]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#d9e4d2] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#486341]"><MapPin className="h-3.5 w-3.5" /> Browse by location</p>
          <div className="mt-4 grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-[#233323] sm:text-4xl lg:text-[2.8rem]">Find a rental home in the right neighborhood</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#606d5c] sm:text-base">Explore NyumbaFinder by city, town or estate. Start with Nairobi and its commuter towns, or browse rental markets in Nakuru, Mombasa, Kisumu and Eldoret.</p>
            </div>
            <Link href="/find-a-house" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#238447] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1c6c39]"><Search className="h-4 w-4" /> Search all homes</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {groups.map((group) => {
          const places = LOCATION_SEO_TARGETS.filter((target) => target.market === group.id);
          return (
            <section key={group.id} aria-labelledby={`location-group-${group.id}`}>
              <div className="mb-4 max-w-3xl">
                <h2 id={`location-group-${group.id}`} className="text-xl font-semibold tracking-tight sm:text-2xl">{group.title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-[#687565]">{group.description}</p>
              </div>
              <div className="rounded-2xl border border-[#e2e8dd] bg-white px-4 py-2 shadow-[0_2px_10px_rgba(25,40,24,0.025)] sm:px-5">
                <div className="grid grid-cols-1 divide-y divide-[#edf0e9] sm:grid-cols-2 sm:divide-y-0 sm:gap-x-8 lg:grid-cols-3 xl:grid-cols-4">
                  {places.map((place) => (
                    <Link
                      key={place.slug}
                      href={`/locations/${place.slug}`}
                      className="group flex min-w-0 items-center justify-between gap-3 py-3 text-sm transition-colors hover:text-[#237b40] sm:border-b sm:border-[#edf0e9]"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#83a77a] transition-colors group-hover:bg-[#237b40]" />
                        <span className="truncate font-medium text-[#344333] group-hover:text-[#237b40]">{place.name}</span>
                        <span className="shrink-0 text-xs text-[#879080]">{place.kind === "estate" ? "Estate" : place.kind === "area" ? "Area" : place.kind === "city" ? "City" : "Town"}</span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#9aa494] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
        <div className="rounded-2xl border border-[#dce5d6] bg-[#f2f6ee] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div><h2 className="text-lg font-semibold text-[#2d3b29]">Can’t see your preferred location?</h2><p className="mt-1 text-sm leading-6 text-[#606a5d]">Search by town or neighborhood, or choose the closest available area and verify the exact location with the advertiser.</p></div>
          <Link href="/find-a-house" className="mt-4 inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[#cbd9c4] bg-white px-4 py-2 text-sm font-semibold text-[#385638] hover:bg-[#e8f0e2] sm:mt-0">Find a house</Link>
        </div>
      </section>
    </main>
  );
}
