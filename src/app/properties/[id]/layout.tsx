import type { Metadata } from 'next';
import { PrismaClient } from '@prisma/client';

const SITE_URL = 'https://www.nyumba-finder.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const prisma = new PrismaClient();

  try {
    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        title: true,
        description: true,
        location: true,
        price: true,
        listingType: true,
        pricePeriod: true,
        propertyType: true,
        bedrooms: true,
        status: true,
      },
    });

    if (!property || property.status !== 'ACTIVE') {
      return {
        title: 'Property | NyumbaFinder',
        robots: { index: false, follow: true },
      };
    }

    const summary = [
      property.propertyType,
      property.bedrooms === 0 ? 'studio' : property.bedrooms ? `${property.bedrooms}-bedroom` : null,
      property.price
        ? property.listingType === 'FOR_SALE'
          ? `KES ${property.price.toLocaleString()} for sale`
          : property.listingType === 'SHORT_STAY'
            ? `KES ${property.price.toLocaleString()} per night`
            : `KES ${property.price.toLocaleString()} per ${property.pricePeriod === 'WEEK' ? 'week' : 'month'}`
        : null,
      property.location,
    ]
      .filter(Boolean)
      .join(' in ');

    const description =
      `${summary}. ${property.description.replace(/\\s+/g, ' ').trim()}`.slice(0, 155);

    return {
      title: `${property.title} | NyumbaFinder`,
      description,
      alternates: {
        canonical: `${SITE_URL}/properties/${encodeURIComponent(id)}`,
      },
      openGraph: {
        title: `${property.title} | NyumbaFinder`,
        description,
        type: 'website',
        url: `${SITE_URL}/properties/${encodeURIComponent(id)}`,
      },
    };
  } finally {
    await prisma.$disconnect();
  }
}

export default function PropertyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
