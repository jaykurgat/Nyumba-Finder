"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, MapPin, Search, SlidersHorizontal } from 'lucide-react';
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
      <section className="relative isolate overflow-hidden border-b bg-[#f7f5ef]">
        {/* Dedicated hero visual layer: this can become an <Image> background later without changing the hero layout. */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(94,120,82,0.16),transparent_34%),radial-gradient(circle_at_12%_80%,rgba(196,174,124,0.16),transparent_30%)]" />
          <div className="absolute -right-28 top-10 h-[28rem] w-[28rem] rounded-full border border-primary/10 bg-white/30" />
          <div className="absolute -right-12 top-24 h-[24rem] w-[24rem] rounded-full border border-primary/10" />
          <div className="absolute right-12 top-36 h-[20rem] w-[20rem] rounded-full border border-primary/10" />

          <div className="absolute bottom-0 right-[7%] flex h-[23rem] w-[34rem] items-end gap-2 opacity-80">
            <div className="h-[58%] w-[17%] rounded-t-[2px] border border-primary/15 bg-white/55">
              <div className="grid grid-cols-2 gap-2 p-3 opacity-70">
                {Array.from({ length: 8 }).map((_, index) => (
                  <span key={index} className="h-7 rounded-[2px] border border-primary/15 bg-primary/5" />
                ))}
              </div>
            </div>
            <div className="h-[78%] w-[23%] rounded-t-[2px] border border-primary/15 bg-white/65">
              <div className="grid grid-cols-2 gap-2 p-3 opacity-70">
                {Array.from({ length: 10 }).map((_, index) => (
                  <span key={index} className="h-8 rounded-[2px] border border-primary/15 bg-primary/5" />
                ))}
              </div>
            </div>
            <div className="h-[48%] w-[15%] rounded-t-[2px] border border-primary/15 bg-white/50">
              <div className="grid grid-cols-2 gap-2 p-3 opacity-70">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span key={index} className="h-7 rounded-[2px] border border-primary/15 bg-primary/5" />
                ))}
              </div>
            </div>
            <div className="h-[68%] w-[21%] rounded-t-[2px] border border-primary/15 bg-white/60">
              <div className="grid grid-cols-2 gap-2 p-3 opacity-70">
                {Array.from({ length: 8 }).map((_, index) => (
                  <span key={index} className="h-8 rounded-[2px] border border-primary/15 bg-primary/5" />
                ))}
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#f7f5ef] to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-14 md:px-10 md:pb-24 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/65 px-3 py-1.5 text-xs font-medium tracking-wide text-primary shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Kenya's home search, made simpler
            </div>

            <h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-[-0.04em] text-foreground md:text-6xl lg:text-[4.5rem] lg:leading-[1.02]">
              Find a place that feels like home.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              Discover rental homes across Kenya by location, property type, budget and the places that matter to you.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Search by location</span>
              <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" />Filter what fits</span>
              <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Explore real homes</span>
            </div>
          </div>

          <div className="relative lg:justify-self-end lg:w-full lg:max-w-xl">
            <div className="rounded-[1.75rem] border border-black/5 bg-white/90 p-3 shadow-[0_24px_70px_-28px_rgba(38,48,37,0.45)] backdrop-blur-md">
              <div className="flex items-center gap-1 border-b px-2 pb-3">
                <span className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Find a home</span>
                <span className="px-4 py-2 text-sm text-muted-foreground">Explore locations</span>
              </div>

              <form onSubmit={handleSearch} className="space-y-3 p-2 pt-4">
                <div className="rounded-xl border bg-background px-4 py-2.5">
                  <label htmlFor="home-location" className="mb-1 block text-xs font-medium text-muted-foreground">Location</label>
                  <div className="flex items-center">
                    <MapPin className="mr-3 h-5 w-5 shrink-0 text-primary" />
                    <Input
                      id="home-location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Town, area or neighbourhood"
                      className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-background px-4 py-2.5">
                    <label htmlFor="home-property-type" className="mb-1 block text-xs font-medium text-muted-foreground">Property type</label>
                    <select id="home-property-type" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="h-8 w-full bg-background text-sm outline-none">
                      <option>Any type</option>
                      <option>Apartment</option>
                      <option>Bedsitter</option>
                      <option>House</option>
                      <option>Maisonette</option>
                      <option>Townhouse</option>
                      <option>Villa</option>
                    </select>
                  </div>

                  <div className="rounded-xl border bg-background px-4 py-2.5">
                    <label htmlFor="home-bedrooms" className="mb-1 block text-xs font-medium text-muted-foreground">Bedrooms</label>
                    <select id="home-bedrooms" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="h-8 w-full bg-background text-sm outline-none">
                      <option>Any bedrooms</option>
                      <option value="0">Studio</option>
                      <option value="1">1+ bedroom</option>
                      <option value="2">2+ bedrooms</option>
                      <option value="3">3+ bedrooms</option>
                      <option value="4">4+ bedrooms</option>
                    </select>
                  </div>
                </div>

                <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base">
                  <Search className="mr-2 h-4 w-4" />
                  Search homes
                </Button>
              </form>
            </div>

            <div className="absolute -bottom-7 -left-5 hidden rounded-2xl border border-black/5 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:block">
              <p className="text-xs text-muted-foreground">Start with a place</p>
              <p className="mt-0.5 text-sm font-semibold">Nairobi · Eldoret · Kisumu · Mombasa</p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-7 md:px-10">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-muted-foreground">Popular:</span>
            {popularLocations.map((item) => (
              <Link
                key={item}
                href={`/properties?location=${encodeURIComponent(item)}`}
                className="rounded-full border border-black/5 bg-white/65 px-3.5 py-1.5 transition-colors hover:border-primary/30 hover:bg-white hover:text-primary"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">A simpler way to search</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Search around what matters</h2>
          </div>
          <Button variant="ghost" asChild className="hidden sm:flex">
            <Link href="/properties">Browse houses <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <Link href="/properties" className="rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="mt-5 font-semibold">Choose your area</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Find homes by county, town, area and neighbourhood instead of guessing from listing titles.</p>
          </Link>
          <Link href="/properties" className="rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <h3 className="mt-5 font-semibold">Filter what fits</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Narrow results by rent, bedrooms, property type and the features you actually need.</p>
          </Link>
          <Link href="/properties" className="rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
            <Search className="h-5 w-5 text-primary" />
            <h3 className="mt-5 font-semibold">Explore nearby</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Radius-based search will make it easier to discover suitable homes around the places you care about.</p>
          </Link>
        </div>
      </section>

      <section className="border-t py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-6 md:flex-row md:items-center md:px-10">
          <div>
            <h2 className="text-xl font-semibold">Have a house to rent?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Reach tenants searching for homes in your area.</p>
          </div>
          <Button asChild><Link href="/list-property">List Your House</Link></Button>
        </div>
      </section>
    </div>
  );
}
