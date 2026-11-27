'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, Home, Plus, RefreshCw, Search } from 'lucide-react';

type Listing = {
  id: string; title: string; location: string; price: number; propertyType: string; bedrooms: number;
  status: string; availability: 'AVAILABLE' | 'UNAVAILABLE' | 'SOLD'; createdAt: string;
  metadata?: { listedBy: { name: string | null; email: string | null } | null };
};
type View = 'LANDLORD' | 'SUPERLANDLORD' | 'ADMIN';

const statuses = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'EXPIRED'];
const pageSizes = [20, 50, 100, 200];
const displayStatus = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function MyListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [view, setView] = useState<View>('LANDLORD');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');

  async function load(nextPage = page) {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ q: query, status: statusFilter, availability: availabilityFilter, page: String(nextPage), pageSize: String(pageSize) });
    try {
      const response = await fetch('/api/landlord/listings?' + params, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load listings.');
      setListings(data.listings || []);
      setView(data.view || 'LANDLORD');
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load listings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(1); }, [statusFilter, availabilityFilter, pageSize]);
  const wideView = view !== 'LANDLORD';
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const exportHref = useMemo(() => {
    const params = new URLSearchParams({ q: query, status: statusFilter, availability: availabilityFilter, format: 'csv' });
    return '/api/landlord/listings?' + params;
  }, [query, statusFilter, availabilityFilter]);

  async function updateAvailability(listingId: string, availability: Listing['availability']) {
    setUpdatingId(listingId);
    setError('');
    try {
      const response = await fetch(`/api/properties/${encodeURIComponent(listingId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ availability }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update availability.');
      setListings((current) => current.map((listing) => listing.id === listingId ? { ...listing, availability: data.availability } : listing));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update availability.');
    } finally {
      setUpdatingId('');
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(1);
  }

  return (
    <main className="min-h-[70vh] bg-[#f7f8f5] px-4 py-7 text-[#27372d] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#738070]">{wideView ? 'Listing workspace' : 'Private workspace'}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{wideView ? 'Manage listings' : 'My listings'}</h1>
            <p className="mt-1 text-xs text-[#667265]">{total.toLocaleString()} {total === 1 ? 'listing' : 'listings'}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-2 rounded-full border border-[#dce2d8] bg-white px-3.5 text-xs font-medium hover:bg-[#f1f4ef]"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
            {wideView && <a href={exportHref} className="inline-flex h-9 items-center gap-2 rounded-full border border-[#dce2d8] bg-white px-3.5 text-xs font-semibold text-[#405643] hover:bg-[#f2f5f0]"><Download className="h-3.5 w-3.5" /> Export CSV</a>}
            <Link href="/list-property" className="inline-flex h-9 items-center gap-2 rounded-full bg-[#315c3d] px-3.5 text-xs font-semibold text-white hover:bg-[#264b31]"><Plus className="h-3.5 w-3.5" /> Add listing</Link>
          </div>
        </header>

        <section aria-label="Listing search and filters" className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#e1e6de] bg-white p-3 shadow-[0_4px_16px_rgba(42,61,43,.035)]">
          <form className="flex min-w-[220px] flex-1 gap-2" onSubmit={search}>
            <label className="relative min-w-0 flex-1"><span className="sr-only">Search properties{wideView ? ' or listing owners' : ''}</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#819080]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={wideView ? 'Search properties or owners' : 'Search my properties'} className="h-9 w-full rounded-lg border border-[#e1e6de] bg-[#fbfcfa] pl-9 pr-3 text-xs outline-none focus:border-[#315c3d]" /></label>
            <button className="h-9 rounded-lg bg-[#244c2c] px-3.5 text-xs font-semibold text-white hover:bg-[#193c21]">Search</button>
          </form>
          <label className="flex items-center gap-2 text-[11px] text-[#677466]">Review <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-lg border border-[#e1e6de] bg-white px-2 text-xs text-[#344538]"><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}</select></label>
          <label className="flex items-center gap-2 text-[11px] text-[#677466]">Availability <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)} className="h-9 rounded-lg border border-[#e1e6de] bg-white px-2 text-xs text-[#344538]"><option value="">All</option><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option><option value="SOLD">Sold</option></select></label>
        </section>

        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-white px-4 py-3 text-xs text-red-700">{error}{error.includes('sign in') && <Link href="/account?mode=login" className="ml-2 font-semibold underline">Sign in</Link>}</div>}
        {listings.length === 0 && !loading && !error ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#d7dfd5] bg-white px-5 py-12 text-center shadow-[0_8px_28px_rgba(42,61,43,.04)]">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf3ed] text-[#315c3d]"><Home className="h-5 w-5" /></span>
            <h2 className="mt-3 text-base font-semibold">{total === 0 && (query || statusFilter || availabilityFilter) ? 'No listings match these filters' : 'No listings yet'}</h2>
            {total === 0 && !query && !statusFilter && !availabilityFilter && <><p className="mt-1 text-sm text-[#71806f]">Your properties will appear here after you list them.</p><Link href="/list-property" className="mt-4 inline-flex h-9 items-center rounded-full bg-[#315c3d] px-4 text-xs font-semibold text-white">List a property</Link></>}
          </div>
        ) : (
          <section aria-label="Property listings" className="mt-4 overflow-hidden rounded-2xl border border-[#e1e6de] bg-white shadow-[0_8px_26px_rgba(42,61,43,.04)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="border-b border-[#e9ede6] bg-[#f7f9f6] text-[10px] font-semibold uppercase tracking-[.08em] text-[#768273]"><tr><th className="px-4 py-3">Property</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Price</th><th className="whitespace-nowrap px-4 py-3">Listed at</th>{wideView && <th className="px-4 py-3">Listing owner</th>}<th className="px-4 py-3">Review</th><th className="px-4 py-3">Availability</th><th className="px-4 py-3">Actions</th></tr></thead>
                <tbody className="divide-y divide-[#edf0ea]">
                  {listings.map((listing) => <tr key={listing.id} className="transition-colors hover:bg-[#fbfcfa]">
                    <td className="max-w-[240px] px-4 py-3"><span className="block truncate font-semibold text-[#314536]">{listing.title}</span><span className="mt-1 block truncate text-[10px] text-[#829080]">{listing.propertyType} · {listing.bedrooms === 0 ? 'Studio' : listing.bedrooms + ' bed'}</span></td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-[#5d695d]" title={listing.location}>{listing.location}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#315c3d]">KES {listing.price.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#5d695d]">{dateTime(listing.createdAt)}</td>
                    {wideView && <td className="max-w-[220px] px-4 py-3"><span className="block truncate font-medium text-[#3d4b3e]">{listing.metadata?.listedBy?.name || (listing.metadata?.listedBy ? 'Account holder' : 'Unlinked listing')}</span><span className="block truncate text-[10px] text-[#829080]">{listing.metadata?.listedBy?.email || '—'}</span></td>}
                    <td className="whitespace-nowrap px-4 py-3"><span className="rounded-full bg-[#f1f4ef] px-2.5 py-1 text-[10px] font-medium text-[#536453]">{displayStatus(listing.status)}</span></td>
                    <td className="px-4 py-3"><select aria-label={`Availability for ${listing.title}`} disabled={updatingId === listing.id} value={listing.availability} onChange={(event) => void updateAvailability(listing.id, event.target.value as Listing['availability'])} className="h-8 rounded-md border border-[#e1e6de] bg-white px-2 text-[10px] font-medium text-[#435240] disabled:opacity-50"><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option><option value="SOLD">Sold</option></select></td>
                    <td className="whitespace-nowrap px-4 py-3"><div className="flex items-center gap-1.5"><Link href={`/list-property?edit=${encodeURIComponent(listing.id)}`} className="rounded-full bg-[#315c3d] px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-[#264b31]">Edit</Link><Link href={`/properties/${encodeURIComponent(listing.id)}`} aria-label={`View ${listing.title}`} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#dce2d8] text-[#526456] hover:bg-[#f5f7f3]"><ExternalLink className="h-3.5 w-3.5" /></Link></div></td>
                  </tr>)}
                </tbody>
              </table>
              {loading && <p className="p-8 text-center text-xs text-[#788477]">Loading listings…</p>}
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9ede6] bg-[#fcfdfa] px-4 py-3 text-[11px] text-[#71806f]">
              <div className="flex items-center gap-2"><label htmlFor="landlord-page-size">Rows</label><select id="landlord-page-size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-8 rounded-md border border-[#e1e6de] bg-white px-2 text-xs text-[#344538]">{pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select><span>per page · {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total}</span></div>
              <div className="flex items-center gap-2"><button onClick={() => void load(Math.max(1, page - 1))} disabled={page <= 1 || loading} className="h-8 rounded-full border border-[#dce2d8] bg-white px-3 font-medium disabled:opacity-40">Previous</button><span>Page {page} of {pageCount}</span><button onClick={() => void load(Math.min(pageCount, page + 1))} disabled={page >= pageCount || loading} className="h-8 rounded-full border border-[#dce2d8] bg-white px-3 font-medium disabled:opacity-40">Next</button></div>
            </footer>
          </section>
        )}
      </div>
    </main>
  );
}

