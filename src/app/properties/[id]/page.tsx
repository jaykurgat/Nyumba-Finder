"use client";

import { PropertyImage } from '@/components/properties/PropertyImage';
import { InteractiveLocationMap } from '@/components/properties/InteractiveLocationMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Property } from '@/types/property';
import {
  AlertTriangle,
  Bath,
  BedDouble,
  Check,
  Edit3,
  Home,
  MapPin,
  Phone,
  Ruler,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

async function fetchPropertyById(id: string): Promise<Property | null> {
  try {
    const response = await fetch('/api/properties/' + id, { cache: 'no-store' });

    if (!response.ok) {
      if (response.status === 404) return null;
      let message = 'Failed to fetch property details.';
      try {
        const data = await response.json();
        message = data.message || message;
      } catch {
        // Keep the default message when the response is not JSON.
      }
      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    console.error('[PropertyDetail Page] Error fetching property:', error);
    throw error;
  }
}

function ImageCarousel({ images, title }: { images: string[]; title: string }) {
  const effectiveImages = images?.filter((src) =>
    src.startsWith('data:') || src.startsWith('http') || src.startsWith('/')
  ) ?? [];

  if (effectiveImages.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-muted shadow-sm">
        <PropertyImage
          src="https://placehold.co/1200x800.png"
          alt={title + ' - No Image Available'}
          sizes="(max-width: 1024px) 100vw, 66vw"
          priority
          minHeightClassName="min-h-[300px] md:min-h-[500px]"
          maxHeightClassName="max-h-[72vh]"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Carousel className="w-full overflow-hidden rounded-2xl border bg-background shadow-sm">
        <CarouselContent>
          {effectiveImages.map((src, index) => (
            <CarouselItem key={src + index}>
              <PropertyImage
                src={src}
                alt={title + ' - Image ' + (index + 1)}
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority={index === 0}
                minHeightClassName="min-h-[300px] md:min-h-[500px]"
                maxHeightClassName="max-h-[72vh]"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {effectiveImages.length > 1 && (
          <>
            <CarouselPrevious className="absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 md:flex" />
            <CarouselNext className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 md:flex" />
          </>
        )}
      </Carousel>
      {effectiveImages.length > 1 && (
        <p className="text-center text-xs text-muted-foreground">
          Swipe or use the arrows to view all {effectiveImages.length} photos.
        </p>
      )}
    </div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function PropertyDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-10">
      <Skeleton className="mb-6 h-4 w-40" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <AspectRatio ratio={16 / 10} className="overflow-hidden rounded-2xl bg-muted">
            <Skeleton className="h-full w-full" />
          </AspectRatio>
          <Card>
            <CardContent className="space-y-5 p-6">
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <div className="grid gap-3 sm:grid-cols-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-5">
          <Card><CardContent className="space-y-4 p-6"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-11 w-full" /></CardContent></Card>
          <Card><CardContent className="h-64 p-0"><Skeleton className="h-full w-full rounded-xl" /></CardContent></Card>
        </div>
      </div>
    </div>
  );
}

export default function PropertyDetailPage({ params: paramsProp }: { params: Promise<{ id: string }> }) {
  const params = use(paramsProp);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  const [reportType, setReportType] = useState('Incorrect information');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [canPromoteListing, setCanPromoteListing] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/dashboard', { cache: 'no-store' })
      .then((response) => { if (active) setCanPromoteListing(response.ok); })
      .catch(() => { if (active) setCanPromoteListing(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!params?.id) {
      setError('No property ID provided.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchPropertyById(params.id)
      .then((data) => {
        if (data) {
          setProperty(data);
        } else {
          setError('The property you are looking for does not exist or could not be loaded.');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred while fetching property details.');
      })
      .finally(() => setIsLoading(false));
  }, [params?.id]);

  if (isLoading) return <PropertyDetailSkeleton />;

  if (error || !property) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h1 className="mb-2 text-3xl font-semibold">Property Not Found</h1>
        <p className="mx-auto mb-6 max-w-md text-muted-foreground">{error || 'This property could not be loaded.'}</p>
        <Button asChild>
          <Link href="/properties">Back to Properties</Link>
        </Button>
      </div>
    );
  }

  const pricePeriodLabel = property.listingType === 'FOR_SALE' ? 'For Sale' : property.listingType === 'SHORT_STAY' ? 'per night' : property.pricePeriod === 'WEEK' ? 'per week' : 'per month';

  return (
    <main className="min-h-screen bg-muted/20">
      <div className="container mx-auto max-w-6xl px-4 py-6 md:py-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link href="/properties" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            ← Back to properties
          </Link>
          <Button variant="outline" size="sm" asChild className="rounded-full">
            <Link href={'/list-property?edit=' + property.id}>
              <Edit3 className="mr-2 h-3.5 w-3.5" />
              Edit Property
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-7">
            <ImageCarousel images={property.images || []} title={property.title} />

            <section className="rounded-2xl border bg-background shadow-sm">
              <div className="border-b px-5 py-6 md:px-7">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Home className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{property.title}</h1>
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <span>{property.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-7 px-5 py-6 md:px-7">
                <div className="grid gap-3 sm:grid-cols-3">
                  <DetailStat
                    icon={BedDouble}
                    label="Bedrooms"
                    value={property.bedrooms === 0 ? 'Studio' : String(property.bedrooms)}
                  />
                  <DetailStat
                    icon={Bath}
                    label="Bathrooms"
                    value={String(property.bathrooms)}
                  />
                  {property.area !== undefined && property.area > 0 ? (
                    <DetailStat icon={Ruler} label="Floor area" value={property.area + ' m²'} />
                  ) : (
                    <DetailStat icon={Home} label="Property type" value={property.propertyType || 'Property'} />
                  )}
                </div>

                {property.listingType === 'SHORT_STAY' && (
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <p className="text-sm font-semibold">Short-stay details</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-sm">
                      {property.shortStayMinNights != null && <div><span className="text-muted-foreground">Minimum stay</span><p className="font-medium">{property.shortStayMinNights} night{property.shortStayMinNights === 1 ? '' : 's'}</p></div>}
                      {property.shortStayMaxNights != null && <div><span className="text-muted-foreground">Maximum stay</span><p className="font-medium">{property.shortStayMaxNights} nights</p></div>}
                      {property.maxGuests != null && <div><span className="text-muted-foreground">Maximum guests</span><p className="font-medium">{property.maxGuests}</p></div>}
                      {property.cleaningFee != null && <div><span className="text-muted-foreground">Cleaning fee</span><p className="font-medium">Ksh {property.cleaningFee.toLocaleString()}</p></div>}
                      {property.securityDeposit != null && <div><span className="text-muted-foreground">Security deposit</span><p className="font-medium">Ksh {property.securityDeposit.toLocaleString()}</p></div>}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="mb-3 text-lg font-semibold">About this property</h2>
                  <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground md:text-base">
                    {property.description}
                  </p>
                </div>

                {property.amenities && property.amenities.length > 0 && (
                  <div className="border-t pt-6">
                    <h2 className="mb-4 text-lg font-semibold">Amenities & features</h2>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {property.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center gap-2.5 text-sm">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

{canPromoteListing && (
            <section className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.08] shadow-sm">
              <div className="p-5 md:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div>
                  <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">More visibility</p><h2 className="mt-1 text-lg font-semibold tracking-tight">Promote this listing</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Give this property a premium sponsored placement so it can stand out more prominently in relevant searches. Sponsored listings remain subject to the same listing and search rules.</p></div>
                </div>
                <Button asChild className="mt-5 w-full rounded-xl sm:w-auto"><Link href={'/promote?property=' + property.id}>Explore sponsored placement</Link></Button>
              </div>
            </section>
            )}

            <section className="rounded-2xl border bg-background shadow-sm">
              <div className="border-b px-5 py-5 md:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Property location</h2>
                    <p className="text-xs text-muted-foreground">Approximate map location</p>
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-5">
                {property.latitude != null && property.longitude != null ? (
                  <InteractiveLocationMap
                    value={{ lat: property.latitude, lng: property.longitude }}
                    interactive={false}
                    heightClassName="h-72 md:h-80"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
                    Map location not available for this listing.
                  </div>
                )}
                <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{property.location}</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-background shadow-sm">
              <div className="border-b px-5 py-5 md:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Something wrong with this listing?</h2>
                    <p className="text-xs text-muted-foreground">Help us keep NyumbaFinder accurate and safe.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-5 md:p-7">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option>Incorrect information</option>
                  <option>No longer available</option>
                  <option>Duplicate listing</option>
                  <option>Wrong location</option>
                  <option>Possible scam</option>
                  <option>Inappropriate content</option>
                </select>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Optional details"
                  className="min-h-24 w-full resize-y rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  disabled={reportSent}
                  onClick={async () => {
                    const response = await fetch('/api/property-reports', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        propertyId: property.id,
                        type: reportType,
                        description: reportDescription,
                      }),
                    });
                    if (response.ok) {
                      setReportSent(true);
                      setReportDescription('');
                    }
                  }}
                >
                  {reportSent ? 'Report submitted' : 'Submit report'}
                </Button>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <Card className="overflow-hidden rounded-2xl border shadow-sm">
              <div className="border-b bg-primary/[0.04] px-5 py-6">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{property.listingType === 'FOR_SALE' ? 'Sale price' : property.listingType === 'SHORT_STAY' ? 'Short-stay price' : 'Monthly rent'}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  Ksh {property.price.toLocaleString()}
                  {property.listingType !== 'FOR_SALE' && <span className="ml-1 text-sm font-medium text-muted-foreground">{pricePeriodLabel}</span>}
                </p>
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Contact landlord</p>
                      <p className="mt-1 text-xs text-muted-foreground">Reach out about availability and viewing.</p>
                    </div>
                  </div>

                  {property.phoneNumber ? (
                    showPhoneNumber ? (
                      <a
                        href={'tel:' + property.phoneNumber}
                        className="mt-4 flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        {property.phoneNumber}
                      </a>
                    ) : (
                      <Button
                        className="mt-4 h-11 w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={() => setShowPhoneNumber(true)}
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Show phone number
                      </Button>
                    )
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">Phone number not provided.</p>
                  )}
                </div>

                <div className="flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{property.location}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">At a glance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between border-b pb-3 text-sm">
                  <span className="text-muted-foreground">Listing</span>
                  <span className="font-medium">{property.listingType === 'FOR_SALE' ? 'For Sale' : property.listingType === 'SHORT_STAY' ? 'Short Stay' : 'For Rent'}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-3 text-sm">
                  <span className="text-muted-foreground">Property type</span>
                  <span className="font-medium">{property.propertyType || '—'}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-3 text-sm">
                  <span className="text-muted-foreground">Bedrooms</span>
                  <span className="font-medium">{property.bedrooms === 0 ? 'Studio' : property.bedrooms}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-3 text-sm">
                  <span className="text-muted-foreground">Bathrooms</span>
                  <span className="font-medium">{property.bathrooms}</span>
                </div>
                {property.area !== undefined && property.area > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Floor area</span>
                    <span className="font-medium">{property.area} m²</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
