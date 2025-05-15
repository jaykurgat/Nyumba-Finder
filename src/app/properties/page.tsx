
"use client"; 

import { PropertyCard } from '@/components/properties/PropertyCard';
import type { Property } from '@/types/property';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation'; // For accessing search params on client
import { PropertySearchForm } from '@/components/properties/PropertySearchForm';
import { Skeleton } from '@/components/ui/skeleton';

function PropertyListingsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

function PropertyListings() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams(); // Hook to get search parameters

  const locationQuery = searchParams.get('location');
  const displayedLocation = locationQuery || 'All Locations';

  const loadProperties = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = '/api/properties';
      if (locationQuery) {
        const params = new URLSearchParams();
        params.set('location', locationQuery);
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch properties: ${response.statusText}`);
      }
      const data: Property[] = await response.json();
      setProperties(data);
    } catch (error) {
      console.error("Error loading properties:", error);
      setProperties([]); // Set to empty array on error
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationQuery]); // Rerun when locationQuery (derived from searchParams) changes

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  if (isLoading) {
    return <PropertyListingsSkeleton />;
  }

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">
        Properties in {displayedLocation}
      </h2>
      {properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground mt-8">No properties found matching your criteria.</p>
      )}
    </>
  );
}

export default function PropertiesPage() {
  // PropertiesPage needs to be a Client Component if PropertyListings uses useSearchParams.
  // Alternatively, PropertyListings can be wrapped in Suspense if searchParams were passed as props.
  // For simplicity with the hook, making the parent a client component.
  return (
    <div className="container mx-auto px-4 py-8">
       <h1 className="text-3xl font-bold mb-6 text-center text-primary">Find Rentals</h1>
       <div className="mb-8 p-4 bg-card rounded-lg shadow-md border">
          <PropertySearchForm />
        </div>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full">
            <PropertyListings />
        </div>
      </div>
    </div>
  );
}
