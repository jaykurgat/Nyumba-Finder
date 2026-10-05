import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Homes for Rent, Sale & Short Stay in Kenya | NyumbaFinder',
  description:
    'Search homes for rent, sale and short stay in Kenya by town, area, budget, bedrooms, bathrooms and property type on NyumbaFinder.',
  alternates: {
    canonical: '/properties',
  },
};

export default function PropertiesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
