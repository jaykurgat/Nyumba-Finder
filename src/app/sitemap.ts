import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getLocationSeoSitemapEntries } from "@/lib/location-seo";

const SITE_URL = "https://www.nyumba-finder.com";

const infoPages = [
  "about",
  "how-it-works",
  "faq",
  "landlord-guidelines",
  "listing-rules",
  "report-listing",
  "safety-scams",
  "contact",
  "disclaimer",
  "terms",
  "cookies",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, locationEntries] = await Promise.all([
    prisma.property.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    getLocationSeoSitemapEntries(),
  ]);

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/properties`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/find-a-house`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...locationEntries,
    { url: `${SITE_URL}/promote`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.65 },
    ...infoPages.map((slug) => ({
      url: `${SITE_URL}/info/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.55,
    })),
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.45,
    },
    ...properties.map((property) => ({
      url: `${SITE_URL}/properties/${encodeURIComponent(property.id)}`,
      lastModified: property.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
