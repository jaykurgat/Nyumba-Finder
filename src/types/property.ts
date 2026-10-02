export interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  locationNodeId?: string;
  countyId?: string;
  countyName?: string;
  locationSource?: string;
  locationAccuracy?: string;
  price: number;
  images: string[];
  bedrooms: number;
  bathrooms: number;
  area?: number;
  amenities?: string[];
  phoneNumber?: string;
  propertyType?: string;
  status?: string;
  isSponsored?: boolean;
  promotionId?: string;
  promotionLabel?: string;
  promotionBoost?: number;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
}
