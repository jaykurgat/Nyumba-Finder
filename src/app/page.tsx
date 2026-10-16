"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BedDouble, Home as HomeIcon, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { rememberSearchPreference } from '@/components/privacy/search-preferences';

const popularLocations = ['Kilimani', 'Kileleshwa', 'Roysambu', 'Kasarani', 'Westlands', 'Eldoret'];

type FeaturedHome = {
  id: string;
  title: string;
  location: string;
  price: number;
  bedrooms: number;
  images?: string[];
};

const formatPrice = (price: number) => new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
}).format(price);

export default function Home() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('Any type');
  const [bedrooms, setBedrooms] = useState('Any bedrooms');
  const [featuredHomes, setFeaturedHomes] = useState<FeaturedHome[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/properties')
      .then((response) => response.ok ? response.json() : [])
      .then((properties: FeaturedHome[]) => {
        if (!active || !Array.isArray(properties)) return;
        setFeaturedHomes(properties.filter((property) => property.images?.[0]).slice(0, 3));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

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
    <div className="w-full bg-[#fbfaf6] text-[#20271f]">
      <section className="border-b border-[#dfe2d8]">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.04fr_.96fr]">
          <div className="flex flex-col justify-center px-5 py-10 sm:px-8 sm:py-14 lg:min-h-[560px] lg:px-12 lg:py-16">
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#60715b]">
              <span className="h-px w-8 bg-[#f28c28]" />
              Homes across Kenya
            </div>
            <h1 className="mt-5 max-w-2xl text-[2.65rem] font-semibold leading-[.98] tracking-[-0.055em] sm:text-6xl lg:text-[4.65rem]">
              Find a place that feels <span className="font-normal italic text-[#4d6547]">like home.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-6 text-[#687066] sm:text-base">
              Rentals, short stays and local house-hunting help—built around how people actually look for homes in Kenya.
            </p>

            <form onSubmit={handleSearch} className="mt-8 overflow-hidden border border-[#cfd5c9] bg-white shadow-[0_16px_38px_-30px_rgba(25,40,22,.55)]">
              <div className="flex items-center gap-3 border-b border-[#e2e5dd] px-4 py-3">
                <MapPin className="h-4 w-4 shrink-0 text-[#23a455]" />
                <Input id="home-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where in Kenya do you want to live?" className="h-8 border-0 px-0 text-[15px] shadow-none focus-visible:ring-0" />
              </div>
              <div className="grid sm:grid-cols-[1fr_1fr_auto]">
                <label className="border-b border-[#e2e5dd] px-4 py-2.5 sm:border-b-0 sm:border-r">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-[#899087]">Property</span>
                  <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="mt-1 w-full bg-white text-sm outline-none">
                    <option>Any type</option><option>Apartment</option><option>Bedsitter</option><option>House</option><option>Maisonette</option><option>Townhouse</option><option>Villa</option>
                  </select>
                </label>
                <label className="px-4 py-2.5 sm:border-r">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-[#899087]">Bedrooms</span>
                  <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="mt-1 w-full bg-white text-sm outline-none">
                    <option>Any bedrooms</option><option value="0">Studio</option><option value="1">1+ bedroom</option><option value="2">2+ bedrooms</option><option value="3">3+ bedrooms</option><option value="4">4+ bedrooms</option>
                  </select>
                </label>
                <Button type="submit" className="m-2 h-11 rounded-none bg-[#244c2c] px-6 hover:bg-[#193c21]"><Search className="mr-2 h-4 w-4" />Find homes</Button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#6e756b]">
              <span className="font-medium text-[#353d33]">Try</span>
              {popularLocations.map((item) => <Link key={item} href={`/properties?location=${encodeURIComponent(item)}`} className="border-b border-[#cbd0c7] hover:border-[#f28c28] hover:text-[#244c2c]">{item}</Link>)}
            </div>
          </div>

          <div className="relative min-h-[350px] overflow-hidden bg-[#dfe4d8] lg:min-h-[560px]">
            {featuredHomes[0]?.images?.[0] ? (
              <Link href={`/properties/${featuredHomes[0].id}`} className="group absolute inset-0">
                <img src={featuredHomes[0].images![0]} alt={featuredHomes[0].title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">From our listings</p>
                  <div className="mt-2 flex items-end justify-between gap-4">
                    <div><h2 className="max-w-md text-xl font-semibold leading-tight">{featuredHomes[0].title}</h2><p className="mt-1 text-sm text-white/80">{featuredHomes[0].location}</p></div>
                    <p className="shrink-0 text-sm font-semibold">{formatPrice(featuredHomes[0].price)}</p>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="absolute inset-0 flex items-end bg-[#dfe4d8] p-8">
                <div className="max-w-sm border-l-2 border-[#f28c28] pl-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#596853]">NyumbaFinder</p><p className="mt-2 text-2xl font-semibold tracking-tight text-[#2d3b2a]">Real homes. Real neighbourhoods. Kenya.</p></div>
              </div>
            )}
            <div className="absolute right-0 top-0 bg-[#f28c28] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#2d251a]">Nyumba · Kenya</div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e0e3da] bg-[#244c2c] text-white">
        <div className="mx-auto grid max-w-7xl divide-y divide-white/15 md:grid-cols-[1.2fr_1fr] md:divide-x md:divide-y-0">
          <div className="flex items-center gap-5 px-5 py-6 sm:px-8 lg:px-12">
            <span className="text-3xl font-light text-[#f2a14b]">01</span>
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/55">House Hunt</p><h2 className="mt-1 text-lg font-semibold">Tell us what you need. We help look.</h2></div>
            <Button asChild variant="ghost" className="ml-auto rounded-none text-white hover:bg-white/10 hover:text-white"><Link href="/find-a-house"><ArrowRight className="h-5 w-5" /></Link></Button>
          </div>
          <div className="flex items-center gap-5 px-5 py-6 sm:px-8 lg:px-10">
            <span className="text-3xl font-light text-[#f2a14b]">02</span>
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/55">For landlords</p><h2 className="mt-1 text-lg font-semibold">Put your vacant home where renters look.</h2></div>
            <Button asChild variant="ghost" className="ml-auto rounded-none text-white hover:bg-white/10 hover:text-white"><Link href="/list-property"><ArrowRight className="h-5 w-5" /></Link></Button>
          </div>
        </div>
      </section>

      {featuredHomes.length > 1 && (
        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12 lg:py-12">
          <div className="grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
            <div className="flex flex-col justify-between border-t-2 border-[#244c2c] pt-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#60715b]">Fresh on NyumbaFinder</p>
                <h2 className="mt-3 max-w-sm text-3xl font-semibold leading-[1.05] tracking-[-.035em]">A quick look at homes on the market.</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#70776d]">Start with real listings, then narrow by the neighbourhood, budget and features that matter to you.</p>
              </div>
              <Link href="/properties" className="mt-5 inline-flex items-center text-sm font-semibold text-[#244c2c]">Browse all homes <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {featuredHomes.slice(1, 3).map((home) => (
                <Link href={`/properties/${home.id}`} key={home.id} className="group">
                  <div className="aspect-[4/3] overflow-hidden bg-[#e6e8e1]"><img src={home.images![0]} alt={home.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" /></div>
                  <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#d9ddd4] py-3">
                    <div className="min-w-0"><h3 className="truncate text-sm font-semibold">{home.title}</h3><p className="mt-1 truncate text-xs text-[#747b71]">{home.location}</p></div>
                    <div className="text-right"><p className="text-sm font-semibold">{formatPrice(home.price)}</p><p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-[#747b71]"><BedDouble className="h-3 w-3" /> {home.bedrooms || 'Studio'}</p></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-y border-[#e0e3da] bg-white">
        <div className="mx-auto grid max-w-7xl md:grid-cols-3">
          {[
            ['01', 'Start local', 'Search by county, town, estate or neighbourhood—not vague listing titles.', MapPin],
            ['02', 'Narrow it down', 'Use rent, bedrooms, property type and practical features to find a better fit.', SlidersHorizontal],
            ['03', 'Need a hand?', 'House Hunt connects your budget and preferred area with local rental support.', HomeIcon],
          ].map(([number, title, copy, Icon], index) => {
            const FeatureIcon = Icon as typeof MapPin;
            return <div key={title as string} className={`px-5 py-7 sm:px-8 lg:px-10 ${index < 2 ? 'border-b border-[#e0e3da] md:border-b-0 md:border-r' : ''}`}>
              <div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-[.18em] text-[#9aa097]">{number as string}</span><FeatureIcon className="h-4 w-4 text-[#23a455]" /></div>
              <h3 className="mt-5 text-lg font-semibold">{title as string}</h3><p className="mt-2 text-sm leading-6 text-[#71786e]">{copy as string}</p>
            </div>;
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-9 sm:px-8 lg:px-12">
        <div className="grid items-center gap-6 border-l-2 border-[#f28c28] bg-[#f0f2eb] px-5 py-6 md:grid-cols-[1fr_auto] md:px-7">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#64725e]">Local professionals</p><h2 className="mt-1.5 text-xl font-semibold tracking-tight">Know your area? Help renters find a home there.</h2><p className="mt-1.5 max-w-2xl text-sm text-[#6f776b]">Join the NyumbaFinder Agent Network and receive House Hunt enquiries matched to your coverage areas and rent range.</p></div>
          <Button asChild className="rounded-none bg-[#244c2c] hover:bg-[#193c21]"><Link href="/agents/join">Join the network <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>
    </div>
  );
}
