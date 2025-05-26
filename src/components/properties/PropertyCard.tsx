import NextImage from 'next/image'; // Renamed to avoid conflict if 'Image' is used locally
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Property } from '@/types/property';
import { MapPin, BedDouble, Bath, Ruler } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const displayImage = property.images && property.images.length > 0 && (property.images[0].startsWith('data:') || property.images[0].startsWith('http'))
    ? property.images[0]
    : `https://placehold.co/600x400.png`;
  const placeholderHint = !property.images || property.images.length === 0 ? "placeholder house" : "house exterior";


  return (
    <Card className="w-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="p-0 relative">
        <Link href={`/properties/${property.id}`} className="block">
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
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Link href={`/properties/${property.id}`} className="block">
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
             <Link href={`/properties/${property.id}`}>View Details</Link>
          </Button>
      </CardFooter>
    </Card>
  );
}
