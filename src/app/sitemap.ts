import type { MetadataRoute } from 'next';
import { PrismaClient } from '@prisma/client';

const SITE_URL = 'https://www.nyumba-finder.com';

const infoPages = [
  'about',
  'how-it-works',
  'faq',
  'landlord-guidelines',
  'listing-rules',
  'report-listing',
  'safety-scams',
  'contact',
  'disclaimer',
  'terms',
  'cookies',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const prisma = new PrismaClient();

  try {
    const properties = await prisma.property.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    return [
      {
        url: SITE_URL,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${SITE_URL}/properties`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.95,
      },
      { url: `${SITE_URL}/promote`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.65 },
      ...infoPages.map((slug) => ({
        url: `${SITE_URL}/info/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.55,
      })),
      {
        url: `${SITE_URL}/privacy`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.45,
      },
      ...properties.map((property) => ({
        url: `${SITE_URL}/properties/${encodeURIComponent(property.id)}`,
        lastModified: property.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ];
  } finally {
    await prisma.$disconnect();
  }
}
