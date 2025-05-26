
"use client";

import { PropertyCard } from '@/components/properties/PropertyCard';
import type { Property } from '@/types/property';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PropertySearchForm } from '@/components/properties/PropertySearchForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

function PropertyListingsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border rounded-lg overflow-hidden shadow-sm bg-card">
          <Skeleton className="h-48 w-full bg-muted" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-6 w-3/4 bg-muted" />
            <Skeleton className="h-4 w-1/2 bg-muted" />
            <Skeleton className="h-4 w-1/4 bg-muted" />
            <Skeleton className="h-8 w-full mt-2 bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PropertyListingsContent() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const loadProperties = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log("[Properties Page] Attempting to load properties with filters.");
    try {
      const baseUrl = '';
      let url = `/api/properties`;

      // Preserve all existing search parameters from the URL
      const params = new URLSearchParams(searchParams.toString());
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      console.log(`[Properties Page] Fetching from: ${url}`);
      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        let errorMessage = `Failed to fetch properties: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
           console.error("[Properties Page] API Error response:", errorData);
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
          console.error("[Properties Page] API Error response was not JSON:", errorText);
        }
        throw new Error(errorMessage);
      }
      const data: Property[] = await response.json();
      console.log(`[Properties Page] Successfully fetched ${data.length} properties.`);
      setProperties(data);
    } catch (err: any) {
      console.error("[Properties Page] Error loading properties:", err);
      setError(err.message || "An unknown error occurred while fetching properties.");
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const getDisplayedFiltersText = () => {
    const activeFilters = [];
    const generalQuery = searchParams.get('q');
    const locationQuery = searchParams.get('location');

    if (generalQuery) activeFilters.push(`Searching for: "${generalQuery}"`);
    if (locationQuery && (!generalQuery || !generalQuery.toLowerCase().includes(locationQuery.toLowerCase()))) {
      // Only add specific location if not already covered by general query for brevity
      activeFilters.push(`Location: ${locationQuery}`);
    }
    
    if (searchParams.get('minPrice') || searchParams.get('maxPrice')) {
        const min = searchParams.get('minPrice');
        const max = searchParams.get('maxPrice');
        if (min && max) activeFilters.push(`Price: KES ${min} - ${max}`);
        else if (min) activeFilters.push(`Price: KES ${min}+`);
        else if (max) activeFilters.push(`Price: up to KES ${max}`);
    }
    if (searchParams.get('minBedrooms') && searchParams.get('minBedrooms') !== 'all') {
        activeFilters.push(`Min Beds: ${searchParams.get('minBedrooms') === "0" ? "Studio" : searchParams.get('minBedrooms')}`);
    }
    if (searchParams.get('minBathrooms') && searchParams.get('minBathrooms') !== 'all') {
        activeFilters.push(`Min Baths: ${searchParams.get('minBathrooms')}`);
    }
    const amenities = searchParams.getAll('amenities');
    if (amenities.length > 0) activeFilters.push(`Amenities: ${amenities.join(', ')}`);

    if (activeFilters.length === 0) return "Showing All Properties";
    return `Filtered by: ${activeFilters.join('; ')}`;
  };

  if (isLoading) {
    return <PropertyListingsSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-8">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Properties</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-6 text-center md:text-left text-muted-foreground">
        {getDisplayedFiltersText()} ({properties.length} found)
      </h2>
      {properties.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground mt-8 text-lg">
          No properties found matching your criteria. Try adjusting your filters or search terms.
        </p>
      )}
    </div>
  );
}

export default function PropertiesPage() {
  const isMobile = useIsMobile();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const handleFormSubmitInSheet = () => {
    setMobileFiltersOpen(false); // Close sheet after applying filters on mobile
  };

  return (
    <div className="container mx-auto px-2 py-8 md:px-4">
      <h1 className="text-3xl font-bold mb-8 text-center text-primary">Find Your Next Rental</h1>

      {isMobile && (
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="fixed bottom-4 right-4 z-40 p-4 h-auto rounded-full shadow-lg md:hidden flex items-center gap-2 bg-background hover:bg-accent hover:text-accent-foreground border-primary"
              aria-label="Open filters"
            >
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Filter Properties
              </SheetTitle>
            </SheetHeader>
            <div className="flex-grow overflow-y-auto p-4">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <PropertySearchForm onFormSubmit={handleFormSubmitInSheet} />
              </Suspense>
            </div>
            <SheetFooter className="p-4 border-t">
              <SheetClose asChild>
                <Button variant="outline" className="w-full">Done</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {!isMobile && (
          <aside className="md:w-72 lg:w-80 md:sticky md:top-20 md:self-start h-auto max-h-[calc(100vh-5rem)]">
            <div className="p-6 bg-card rounded-xl shadow-lg border sticky top-20 overflow-y-auto max-h-[calc(100vh-6rem)]">
              <h2 className="text-2xl font-semibold mb-4 text-primary flex items-center gap-2">
                <Filter className="h-6 w-6" />
                Filters
              </h2>
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <PropertySearchForm />
              </Suspense>
            </div>
          </aside>
        )}

        <main className={`flex-grow ${isMobile ? 'pb-20' : ''}`}>
          <Suspense fallback={<PropertyListingsSkeleton />}>
            <PropertyListingsContent />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
