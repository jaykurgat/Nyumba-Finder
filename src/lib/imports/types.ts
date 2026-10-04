export type ImportedListing = {
  externalId: string;
  sourceUrl: string;
  title: string;
  description?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  propertyType?: string;
  location?: string;
  amenities?: string[];
  imageUrls?: string[];
  latitude?: number;
  longitude?: number;
  rawData?: unknown;
};

export type ImportSourceConfig = {
  name: string;
  baseUrl: string;
  listingUrl?: string;
  listingPatterns?: string[];
  paginationParam?: string;
  maxPages?: number;
  requestDelayMs?: number;
  enabled: boolean;
  accessApproved: boolean;
  accessMethod: string;
  redisplayAllowed: boolean;
  maxListingsPerRun?: number;
};