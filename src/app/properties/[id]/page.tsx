
"use client";

import NextImage from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Property } from '@/types/property';
import { MapPin, BedDouble, Bath, Ruler, CheckCircle, Phone, AlertTriangle, Edit3 } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

async function fetchPropertyById(id: string): Promise<Property | null> {
  console.log(`[PropertyDetail Page] Attempting to fetch property with ID: ${id}`);
  try {
    const baseUrl = ''; // For client-side fetch, relative URL is fine
    const response = await fetch(`${baseUrl}/api/properties/${id}`, {
        cache: 'no-store',
    });
    const responseStatus = response.status;
    console.log(`[PropertyDetail Page] API response status for ID ${id}: ${responseStatus}`);

    if (!response.ok) {
      if (responseStatus === 404) {
        console.warn(`[PropertyDetail Page] API returned 404 for property ID ${id}.`);
        return null;
      }
      let errorData = { message: `Server error: ${responseStatus}. Failed to fetch details.` };
      try {
        errorData = await response.json();
        console.error(`[PropertyDetail Page] API Error JSON response for ID ${id}:`, errorData);
      } catch (e) {
        const errorText = await response.text();
        console.error(`[PropertyDetail Page] API Error Text response for ID ${id} (Status ${responseStatus}): ${errorText}`);
        errorData.message = errorText || errorData.message;
      }
      throw new Error(errorData.message);
    }
    const property: Property = await response.json();
    console.log(`[PropertyDetail Page] Successfully fetched property ID ${id}:`, property);
    return property;
  } catch (error: any) {
    console.error(`[PropertyDetail Page] Catch block error fetching property ID ${id}:`, error.message, error);
    throw error;
  }
}

function ImageCarousel({ images, title }: { images: string[]; title: string }) {
    // Since images are not stored in DB yet, this will always show placeholder.
    // When image storage is implemented, this will show actual images.
    const effectiveImages = images && images.length > 0 && images.some(src => src.startsWith('data:') || src.startsWith('http'))
      ? images
      : []; // If DB returns empty or placeholder URLs, treat as no images

    if (effectiveImages.length === 0) {
      const placeholderUrl = `https://placehold.co/800x600.png`;
      return (
           <AspectRatio ratio={16 / 9} className="bg-muted flex items-center justify-center rounded-lg overflow-hidden">
             <NextImage
                src={placeholderUrl}
                alt={`${title} - No Image Available`}
                fill
                className="object-contain"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                data-ai-hint="placeholder building"
             />
           </AspectRatio>
        );
    }

   return (
    <Carousel className="w-full rounded-lg overflow-hidden shadow-md border">
      <CarouselContent>
        {effectiveImages.map((src, index) => (
          <CarouselItem key={index}>
             <AspectRatio ratio={16 / 9} className="bg-muted">
                 <NextImage
                  src={src} // Assuming src is a valid data URI or http URL
                  alt={`${title} - Image ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  data-ai-hint="house interior"
                />
             </AspectRatio>
          </CarouselItem>
        ))}
      </CarouselContent>
       {effectiveImages.length > 1 && (
         <>
            <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
            <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
         </>
       )}
    </Carousel>
  );
}

function PropertyDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
            <Skeleton className="h-full w-full" />
          </AspectRatio>
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-20 shadow-lg">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent>
              <Skeleton className="h-60 w-full bg-muted rounded-md" />
              <Skeleton className="h-4 w-1/2 mt-2 mx-auto" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


export default function PropertyDetailPage({ params: paramsProp }: { params: Promise<{ id: string }> | { id: string } }) {
  const params = use(paramsProp); // Unwrap the promise using React.use()
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);

  useEffect(() => {
    if (params && params.id) {
      setIsLoading(true);
      setError(null);
      console.log(`[PropertyDetail Page Effect] Using property ID: ${params.id}`);
      fetchPropertyById(params.id)
        .then(data => {
          if (data) {
            setProperty(data);
          } else {
            setError(`The property you are looking for with ID "${params.id}" does not exist or could not be loaded.`);
          }
        })
        .catch(err => {
          console.error("[PropertyDetail Page Effect] Catch block error:", err);
          setError(err.message || 'An unexpected error occurred while fetching property details.');
        })
        .finally(() => setIsLoading(false));
    } else {
      console.warn("[PropertyDetail Page Effect] No property ID found in resolved params:", params);
      setError("No property ID provided or params not resolved.");
      setIsLoading(false);
    }
  }, [params?.id]);

  if (isLoading) {
    return <PropertyDetailSkeleton />;
  }

  if (error || !property) {
    const displayId = params?.id || "the requested ID";
    return (
        <div className="container mx-auto px-4 py-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h1 className="text-3xl font-bold text-destructive mb-2">Property Not Found</h1>
            <p className="text-muted-foreground mb-6">{error || `The property with ID "${displayId}" could not be loaded.`}</p>
            <Button asChild className="mt-6">
                <Link href="/properties">Back to Properties</Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <ImageCarousel images={property.images || []} title={property.title} />
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-2xl md:text-3xl font-bold">{property.title}</CardTitle>
                    <div className="flex items-center text-lg text-muted-foreground mt-1">
                        <MapPin className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>{property.location}</span>
                    </div>
                </div>
                {/* Basic Edit Button - No auth check yet */}
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/list-property?edit=${property.id}`}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Property
                    </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-md text-foreground">
                 {property.bedrooms > 0 && (
                    <span className="flex items-center font-medium"><BedDouble className="w-5 h-5 mr-2 text-primary" /> {property.bedrooms} Bedrooms</span>
                 )}
                  {property.bedrooms === 0 && (
                    <span className="flex items-center font-medium"><BedDouble className="w-5 h-5 mr-2 text-primary" /> Studio</span>
                  )}
                <span className="flex items-center font-medium"><Bath className="w-5 h-5 mr-2 text-primary" /> {property.bathrooms} Bathrooms</span>
                {property.area !== undefined && property.area > 0 && (
                  <span className="flex items-center font-medium"><Ruler className="w-5 h-5 mr-2 text-primary" /> {property.area} sq m</span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Description</h3>
                <p className="text-foreground leading-relaxed">{property.description}</p>
              </div>
               {property.amenities && property.amenities.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-2">Amenities</h3>
                  <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {property.amenities.map((amenity, index) => (
                      <li key={index} className="flex items-center text-foreground">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-600 flex-shrink-0" />
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-20 shadow-lg border-primary border-2">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-primary">
                Ksh {property.price.toLocaleString()}
                <span className="text-base font-normal text-muted-foreground"> / month</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold mb-3">Contact Landlord</h3>
              {property.phoneNumber ? (
                showPhoneNumber ? (
                  <p className="text-lg font-medium text-accent flex items-center">
                    <Phone className="mr-2 h-4 w-4" /> {property.phoneNumber}
                  </p>
                ) : (
                  <Button 
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={() => setShowPhoneNumber(true)}
                  >
                    <Phone className="mr-2 h-4 w-4" /> Show Phone Number
                  </Button>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Phone number not provided.</p>
              )}
            </CardContent>
          </Card>
           <Card>
             <CardHeader>
               <CardTitle className="text-xl">Location</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="h-60 bg-muted rounded-md flex items-center justify-center text-muted-foreground" data-ai-hint="map location">
                 Map Placeholder
               </div>
                <p className="mt-2 text-sm text-center text-muted-foreground">{property.location}</p>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
