"use client";

import { PropertyCard } from "@/components/properties/PropertyCard";
import type { Property } from "@/types/property";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PropertySearchForm } from "@/components/properties/PropertySearchForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, SlidersHorizontal, Map as MapIcon, List as ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { InteractiveLocationMap } from "@/components/properties/InteractiveLocationMap";
import { CompareTray } from "@/components/properties/CompareTray";

function compactMapPrice(price: number) {
  if (price >= 1000000) return "KSh " + (price / 1000000).toLocaleString("en-KE", { maximumFractionDigits: 1 }) + "M";
  if (price >= 1000) return "KSh " + (price / 1000).toLocaleString("en-KE", { maximumFractionDigits: price >= 10000 ? 0 : 1 }) + "k";
  return "KSh " + price.toLocaleString("en-KE");
}

function PropertyListingsSkeleton() {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map(function (i) {
    return <div key={i} className="overflow-hidden border bg-card"><Skeleton className="h-52 w-full" /><div className="space-y-3 p-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-9 w-full" /></div></div>;
  })}</div>;
}

function PropertyListingsContent() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [savedPropertyIds, setSavedPropertyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapVisible, setMapVisible] = useState(true);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const params = useSearchParams();
  const mapMarkers = useMemo(() => properties
    .filter((property) => Number.isFinite(property.latitude) && Number.isFinite(property.longitude))
    .map((property) => ({ id: property.id, position: { lat: property.latitude as number, lng: property.longitude as number }, label: compactMapPrice(property.price), title: property.title + " · KSh " + property.price.toLocaleString("en-KE") + " · " + property.location })), [properties]);

  const load = useCallback(async function (signal?: AbortSignal) {
    setLoading(true); setError(null);
    try {
      const query = params.toString();
      const response = await fetch("/api/properties" + (query ? "?" + query : ""), { cache: "no-store", signal });
      if (!response.ok) {
        let message = "Failed to fetch properties.";
        try { const data = await response.json(); message = data.message || message; } catch {}
        throw new Error(message);
      }
      const loadedProperties: Property[] = await response.json();
      setProperties(loadedProperties);
      setTotalCount(Number(response.headers.get("X-Total-Count") || 0));
      setSavedPropertyIds([]);
      if (loadedProperties.length) {
        try {
          const ids = loadedProperties.map((property) => property.id).join(",");
          const savedResponse = await fetch("/api/saved-properties?ids=" + encodeURIComponent(ids), { cache: "no-store", signal });
          if (savedResponse.ok) {
            const savedData: { savedIds?: string[] } = await savedResponse.json();
            if (!signal?.aborted) setSavedPropertyIds(Array.isArray(savedData.savedIds) ? savedData.savedIds : []);
          }
        } catch {
          if (signal?.aborted) return;
        }
      }
    } catch (e: any) {
      if (signal?.aborted) return;
      setError(e.message || "Unable to load properties.");
      setProperties([]);
      setTotalCount(0);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [params]);

  useEffect(function () {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading) return <PropertyListingsSkeleton />;
  if (error) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error loading properties</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;

  const location = params.get("location");
  const listingType = params.get("listingType") || "ALL";
  const active = params.getAll("amenities").length + (params.get("minPrice") || params.get("maxPrice") ? 1 : 0) + (params.get("minBedrooms") ? 1 : 0) + (params.get("minBathrooms") ? 1 : 0) + (listingType !== "ALL" ? 1 : 0);

  return <div>
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">{listingType === "FOR_SALE" ? ("Homes for sale" + (location ? " in " + location : " across Kenya")) : listingType === "SHORT_STAY" ? ("Short stays" + (location ? " in " + location : " across Kenya")) : listingType === "FOR_RENT" ? ("Rentals" + (location ? " in " + location : " across Kenya")) : ("Homes across Kenya" + (location ? " near " + location : ""))}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{totalCount || properties.length} {(totalCount || properties.length) === 1 ? "property" : "properties"} found</h2>
        {totalCount > properties.length && <p className="mt-1 text-xs text-muted-foreground">Showing the most relevant matches first</p>}
      </div>
      {active > 0 && <p className="text-sm text-primary">{active} active filter{active === 1 ? "" : "s"}</p>}
    </div>
    {properties.length ? <>
      <div className="mb-4 flex justify-end"><div className="inline-flex border border-[#d9ded4] bg-white p-1" role="group" aria-label="Property results layout">
        <Button type="button" size="sm" variant={mapVisible ? "default" : "ghost"} className="rounded-none" onClick={() => setMapVisible(true)}><MapIcon className="mr-2 h-4 w-4" />Map & list</Button>
        <Button type="button" size="sm" variant={!mapVisible ? "default" : "ghost"} className="rounded-none" onClick={() => setMapVisible(false)}><ListIcon className="mr-2 h-4 w-4" />List</Button>
      </div></div>
      {mapVisible ? <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="order-last grid grid-cols-1 gap-5 lg:order-first">{properties.map(function (p) { return <PropertyCard key={p.id} property={p} initiallySaved={savedPropertyIds.includes(p.id)} />; })}</div>
        <aside className="order-first space-y-2 lg:sticky lg:top-4 lg:order-last lg:self-start">
          <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#20271f]">Explore homes on the map</p><p className="text-xs text-muted-foreground">{mapMarkers.length} mapped</p></div>
          {mapMarkers.length ? <InteractiveLocationMap value={null} markers={mapMarkers} onMarkerSelect={(id) => { window.location.href = "/properties/" + encodeURIComponent(id); }} interactive onViewportChange={(viewport) => setMapBounds({ north: viewport.north, south: viewport.south, east: viewport.east, west: viewport.west })} heightClassName="h-[360px] sm:h-[460px] lg:h-[calc(100vh-8rem)]" /> : <div className="flex min-h-[260px] items-center justify-center border border-[#d9ded4] bg-white p-6 text-center"><div><MapIcon className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Map locations are not available yet</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">These listings do not have verified map coordinates. You can still browse the full list.</p></div></div>}
          {mapMarkers.length > 0 && <Button type="button" className="w-full rounded-lg bg-[#244c2c] text-white hover:bg-[#193b21]" disabled={!mapBounds} onClick={() => { if (!mapBounds) return; const next = new URLSearchParams(params.toString()); next.set("north", String(mapBounds.north)); next.set("south", String(mapBounds.south)); next.set("east", String(mapBounds.east)); next.set("west", String(mapBounds.west)); next.delete("location"); next.delete("radiusKm"); window.location.href = "/properties?" + next.toString(); }}>Search this area</Button>}
          <p className="text-[11px] text-muted-foreground">Map tiles © OpenStreetMap contributors. Drag the map, then search this area to update results. Pin locations depend on listing coordinates.</p>
        </aside>
      </div> : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{properties.map(function (p) { return <PropertyCard key={p.id} property={p} initiallySaved={savedPropertyIds.includes(p.id)} />; })}</div>}
    </> :
      <div className="border bg-card px-6 py-16 text-center"><h3 className="text-lg font-semibold">No homes match those filters</h3><p className="mt-2 text-sm text-muted-foreground">Try widening your location or price range, or remove a filter.</p></div>}
  </div>;
}

export default function PropertiesPage() {
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);

  return <div className="min-h-screen bg-[#fbfaf6]">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8 lg:px-10">
      <div className="mb-6 max-w-3xl border-l-2 border-[#f28c28] pl-4">
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#60715b]">NYUMBAFINDER</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#20271f] sm:text-4xl">Find a place that feels like home.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687066] sm:text-base">Search rentals, homes for sale, and short stays by location, budget and the features you care about.</p>
      </div>

      <div className="mb-8">
        {isMobile ? <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild><Button variant="outline" className="h-12 w-full justify-between rounded-none border-[#d9ded4] bg-white px-4 shadow-none"><span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" />Search & filters</span><span className="text-sm text-muted-foreground">Open</span></Button></SheetTrigger>
          <SheetContent side="bottom" className="h-[92dvh] rounded-none p-0">
            <SheetHeader className="border-b px-5 py-4 text-left"><SheetTitle>Find a property</SheetTitle></SheetHeader>
            <div className="h-[calc(92vh-73px)] overflow-y-auto px-4 py-5"><Suspense fallback={<Skeleton className="h-96 w-full" />}><PropertySearchForm isInSheet onFormSubmit={function () { setFiltersOpen(false); }} /></Suspense></div>
          </SheetContent>
        </Sheet> :
        <Suspense fallback={<Skeleton className="h-16 w-full" />}><PropertySearchForm /></Suspense>}
      </div>

      <Suspense fallback={<PropertyListingsSkeleton />}><PropertyListingsContent /></Suspense>
    </div>
    <CompareTray />
  </div>;
}
