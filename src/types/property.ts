export interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
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
}
