import { PropertySearchForm } from '@/components/properties/PropertySearchForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-8">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-primary">
        Find Your Perfect Rental in Kenya
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Search through thousands of listings across Kenya. Your next home is just a click away.
      </p>

      <div className="w-full max-w-2xl p-6 bg-card rounded-lg shadow-md border">
         <PropertySearchForm />
      </div>

      <div className="pt-8">
        <h2 className="text-2xl font-semibold mb-4">Are you a Landlord?</h2>
        <Button size="lg" asChild>
          <Link href="/list-property">List Your Property</Link>
        </Button>
      </div>

      {/* Placeholder for Featured Listings - Implement later */}
      {/* <section className="w-full pt-12">
        <h2 className="text-3xl font-semibold mb-6">Featured Properties</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Map through featured properties here */}
        {/*</div>
      </section> */}
    </div>
  );
}
