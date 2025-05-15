import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Property } from '@/types/property';
import { MapPin, BedDouble, Bath, Ruler, CheckCircle, Phone } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// Mock function to fetch a single property by ID - replace with actual API call
async function fetchPropertyById(id: string): Promise<Property | null> {
  console.log("Fetching property with ID:", id);
   // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const allProperties: Property[] = [
    { id: '1', title: 'Spacious 2 Bedroom Apt in Kilimani', price: 75000, location: 'Kilimani, Nairobi', description: 'Modern apartment with great views and amenities. Features include hardwood floors, a large balcony, and high-speed internet connection. Located in a secure compound with 24/7 security and ample parking.', images: ['https://picsum.photos/seed/p1a/800/600', 'https://picsum.photos/seed/p1b/800/600', 'https://picsum.photos/seed/p1c/800/600'], bedrooms: 2, bathrooms: 2, area: 120, amenities: ['Parking', 'Swimming Pool', 'Gym', '24/7 Security', 'Balcony', 'Internet Ready'] },
    { id: '2', title: 'Cozy Studio near Yaya Centre', price: 40000, location: 'Kilimani, Nairobi', description: 'Perfect studio for singles or couples. Well-maintained unit with kitchenette and modern bathroom. Conveniently located near shopping malls and public transport.', images: ['https://picsum.photos/seed/p2a/800/600', 'https://picsum.photos/seed/p2b/800/600'], bedrooms: 0, bathrooms: 1, area: 45, amenities: ['Parking', 'Security', 'Lift'] },
    { id: '3', title: 'Family Home in Lavington', price: 150000, location: 'Lavington, Nairobi', description: 'Beautiful 4-bedroom house with a mature garden and servant quarters. Spacious living room, separate dining area, and a large kitchen. Ideal for families looking for a serene environment.', images: ['https://picsum.photos/seed/p3a/800/600', 'https://picsum.photos/seed/p3b/800/600', 'https://picsum.photos/seed/p3c/800/600'], bedrooms: 4, bathrooms: 3, area: 300, amenities: ['Parking', 'Garden', 'Security', 'Servant Quarters'] },
    { id: '4', title: 'Beachfront Villa in Nyali', price: 120000, location: 'Nyali, Mombasa', description: 'Stunning villa with direct beach access. Enjoy breathtaking ocean views from your private balcony. Features include air conditioning, a fully equipped kitchen, and a shared swimming pool.', images: ['https://picsum.photos/seed/p4a/800/600', 'https://picsum.photos/seed/p4b/800/600'], bedrooms: 3, bathrooms: 3, area: 250, amenities: ['Parking', 'Swimming Pool', 'Beach Access', 'Air Conditioning'] },
    { id: '5', title: 'Affordable Bedsitter in Roysambu', price: 15000, location: 'Roysambu, Nairobi', description: 'Budget-friendly bedsitter, close to TRM mall and major roads. Clean and secure unit suitable for students or young professionals. Water included in rent.', images: ['https://picsum.photos/seed/p5a/800/600'], bedrooms: 0, bathrooms: 1, area: 30, amenities: ['Security', 'Water Included'] },
    { id: '6', title: 'Modern 1 Bedroom in Westlands', price: 60000, location: 'Westlands, Nairobi', description: 'Chic apartment in a prime location, walking distance to Sarit Centre. Features modern finishes, ample natural light, and access to a rooftop gym.', images: ['https://picsum.photos/seed/p6a/800/600', 'https://picsum.photos/seed/p6b/800/600'], bedrooms: 1, bathrooms: 1, area: 65, amenities: ['Parking', 'Gym', 'Security', 'Rooftop Terrace'] },
  ];

  return allProperties.find(prop => prop.id === id) || null;
}

// Component for image carousel
function ImageCarousel({ images, title }: { images: string[]; title: string }) {
    if (!images || images.length === 0) {
      return (
           <AspectRatio ratio={16 / 9} className="bg-muted flex items-center justify-center rounded-lg overflow-hidden">
             <span className="text-muted-foreground">No Image Available</span>
           </AspectRatio>
        );
    }

   return (
    <Carousel className="w-full rounded-lg overflow-hidden shadow-md border">
      <CarouselContent>
        {images.map((src, index) => (
          <CarouselItem key={index}>
             <AspectRatio ratio={16 / 9} className="bg-muted">
                 <Image
                  src={src}
                  alt={`${title} - Image ${index + 1}`}
                  fill // Use fill to cover the aspect ratio container
                  className="object-cover"
                  priority={index === 0} // Prioritize loading the first image
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
             </AspectRatio>
          </CarouselItem>
        ))}
      </CarouselContent>
       {images.length > 1 && (
         <>
            <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
            <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
         </>
       )}
    </Carousel>
  );
}


export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = await fetchPropertyById(params.id);

  if (!property) {
    return <div className="container mx-auto px-4 py-8 text-center">Property not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Carousel */}
          <ImageCarousel images={property.images} title={property.title} />

          {/* Property Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl font-bold">{property.title}</CardTitle>
              <div className="flex items-center text-lg text-muted-foreground mt-1">
                <MapPin className="w-5 h-5 mr-2 flex-shrink-0" />
                <span>{property.location}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-md text-foreground">
                 {property.bedrooms > 0 && (
                    <span className="flex items-center font-medium"><BedDouble className="w-5 h-5 mr-2 text-primary" /> {property.bedrooms} Bedrooms</span>
                 )}
                  {property.bedrooms === 0 && ( // Handle Studio / Bedsitter
                    <span className="flex items-center font-medium"><BedDouble className="w-5 h-5 mr-2 text-primary" /> Studio</span>
                  )}
                <span className="flex items-center font-medium"><Bath className="w-5 h-5 mr-2 text-primary" /> {property.bathrooms} Bathrooms</span>
                {property.area && (
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

        {/* Sidebar Area */}
        <div className="lg:col-span-1 space-y-6">
          {/* Price and Contact Card */}
          <Card className="sticky top-20 shadow-lg border-primary border-2">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-primary">
                Ksh {property.price.toLocaleString()}
                <span className="text-base font-normal text-muted-foreground"> / month</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Landlord Contact Info Here - Placeholder */}
              <h3 className="text-lg font-semibold mb-3">Contact Landlord</h3>
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <Phone className="mr-2 h-4 w-4" /> Show Phone Number
              </Button>
              {/* Optionally add a contact form */}
            </CardContent>
          </Card>

          {/* Map Placeholder Card */}
           <Card>
             <CardHeader>
               <CardTitle className="text-xl">Location</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="h-60 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                 Map Placeholder - Integrate Map Here
               </div>
                <p className="mt-2 text-sm text-center text-muted-foreground">{property.location}</p>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
// Required for Next.js Image component with fill prop
// Removed duplicate import and export of AspectRatio here
