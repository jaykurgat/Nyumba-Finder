import { PropertyCard } from '@/components/properties/PropertyCard';
import { PropertyFilterSidebar } from '@/components/properties/PropertyFilterSidebar';
import type { Property } from '@/types/property';
import { Suspense } from 'react';
import { PropertySearchForm } from '@/components/properties/PropertySearchForm';
import { Skeleton } from '@/components/ui/skeleton';

// Mock function to fetch properties - replace with actual API call later
async function fetchProperties(searchParams: { [key: string]: string | string[] | undefined }): Promise<Property[]> {
  console.log("Fetching properties with params:", searchParams);
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Basic filtering based on location (case-insensitive)
  const locationQuery = searchParams?.location?.toString().toLowerCase();

  const allProperties: Property[] = [
    { id: '1', title: 'Spacious 2 Bedroom Apt in Kilimani', price: 75000, location: 'Kilimani, Nairobi', description: 'Modern apartment with great views and amenities.', images: ['https://picsum.photos/seed/p1/600/400'], bedrooms: 2, bathrooms: 2, area: 120, amenities: ['Parking', 'Swimming Pool', 'Gym'] },
    { id: '2', title: 'Cozy Studio near Yaya Centre', price: 40000, location: 'Kilimani, Nairobi', description: 'Perfect studio for singles or couples.', images: ['https://picsum.photos/seed/p2/600/400'], bedrooms: 0, bathrooms: 1, area: 45, amenities: ['Parking', 'Security'] },
    { id: '3', title: 'Family Home in Lavington', price: 150000, location: 'Lavington, Nairobi', description: 'Beautiful 4-bedroom house with a garden.', images: ['https://picsum.photos/seed/p3/600/400'], bedrooms: 4, bathrooms: 3, area: 300, amenities: ['Parking', 'Garden', 'Security'] },
    { id: '4', title: 'Beachfront Villa in Nyali', price: 120000, location: 'Nyali, Mombasa', description: 'Stunning villa with direct beach access.', images: ['https://picsum.photos/seed/p4/600/400'], bedrooms: 3, bathrooms: 3, area: 250, amenities: ['Parking', 'Swimming Pool', 'Beach Access'] },
    { id: '5', title: 'Affordable Bedsitter in Roysambu', price: 15000, location: 'Roysambu, Nairobi', description: 'Budget-friendly bedsitter, close to TRM.', images: ['https://picsum.photos/seed/p5/600/400'], bedrooms: 0, bathrooms: 1, area: 30, amenities: ['Security'] },
     { id: '6', title: 'Modern 1 Bedroom in Westlands', price: 60000, location: 'Westlands, Nairobi', description: 'Chic apartment in a prime location.', images: ['https://picsum.photos/seed/p6/600/400'], bedrooms: 1, bathrooms: 1, area: 65, amenities: ['Parking', 'Gym', 'Security'] },
  ];

  if (!locationQuery) {
    return allProperties;
  }

  return allProperties.filter(prop => prop.location.toLowerCase().includes(locationQuery));
}

function PropertyListingsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border rounded-lg overflow-hidden shadow-sm">
          <Skeleton className="h-48 w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-8 w-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}


async function PropertyListings({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const properties = await fetchProperties(searchParams);
  const location = searchParams?.location || 'All Locations';

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">
        Properties in {typeof location === 'string' ? location : 'Kenya'}
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


export default function PropertiesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {

  return (
    <div className="container mx-auto px-4 py-8">
       <h1 className="text-3xl font-bold mb-6 text-center">Find Rentals</h1>
       <div className="mb-8 p-4 bg-card rounded-lg shadow-md border">
          <PropertySearchForm />
        </div>
      <div className="flex flex-col md:flex-row gap-8">
        {/* <div className="w-full md:w-1/4"> */}
          {/* Filter Sidebar - Add later */}
           {/* <PropertyFilterSidebar /> */}
        {/* </div> */}
        <div className="w-full">
          <Suspense fallback={<PropertyListingsSkeleton />}>
            <PropertyListings searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
