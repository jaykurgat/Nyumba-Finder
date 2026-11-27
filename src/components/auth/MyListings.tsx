'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, ExternalLink, Home, Plus, RefreshCw } from 'lucide-react';

type Listing = {
  id: string; title: string; location: string; price: number; propertyType: string; bedrooms: number;
  status: string; availability: string; images: string[]; createdAt: string; updatedAt: string;
  metadata?: { ownerId: string | null; listingId: string; listedBy: { name: string | null; email: string | null; accountCreatedAt: string } | null };
};

const displayStatus = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

export function MyListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [view, setView] = useState<'LANDLORD' | 'SUPERLANDLORD' | 'ADMIN'>('LANDLORD');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/landlord/listings', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load listings.');
      setListings(data.listings || []);
      setView(data.view || 'LANDLORD');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load listings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  const wideView = view !== 'LANDLORD';

  async function updateAvailability(listingId: string, availability: string) {
    setUpdatingId(listingId);
    setError('');
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(listingId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ availability }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update availability.');
      setListings((current) => current.map((listing) => listing.id === listingId ? { ...listing, availability: data.availability, updatedAt: new Date().toISOString() } : listing));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update availability.');
    } finally {
      setUpdatingId('');
    }
  }

  return (
    <main className="min-h-[70vh] bg-[#f7f8f5] px-4 py-7 text-[#27372d] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#738070]">{wideView ? 'Listing workspace' : 'Private workspace'}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{wideView ? 'Manage listings' : 'My listings'}</h1>
            <p className="mt-1 text-sm text-[#667265]">{wideView ? 'Edit listing details, photos, and availability.' : 'Manage the properties listed from your account.'}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dce2d8] bg-white px-3 text-xs font-medium hover:bg-[#f1f4ef]"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
            <Link href="/list-property" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#315c3d] px-3 text-xs font-semibold text-white hover:bg-[#264b31]"><Plus className="h-3.5 w-3.5" /> Add listing</Link>
          </div>
        </header>

        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700">{error}{error.includes('sign in') && <Link href="/account?mode=login" className="ml-2 font-semibold underline">Sign in</Link>}</div>}
        {loading ? <div className="mt-6 rounded-xl border border-[#e3e7e0] bg-white p-6 text-sm text-[#687566]">Loading listings…</div> : !error && listings.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#d7dfd5] bg-white px-5 py-12 text-center shadow-[0_8px_28px_rgba(42,61,43,.04)]">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf3ed] text-[#315c3d]"><Home className="h-5 w-5" /></span>
            <h2 className="mt-3 text-base font-semibold">No listings yet</h2>
            <p className="mt-1 text-sm text-[#71806f]">Your properties will appear here after you list them.</p>
            <Link href="/list-property" className="mt-4 inline-flex h-9 items-center rounded-lg bg-[#315c3d] px-4 text-xs font-semibold text-white">List a property</Link>
          </div>
        ) : !error && (
          <section aria-label="Property listings" className="mt-6 grid gap-3">
            {listings.map((listing) => (
              <article key={listing.id} className="overflow-hidden rounded-xl border border-[#e2e7df] bg-white shadow-[0_5px_20px_rgba(42,61,43,.035)]">
                <div className="grid sm:grid-cols-[150px_1fr]">
                  <div className="relative h-36 bg-[#edf0eb] sm:h-full sm:min-h-[144px]">
                    {listing.images[0] ? <img src={listing.images[0]} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#849080]"><Home className="h-6 w-6" /></div>}
                    <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-[#435240]">{displayStatus(listing.status)}</span>
                  </div>
                  <div className="min-w-0 p-3.5 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0"><h2 className="truncate text-sm font-semibold sm:text-base">{listing.title}</h2><p className="mt-1 truncate text-xs text-[#6f7c6c]">{listing.location} · {listing.propertyType} · {listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bed`}</p></div>
                      <p className="shrink-0 text-sm font-semibold text-[#315c3d]">KSh {listing.price.toLocaleString()}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#768172]">
                      <label className="flex items-center gap-1.5">Availability <select aria-label={`Availability for ${listing.title}`} disabled={updatingId === listing.id} value={listing.availability} onChange={(event) => void updateAvailability(listing.id, event.target.value)} className="h-7 rounded-md border border-[#dce2d8] bg-white px-2 text-[10px] font-semibold text-[#435240] disabled:opacity-50"><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option><option value="SOLD">Sold</option></select></label>
                      <span>{listing.images.length} {listing.images.length === 1 ? 'photo' : 'photos'}</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Updated {dateLabel(listing.updatedAt)}</span>
                    </div>
                    {wideView && listing.metadata && <div className="mt-3 rounded-lg bg-[#f7f8f5] px-3 py-2 text-[10px] leading-4 text-[#667265]">
                      <p><strong className="font-semibold text-[#344538]">Listed by:</strong> {listing.metadata.listedBy?.name || 'Unlinked / legacy listing'}{listing.metadata.listedBy?.email ? ` · ${listing.metadata.listedBy.email}` : ''}</p>
                      {listing.metadata.listedBy && <p>Account ID {listing.metadata.ownerId || 'unlinked'} · Account created {dateLabel(listing.metadata.listedBy.accountCreatedAt)} · Listing created {dateLabel(listing.createdAt)}</p>}
                      <p className="truncate">Listing ID: {listing.metadata.listingId}</p>
                    </div>}
                    <div className="mt-3 flex gap-2">
                      <Link href={`/list-property?edit=${encodeURIComponent(listing.id)}`} className="inline-flex h-8 items-center rounded-lg bg-[#315c3d] px-3 text-[11px] font-semibold text-white hover:bg-[#264b31]">Edit details & photos</Link>
                      <Link href={`/properties/${encodeURIComponent(listing.id)}`} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#dce2d8] px-3 text-[11px] font-medium text-[#465545] hover:bg-[#f7f8f5]">View listing <ExternalLink className="h-3 w-3" /></Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

