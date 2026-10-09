"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Home as HomeIcon, MapPin, Search, SlidersHorizontal } from 'lucide-react';
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
      <section className="relative isolate overflow-hidden border-b bg-[#f5f2e9]">
        {/* Reserved media layer: a future hero photograph can occupy this panel without changing the content layout. */}
        <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 hidden w-[43%] lg:block">
          <div className="absolute inset-0 bg-[#dfe3d5]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,#f5f2e9_0%,rgba(245,242,233,0.18)_30%,rgba(245,242,233,0)_68%)]" />
          <div className="absolute inset-y-0 right-0 w-[78%] overflow-hidden">
            <div className="absolute -right-24 top-16 h-[30rem] w-[30rem] rounded-full border border-primary/20" />
            <div className="absolute right-0 top-28 h-[25rem] w-[25rem] rounded-full border border-primary/15" />
            <div className="absolute bottom-0 right-[8%] h-[20rem] w-[31rem]">
              <div className="absolute bottom-0 left-0 h-[72%] w-[29%] border border-primary/15 bg-white/35" />
              <div className="absolute bottom-0 left-[31%] h-full w-[38%] border border-primary/15 bg-white/45">
                <div className="grid grid-cols-3 gap-3 p-5 opacity-60">
                  {Array.from({ length: 15 }).map((_, index) => (
                    <span key={index} className="h-8 border border-primary/15 bg-primary/5" />
                  ))}
                </div>
              </div>
              <div className="absolute bottom-0 right-0 h-[62%] w-[25%] border border-primary/15 bg-white/30" />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 md:px-10 md:pb-16 md:pt-20 lg:px-12 lg:pt-24">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">NyumbaFinder · Kenya</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-foreground md:text-6xl lg:text-[5.25rem]">
              Find your next home in Kenya.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Search homes by location, property type and what matters most to you.
            </p>
          </div>

          <div className="relative z-10 mt-10 max-w-6xl">
            <form onSubmit={handleSearch} className="rounded-2xl border border-black/8 bg-white p-2 shadow-[0_22px_55px_-30px_rgba(31,41,31,0.45)] md:flex md:items-stretch">
              <div className="flex min-w-0 flex-1 items-center px-4 py-2 md:border-r">
                <MapPin className="mr-3 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <label htmlFor="home-location" className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Location</label>
                  <Input
                    id="home-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Town, area or neighbourhood"
                    className="h-7 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="min-w-0 px-4 py-2 md:w-52 md:border-r">
                <label htmlFor="home-property-type" className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Property type</label>
                <select id="home-property-type" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="h-7 w-full bg-white text-sm outline-none">
                  <option>Any type</option>
                  <option>Apartment</option>
                  <option>Bedsitter</option>
                  <option>House</option>
                  <option>Maisonette</option>
                  <option>Townhouse</option>
                  <option>Villa</option>
                </select>
              </div>

              <div className="min-w-0 px-4 py-2 md:w-48">
                <label htmlFor="home-bedrooms" className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Bedrooms</label>
                <select id="home-bedrooms" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="h-7 w-full bg-white text-sm outline-none">
                  <option>Any bedrooms</option>
                  <option value="0">Studio</option>
                  <option value="1">1+ bedroom</option>
                  <option value="2">2+ bedrooms</option>
                  <option value="3">3+ bedrooms</option>
                  <option value="4">4+ bedrooms</option>
                </select>
              </div>

              <Button type="submit" size="lg" className="mt-2 h-12 rounded-xl px-7 md:mt-0">
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <span className="text-muted-foreground">Popular:</span>
              {popularLocations.map((item) => (
                <Link
                  key={item}
                  href={`/properties?location=${encodeURIComponent(item)}`}
                  className="text-foreground/75 underline decoration-black/10 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary/40"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20 lg:px-12">
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
          <div className="group rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="mt-5 font-semibold">Choose your area</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Find homes by county, town, area and neighbourhood instead of guessing from listing titles.</p>
          </div>
          <div className="group rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <h3 className="mt-5 font-semibold">Filter what fits</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Narrow results by rent, bedrooms, property type and the features you actually need.</p>
          </div>
          <div className="group rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
            <Search className="h-5 w-5 text-primary" />
            <h3 className="mt-5 font-semibold">Explore nearby</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Search can use location and distance to surface suitable homes around the places you care about.</p>
          </div>
        </div>
      </section>

      <section className="border-t py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 md:grid-cols-2 md:px-10 lg:px-12">
          <div className="rounded-2xl border border-[#dfe4d8] bg-[#f5f6f0] p-6 sm:p-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#53694b]"><Search className="h-5 w-5" /></div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">Need help finding a home?</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Tell us your budget and preferred area. We'll match you with available rentals and help you explore your options.</p>
            <Button asChild className="mt-5 rounded-xl bg-[#53694b] hover:bg-[#43563c]"><Link href="/find-a-house">Find me a house <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
          <div className="rounded-2xl border bg-card p-6 sm:p-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary"><HomeIcon className="h-5 w-5" /></div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">Have a house to rent?</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Reach tenants searching for homes in your area by listing your property on NyumbaFinder.</p>
            <Button asChild variant="outline" className="mt-5 rounded-xl"><Link href="/list-property">List your house <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
