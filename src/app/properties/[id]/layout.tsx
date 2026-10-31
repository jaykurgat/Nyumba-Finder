import type { Metadata } from 'next';
import { PrismaClient } from '@prisma/client';

const SITE_URL = 'https://www.nyumba-finder.com';

type PropertySeoRecord = {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  listingType: string;
  pricePeriod: string | null;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string;
};

async function getPropertySeoRecord(id: string): Promise<PropertySeoRecord | null> {
  const prisma = new PrismaClient();
  try {
    return await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        price: true,
        listingType: true,
        pricePeriod: true,
        propertyType: true,
        bedrooms: true,
        bathrooms: true,
        status: true,
      },
    }) as PropertySeoRecord | null;
  } finally {
    await prisma.$disconnect();
  }
}

function getPriceLabel(property: PropertySeoRecord) {
  if (property.listingType === 'FOR_SALE') {
    return `KES ${property.price.toLocaleString()} for sale`;
  }
  if (property.listingType === 'SHORT_STAY') {
    return `KES ${property.price.toLocaleString()} per night`;
  }
  return `KES ${property.price.toLocaleString()} per ${property.pricePeriod === 'WEEK' ? 'week' : 'month'}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const property = await getPropertySeoRecord(id);

  if (!property || property.status !== 'ACTIVE') {
    return {
      title: 'Property | NyumbaFinder',
      robots: { index: false, follow: true },
    };
  }

  const summary = [
    property.propertyType,
    property.propertyType === 'Land' ? null : property.bedrooms === 0 ? 'studio' : property.bedrooms ? `${property.bedrooms}-bedroom` : null,
    property.price ? getPriceLabel(property) : null,
    property.location,
  ]
    .filter(Boolean)
    .join(' in ');

  const description = `${summary}. ${property.description.replace(/\s+/g, ' ').trim()}`.slice(0, 155);
  const url = `${SITE_URL}/properties/${encodeURIComponent(id)}`;

  return {
    title: `${property.title} | NyumbaFinder`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${property.title} | NyumbaFinder`,
      description,
      type: 'website',
      url,
      siteName: 'NyumbaFinder',
      locale: 'en_KE',
    },
    twitter: {
      card: 'summary',
      title: `${property.title} | NyumbaFinder`,
      description,
    },
  };
}

export default async function PropertyLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  const property = await getPropertySeoRecord(id);

  if (!property || property.status !== 'ACTIVE') {
    return children;
  }

  const url = `${SITE_URL}/properties/${encodeURIComponent(id)}`;
  const description = property.description.replace(/\s+/g, ' ').trim();
  const propertyType = property.propertyType || 'Rental property';
  const pageData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: property.title,
        description: description.slice(0, 300),
        inLanguage: 'en-KE',
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: { '@id': `${url}#property` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Properties', item: `${SITE_URL}/properties` },
          { '@type': 'ListItem', position: 3, name: property.title, item: url },
        ],
      },
      {
        '@type': 'Accommodation',
        '@id': `${url}#property`,
        name: property.title,
        description: description.slice(0, 300),
        url,
        accommodationCategory: propertyType,
        address: {
          '@type': 'PostalAddress',
          addressLocality: property.location,
          addressCountry: 'KE',
        },
        ...(property.propertyType !== 'Land' && property.bedrooms !== null ? { numberOfBedrooms: property.bedrooms } : {}),
        ...(property.propertyType !== 'Land' && property.bathrooms !== null ? { numberOfBathroomsTotal: property.bathrooms } : {}),
        offers: {
          '@type': 'Offer',
          url,
          price: property.price,
          priceCurrency: 'KES',
          category: property.listingType === 'FOR_SALE'
            ? 'For sale'
            : property.listingType === 'SHORT_STAY'
              ? 'Short stay'
              : 'For rent',
          availability: 'https://schema.org/InStock',
        },
      },
    ],
  };

  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageData).replace(/</g, '\\u003c') }}
      />
    </>
  );
}
