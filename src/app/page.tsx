
"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Search } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      const params = new URLSearchParams();
      params.set('q', searchQuery.trim());
      router.push(`/properties?${params.toString()}`);
    } else {
      router.push('/properties'); // Go to all properties if search is empty
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-8 py-12 md:py-24">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-primary">
        Find Your Perfect Rental in Kenya
      </h1>
      {/* The descriptive paragraph below has been removed */}
      {/* 
      <p className="max-w-2xl text-lg text-muted-foreground">
        Search by location, keywords, or property features. Your next home is just a click away.
      </p> 
      */}

      <div className="w-full max-w-xl p-6">
        <form 
          onSubmit={handleSearch} 
          className="flex items-center space-x-2 border border-input rounded-lg p-2 shadow-lg bg-card focus-within:ring-2 focus-within:ring-ring"
          suppressHydrationWarning
        >
          <Search className="h-5 w-5 text-muted-foreground ml-2" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter location, e.g., Kilimani, or keywords like '3 bedroom waterfront'"
            className="flex-grow text-base border-0 focus:ring-0 focus-visible:ring-offset-0 focus-visible:ring-0 p-2"
            suppressHydrationWarning
          />
          <Button type="submit" size="lg" className="px-6">
            Search
          </Button>
        </form>
      </div>

      <div className="pt-8">
        <h2 className="text-2xl font-semibold mb-4">Are you a Landlord?</h2>
        <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/list-property">List Your Property</Link>
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">
          Or <Link href="/properties" className="underline hover:text-primary">view all available properties</Link>.
        </p>
      </div>
    </div>
  );
}
