import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rental Homes in Kenya | NyumbaFinder',
  description:
    'Search rental homes in Kenya by town, area, budget, bedrooms, bathrooms and property type. Find homes worth viewing on NyumbaFinder.',
  alternates: {
    canonical: '/properties',
  },
};

export default function PropertiesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
