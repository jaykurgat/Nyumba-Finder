import { PropertyImage } from "@/components/properties/PropertyImage";
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Property } from '@/types/property';
import { MapPin, BedDouble, Bath, Ruler, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PropertyCardProps {
  property: Property;
  initiallySaved?: boolean;
}

function trackAnalyticsEvent(eventName: string, params: Record<string, string | number>) {
  if (typeof window === 'undefined') return;
  const analyticsWindow = window as Window & {
    gtag?: (command: string, eventName: string, eventParams: Record<string, string | number>) => void;
  };
  analyticsWindow.gtag?.('event', eventName, params);
}

export function PropertyCard({ property, initiallySaved = false }: PropertyCardProps) {
  const [isSaved, setIsSaved] = useState(initiallySaved);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    if (initiallySaved) return;
    let active = true;
    fetch('/api/saved-properties?propertyId=' + encodeURIComponent(property.id), { cache: 'no-store' })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          if (active) setIsSaved(Boolean(data.saved));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [property.id, initiallySaved]);

  const toggleSaved = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (saveBusy) return;
    setSaveBusy(true);
    try {
      const response = await fetch('/api/saved-properties', {
        method: isSaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id }),
      });
      if (response.status === 401) {
        window.location.href = '/account?mode=login';
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        window.alert(data.message || 'Unable to update your saved listings.');
        return;
      }
      setIsSaved(Boolean(data.saved));
      if (isSaved && window.location.pathname === '/saved') window.location.reload();
    } catch {
      window.alert('Connection issue. Please try saving this property again.');
    } finally {
      setSaveBusy(false);
    }
  };

  useEffect(() => {
    if (!property.isSponsored || !property.promotionId) return;
    void fetch('/api/promotions/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promotionId: property.promotionId, type: 'IMPRESSION' }),
      keepalive: true,
    });
  }, [property.isSponsored, property.promotionId]);

  const trackClick = () => {
    trackAnalyticsEvent('property_listing_click', {
      property_id: property.id,
      property_type: property.listingType ?? 'UNSPECIFIED',
      property_location: property.location,
      property_price: property.price,
      sponsored: property.isSponsored ? 'yes' : 'no',
    });
    if (!property.isSponsored || !property.promotionId) return;
    void fetch('/api/promotions/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promotionId: property.promotionId, type: 'CLICK' }),
      keepalive: true,
    });
  };

  const priceLabel = property.listingType === 'FOR_SALE'
    ? ' · For Sale'
    : property.listingType === 'SHORT_STAY'
      ? ' / night'
      : property.pricePeriod === 'WEEK'
        ? ' / week'
        : ' / month';

  const displayImage = property.images && property.images.length > 0 && (
    property.images[0].startsWith('data:') ||
    property.images[0].startsWith('http') ||
    property.images[0].startsWith('/')
  )
    ? property.images[0]
    : `https://placehold.co/600x400.png`;


  return (
    <Card className="w-full min-w-0 overflow-hidden shadow-sm transition-shadow duration-300 hover:shadow-lg flex flex-col">
      <CardHeader className="p-0 relative">
        <Link href={`/properties/${property.id}`} className="block" onClick={trackClick}>
          <PropertyImage
            src={displayImage}
            alt={property.title}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            minHeightClassName="min-h-[190px]"
            maxHeightClassName="max-h-[300px]"
          />
        </Link>
        <button
          type="button"
          onClick={toggleSaved}
          disabled={saveBusy}
          aria-label={isSaved ? "Remove from saved properties" : "Save property"}
          aria-pressed={isSaved}
          title={isSaved ? "Remove from saved" : "Save property"}
          className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-background/95 text-foreground shadow-sm transition hover:scale-105 hover:text-primary disabled:opacity-60"
        >
          <Heart className={"h-5 w-5 " + (isSaved ? "fill-current text-primary" : "")} />
        </button>
        <Badge variant="secondary" className="absolute bottom-2 right-2 max-w-[calc(100%-1rem)] truncate bg-background/95 text-xs font-semibold text-foreground sm:text-sm">
          Ksh {property.price.toLocaleString()}{priceLabel}
        </Badge>
        {property.isSponsored && (
          <span className="absolute left-2 top-2 border bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
            Sponsored
          </span>
        )}
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Link href={`/properties/${property.id}`} className="block" onClick={trackClick}>
          <CardTitle className="text-lg font-semibold mb-2 hover:text-primary transition-colors truncate">{property.title}</CardTitle>
        </Link>
        <div className="mb-3 flex min-w-0 items-start text-sm text-muted-foreground">
          <MapPin className="mr-1 mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{property.location}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{property.description}</p>
         <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mb-2">
           {property.bedrooms > 0 && (
             <span className="flex items-center"><BedDouble className="w-4 h-4 mr-1" /> {property.bedrooms} Beds</span>
           )}
           {property.bedrooms === 0 && (
                <span className="flex items-center"><BedDouble className="w-4 h-4 mr-1" /> Studio</span>
            )}
          <span className="flex items-center"><Bath className="w-4 h-4 mr-1" /> {property.bathrooms} Baths</span>
          {property.area !== undefined && property.area > 0 && (
            <span className="flex items-center"><Ruler className="w-4 h-4 mr-1" /> {property.area} sq m</span>
           )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 border-t">
         <Button variant="outline" className="w-full" asChild>
             <Link href={`/properties/${property.id}`} onClick={trackClick}>View Details</Link>
          </Button>
      </CardFooter>
    </Card>
  );
}
