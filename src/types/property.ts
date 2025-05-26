export interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  images: string[]; // Array of image URLs or data URIs (currently not saved to DB)
  bedrooms: number;
  bathrooms: number;
  area?: number; // Optional
  amenities?: string[]; // Optional
  phoneNumber?: string; // Optional phone number
}
