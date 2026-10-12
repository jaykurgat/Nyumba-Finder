"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, LogIn } from "lucide-react";
import { PropertyCard } from "@/components/properties/PropertyCard";
import type { Property } from "@/types/property";

export default function SavedListingsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/saved-properties", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          if (active) setSignedOut(true);
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load saved listings.");
        if (active) setProperties(data.properties || []);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load saved listings."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen bg-muted/20">
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-10">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.16em] text-primary">YOUR WISHLIST</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl"><Heart className="h-8 w-8 text-primary" /> Saved properties</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Keep the homes you like in one place so you can revisit them and compare your options.</p>
        </div>
        {loading ? <p className="py-12 text-center text-sm text-muted-foreground">Loading your saved properties…</p> :
          signedOut ? <section className="mx-auto max-w-lg rounded-2xl border bg-background p-8 text-center shadow-sm">
            <LogIn className="mx-auto h-9 w-9 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Sign in to see your wishlist</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Saved listings belong to your account, so they stay private and available when you return.</p>
            <Link href="/account?mode=login" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Sign in</Link>
          </section> :
          error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-background p-5 text-sm text-destructive">{error}</p> :
          properties.length ? <><p className="mb-5 text-sm text-muted-foreground">{properties.length} saved {properties.length === 1 ? "property" : "properties"}</p><div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{properties.map((property) => <PropertyCard key={property.id} property={property} initiallySaved />)}</div></> :
          <section className="rounded-2xl border bg-background px-6 py-14 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Your wishlist is empty</h2>
            <p className="mt-2 text-sm text-muted-foreground">Tap the heart on any property to keep it here for later.</p>
            <Link href="/properties" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Explore properties</Link>
          </section>}
      </div>
    </main>
  );
}
