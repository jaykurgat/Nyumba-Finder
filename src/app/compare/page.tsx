"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BedDouble, Bath, Ruler, MapPin, GitCompare, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyImage } from "@/components/properties/PropertyImage";
import type { Property } from "@/types/property";

const STORAGE_KEY = "nyumba-compare-ids";

export default function ComparePropertiesPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (selected: string[]) => {
    setLoading(true);
    setError("");
    if (selected.length < 2) {
      setProperties([]);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/properties?ids=" + encodeURIComponent(selected.join(",")), { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load the selected properties.");
      const data: Property[] = await response.json();
      setProperties(data.filter((property) => selected.includes(property.id)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load the selected properties.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const sync = () => {
      let selected: string[] = [];
      try {
        const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
        selected = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, 4) : [];
      } catch { selected = []; }
      if (!active) return;
      setIds(selected);
      void load(selected);
    };
    sync();
    window.addEventListener("nyumba:compare-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      active = false;
      window.removeEventListener("nyumba:compare-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [load]);

  function remove(id: string) {
    const next = ids.filter((item) => item !== id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setIds(next);
    window.dispatchEvent(new Event("nyumba:compare-change"));
  }

  const pricePeriod = (property: Property) => property.listingType === "FOR_SALE" ? "sale price" : property.listingType === "SHORT_STAY" ? "per night" : property.pricePeriod === "WEEK" ? "per week" : "per month";
  const money = (price: number) => "KSh " + price.toLocaleString("en-KE");

  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#20271f]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <Link href="/properties" className="inline-flex items-center gap-2 text-sm font-medium text-[#647060] transition-colors hover:text-[#244c2c]"><ArrowLeft className="h-4 w-4" />Back to homes</Link>
        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#74856b]">Make a confident choice</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Compare homes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687066]">Compare the details that matter to your budget and everyday life. Prices and features reflect information provided in each listing.</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#dfe5da] bg-white px-3 py-2 text-xs font-medium text-[#52634e] sm:self-auto"><GitCompare className="h-4 w-4" />{ids.length} of 4 selected</div>
        </div>

        {loading ? <div className="mt-8 rounded-2xl border border-[#e1e6dc] bg-white p-10 text-center text-sm text-[#687066]">Loading your selected homes…</div> :
        error ? <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">{error}</div> :
        properties.length < 2 ? <section className="mt-8 rounded-2xl border border-dashed border-[#cbd5c3] bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf2e9] text-[#244c2c]"><GitCompare className="h-6 w-6" /></div>
          <h2 className="mt-4 text-xl font-semibold">Choose at least two homes</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#687066]">Return to search results and select Compare on the homes you want to evaluate. You can compare up to four at a time.</p>
          <Button asChild className="mt-5 rounded-xl bg-[#244c2c] text-white hover:bg-[#193b21]"><Link href="/properties">Browse properties</Link></Button>
        </section> :
        <div className="mt-8 overflow-x-auto rounded-2xl border border-[#e1e6dc] bg-white shadow-[0_8px_32px_rgba(31,46,31,0.05)]">
          <div className="grid min-w-[720px]" style={{ gridTemplateColumns: "160px repeat(" + properties.length + ", minmax(220px, 1fr))" }}>
            <div className="border-b border-r border-[#edf0e9] bg-[#f8f9f5] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#788272]">Your shortlist</p>
              <p className="mt-2 text-sm font-medium">Compare details</p>
            </div>
            {properties.map((property) => <div key={property.id} className="relative border-b border-r border-[#edf0e9] p-3">
              <button type="button" onClick={() => remove(property.id)} aria-label={"Remove " + property.title + " from comparison"} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e5db] bg-white/95 text-[#687066] shadow-sm hover:text-red-600"><X className="h-4 w-4" /></button>
              <Link href={"/properties/" + property.id} className="block">
                <div className="overflow-hidden rounded-xl bg-[#edf0e9]">
                  <PropertyImage src={property.images?.[0] || "https://placehold.co/640x480.png"} alt={property.title} sizes="300px" minHeightClassName="min-h-[145px]" maxHeightClassName="max-h-[180px]" />
                </div>
                <h2 className="mt-3 line-clamp-2 pr-8 text-sm font-semibold leading-5 hover:text-[#244c2c]">{property.title}</h2>
              </Link>
              <p className="mt-2 text-lg font-bold tracking-tight text-[#244c2c]">{money(property.price)}</p>
              <p className="text-xs text-[#788272]">{pricePeriod(property)}</p>
            </div>)}

            {[
              { label: "Location", render: (p: Property) => <span className="inline-flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#74856b]" />{p.location || "Not provided"}</span> },
              { label: "Listing type", render: (p: Property) => p.listingType === "FOR_SALE" ? "For sale" : p.listingType === "SHORT_STAY" ? "Short stay" : "For rent" },
              { label: "Property type", render: (p: Property) => p.propertyType || "Not provided" },
              { label: "Bedrooms", render: (p: Property) => p.propertyType === "Land" ? "Not applicable" : p.bedrooms === 0 ? "Studio" : p.bedrooms ?? "Not provided" },
              { label: "Bathrooms", render: (p: Property) => p.propertyType === "Land" ? "Not applicable" : p.bathrooms ?? "Not provided" },
              { label: "Floor area", render: (p: Property) => p.area ? p.area + " m²" : "Not provided" },
              { label: "Amenities", render: (p: Property) => p.amenities?.length ? p.amenities.join(", ") : "Not provided" },
            ].map((row, index) => <div key={row.label} className="contents">
              <div className={"border-r border-[#edf0e9] px-4 py-4 text-xs font-semibold text-[#687066] " + (index % 2 ? "bg-white" : "bg-[#f8f9f5]")}>{row.label}</div>
              {properties.map((property) => <div key={property.id} className={"border-r border-[#edf0e9] px-4 py-4 text-sm leading-6 " + (index % 2 ? "bg-white" : "bg-[#f8f9f5]")}>{row.render(property)}</div>)}
            </div>)}
            <div className="border-r border-[#edf0e9] bg-[#f8f9f5] p-4 text-xs font-semibold text-[#687066]">Next step</div>
            {properties.map((property) => <div key={property.id} className="border-r border-[#edf0e9] p-4"><Button asChild className="w-full rounded-xl bg-[#244c2c] text-white hover:bg-[#193b21]"><Link href={"/properties/" + property.id}>View property</Link></Button></div>)}
          </div>
        </div>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#788272]">
          <p>Missing information is labelled “Not provided” rather than estimated.</p>
          <Link href="/properties" className="inline-flex items-center gap-1.5 font-semibold text-[#244c2c] hover:underline"><Plus className="h-3.5 w-3.5" />Add more homes</Link>
        </div>
      </div>
    </main>
  );
}
