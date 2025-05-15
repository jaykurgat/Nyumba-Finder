export interface Property {
  id: string;
  title: string;
  description: string;
  location: string; // Consider a more structured location object later if needed
  price: number; // Monthly rent in KES
  images: string[]; // Array of image URLs
  bedrooms: number; // 0 for Studio/Bedsitter
  bathrooms: number;
  area?: number; // Square meters (optional)
  amenities?: string[]; // e.g., ['Parking', 'Swimming Pool', 'Gym', 'Security']
  // Add landlord contact info later
  // landlordId: string;
  // postedDate: Date;
}
