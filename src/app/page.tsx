"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { rememberSearchPreference } from '@/components/privacy/search-preferences';

const popularLocations = ['Kilimani', 'Kileleshwa', 'Roysambu', 'Kasarani', 'Westlands', 'Eldoret'];

export default function Home() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('Any type');
  const [bedrooms, setBedrooms] = useState('Any bedrooms');

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    rememberSearchPreference({ location, propertyType, bedrooms });

    const params = new URLSearchParams();
    if (location.trim()) params.set('location', location.trim());
    if (propertyType !== 'Any type') params.set('propertyType', propertyType);
    if (bedrooms !== 'Any bedrooms') params.set('minBedrooms', bedrooms);
    router.push(`/properties?${params.toString()}`);
  };

  return (
    <div className="w-full">
      <section className="relative overflow-hidden border bg-muted/30 px-6 py-16 md:px-12 md:py-24">
        <div className="absolute -right-24 -top-24 h-72 w-72 bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-primary">Find a place that fits your life</p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Find your next home in Kenya.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">Search rental homes by location, property type, budget and what matters around them.</p>
          </div>
          <form onSubmit={handleSearch} className="mt-10 bg-background p-3 shadow-xl md:flex md:items-center md:gap-2">
            <div className="flex flex-1 items-center border-b px-3 md:border-b-0 md:border-r">
              <MapPin className="mr-3 h-5 w-5 text-primary" />
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where do you want to live?" className="border-0 px-0 shadow-none focus-visible:ring-0" />
            </div>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="h-11 w-full border-0 bg-background px-3 text-sm outline-none md:w-40" aria-label="Property type">
              <option>Any type</option><option>Apartment</option><option>Bedsitter</option><option>House</option><option>Maisonette</option><option>Townhouse</option><option>Villa</option>
            </select>
            <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="h-11 w-full border-0 bg-background px-3 text-sm outline-none md:w-40" aria-label="Bedrooms">
              <option>Any bedrooms</option><option value="0">Studio</option><option value="1">1+ bedroom</option><option value="2">2+ bedrooms</option><option value="3">3+ bedrooms</option><option value="4">4+ bedrooms</option>
            </select>
            <Button type="submit" size="lg" className="mt-2 w-full md:mt-0 md:w-auto"><Search className="mr-2 h-4 w-4" />Search</Button>
          </form>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-muted-foreground">Popular:</span>
            {popularLocations.map((item) => <Link key={item} href={`/properties?location=${encodeURIComponent(item)}`} className="border bg-background px-3 py-1.5 transition-colors hover:border-primary hover:text-primary">{item}</Link>)}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-5xl py-14">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-sm font-medium text-primary">A simpler way to search</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Search around what matters</h2></div>
          <Button variant="ghost" asChild className="hidden sm:flex"><Link href="/properties">Browse houses <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <Link href="/properties" className="border bg-card p-6 transition-colors hover:border-primary"><MapPin className="h-5 w-5 text-primary" /><h3 className="mt-5 font-semibold">Choose your area</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Find homes by county, town, area and neighbourhood instead of guessing from listing titles.</p></Link>
          <Link href="/properties" className="border bg-card p-6 transition-colors hover:border-primary"><SlidersHorizontal className="h-5 w-5 text-primary" /><h3 className="mt-5 font-semibold">Filter what fits</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Narrow results by rent, bedrooms, property type and the features you actually need.</p></Link>
          <Link href="/properties" className="border bg-card p-6 transition-colors hover:border-primary"><Search className="h-5 w-5 text-primary" /><h3 className="mt-5 font-semibold">Explore nearby</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Radius-based search will make it easier to discover suitable homes around the places you care about.</p></Link>
        </div>
      </section>
      <section className="border-t py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div><h2 className="text-xl font-semibold">Have a house to rent?</h2><p className="mt-1 text-sm text-muted-foreground">Reach tenants searching for homes in your area.</p></div>
          <Button asChild><Link href="/list-property">List Your House</Link></Button>
        </div>
      </section>
    </div>
  );
}
