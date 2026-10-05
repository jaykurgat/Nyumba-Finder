"use client";

import { PropertyCard } from "@/components/properties/PropertyCard";
import type { Property } from "@/types/property";
import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PropertySearchForm } from "@/components/properties/PropertySearchForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

function PropertyListingsSkeleton() {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map(function (i) {
    return <div key={i} className="overflow-hidden border bg-card"><Skeleton className="h-52 w-full" /><div className="space-y-3 p-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-9 w-full" /></div></div>;
  })}</div>;
}

function PropertyListingsContent() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useSearchParams();

  const load = useCallback(async function () {
    setLoading(true); setError(null);
    try {
      const query = params.toString();
      const response = await fetch("/api/properties" + (query ? "?" + query : ""), { cache: "no-store" });
      if (!response.ok) {
        let message = "Failed to fetch properties.";
        try { const data = await response.json(); message = data.message || message; } catch {}
        throw new Error(message);
      }
      setProperties(await response.json());
      setTotalCount(Number(response.headers.get("X-Total-Count") || 0));
    } catch (e: any) {
      setError(e.message || "Unable to load properties.");
      setProperties([]);
      setTotalCount(0);
    } finally { setLoading(false); }
  }, [params]);

  useEffect(function () { load(); }, [load]);

  if (loading) return <PropertyListingsSkeleton />;
  if (error) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error loading properties</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;

  const location = params.get("location");
  const listingType = params.get("listingType") || "FOR_RENT";
  const active = params.getAll("amenities").length + (params.get("minPrice") || params.get("maxPrice") ? 1 : 0) + (params.get("minBedrooms") ? 1 : 0) + (params.get("minBathrooms") ? 1 : 0) + (listingType !== "FOR_RENT" ? 1 : 0);

  return <div>
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">{location ? listingType === "FOR_SALE" ? ("Homes for sale" + (location ? " in " + location : " across Kenya")) : listingType === "SHORT_STAY" ? ("Short stays" + (location ? " in " + location : " across Kenya")) : ("Rentals in " + location)}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{totalCount || properties.length} {(totalCount || properties.length) === 1 ? "property" : "properties"} found</h2>
        {totalCount > properties.length && <p className="mt-1 text-xs text-muted-foreground">Showing the most relevant matches first</p>}
      </div>
      {active > 0 && <p className="text-sm text-primary">{active} active filter{active === 1 ? "" : "s"}</p>}
    </div>
    {properties.length ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{properties.map(function (p) { return <PropertyCard key={p.id} property={p} />; })}</div> :
      <div className="border bg-card px-6 py-16 text-center"><h3 className="text-lg font-semibold">No homes match those filters</h3><p className="mt-2 text-sm text-muted-foreground">Try widening your location or price range, or remove a filter.</p></div>}
  </div>;
}

export default function PropertiesPage() {
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);

  return <div className="min-h-screen bg-muted/20">
    <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 max-w-3xl">
        <p className="text-sm font-semibold tracking-[0.16em] text-primary">NYUMBAFINDER</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Find a place that feels like home.</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">Search rentals, homes for sale, and short stays by location, budget and the features you care about.</p>
      </div>

      <div className="mb-8">
        {isMobile ? <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild><Button variant="outline" className="h-12 w-full justify-between bg-background px-4 shadow-sm"><span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" />Search & filters</span><span className="text-sm text-muted-foreground">Open</span></Button></SheetTrigger>
          <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl p-0">
            <SheetHeader className="border-b px-5 py-4 text-left"><SheetTitle>Find your rental</SheetTitle></SheetHeader>
            <div className="h-[calc(92vh-73px)] overflow-y-auto px-4 py-5"><Suspense fallback={<Skeleton className="h-96 w-full" />}><PropertySearchForm isInSheet onFormSubmit={function () { setFiltersOpen(false); }} /></Suspense></div>
          </SheetContent>
        </Sheet> :
        <Suspense fallback={<Skeleton className="h-16 w-full" />}><PropertySearchForm /></Suspense>}
      </div>

      <Suspense fallback={<PropertyListingsSkeleton />}><PropertyListingsContent /></Suspense>
    </div>
  </div>;
}
