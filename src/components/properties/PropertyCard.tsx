import NextImage from 'next/image'; // Renamed to avoid conflict if 'Image' is used locally
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Property } from '@/types/property';
import { MapPin, BedDouble, Bath, Ruler } from 'lucide-react';
import { useEffect } from 'react';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
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
    if (!property.isSponsored || !property.promotionId) return;
    void fetch('/api/promotions/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promotionId: property.promotionId, type: 'CLICK' }),
      keepalive: true,
    });
  };

  const displayImage = property.images && property.images.length > 0 && (
    property.images[0].startsWith('data:') ||
    property.images[0].startsWith('http') ||
    property.images[0].startsWith('/')
  )
    ? property.images[0]
    : `https://placehold.co/600x400.png`;
  const placeholderHint = !property.images || property.images.length === 0 ? "placeholder house" : "house exterior";


  return (
    <Card className="w-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="p-0 relative">
        <Link href={`/properties/${property.id}`} className="block" onClick={trackClick}>
          <NextImage
            src={displayImage}
            alt={property.title}
            width={600}
            height={400}
            className="w-full h-48 object-cover"
            data-ai-hint={placeholderHint}
            priority={false}
          />
        </Link>
        <Badge variant="secondary" className="absolute top-2 right-2 bg-background/80 text-foreground font-semibold">
          Ksh {property.price.toLocaleString()}/mo
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
        <div className="flex items-center text-sm text-muted-foreground mb-3">
          <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
          <span>{property.location}</span>
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
