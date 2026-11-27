"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';

type Row = {
  id: string; title: string; location: string; price: number; bedrooms: number; propertyType: string; status: string; availability: 'AVAILABLE' | 'UNAVAILABLE' | 'SOLD';
  owner: { email: string | null; name: string | null } | null;
  listingCreatedAt: string;
};

const statuses = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'EXPIRED'];
const pageSizes = [20, 50, 100, 200];
const dateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function AdminProperties() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(nextPage = page) {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ q: query, status: statusFilter, availability: availabilityFilter, page: String(nextPage), pageSize: String(pageSize) });
    try {
      const response = await fetch('/api/admin/properties?' + params, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load listings.');
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load listings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(1); }, [statusFilter, availabilityFilter, pageSize]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const exportHref = useMemo(() => {
    const params = new URLSearchParams({ q: query, status: statusFilter, availability: availabilityFilter, format: 'csv' });
    return '/api/admin/properties?' + params;
  }, [query, statusFilter, availabilityFilter]);

  async function updateStatus(id: string, status: string) {
    const response = await fetch('/api/admin/properties', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }),
    });
    if (!response.ok) { const data = await response.json(); setError(data.message || 'Update failed.'); return; }
    setRows((current) => current.map((row) => row.id === id ? { ...row, status } : row));
  }

  async function updateAvailability(id: string, availability: Row['availability']) {
    setError('');
    const response = await fetch('/api/admin/properties', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, availability }),
    });
    if (!response.ok) { const data = await response.json(); setError(data.message || 'Availability update failed.'); return; }
    setRows((current) => current.map((row) => row.id === id ? { ...row, availability } : row));
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this listing permanently?')) return;
    const response = await fetch('/api/admin/properties?id=' + encodeURIComponent(id), { method: 'DELETE' });
    if (!response.ok) { const data = await response.json(); setError(data.message || 'Delete failed.'); return; }
    setRows((current) => current.filter((row) => row.id !== id));
    setTotal((current) => Math.max(0, current - 1));
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#28372d]">
      <header className="border-b border-[#e2e6df] bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-4 py-4 sm:px-6">
          <Link href="/admin" className="font-semibold">NyumbaFinder Admin</Link>
          <Link href="/admin/promotions" className="text-sm text-[#667265]">Sponsored listings</Link>
          <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/admin/login'; }} className="ml-auto rounded-full border border-[#dce2d8] px-3 py-2 text-xs font-medium">Sign out</button>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.17em] text-[#71806f]">Marketplace control</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Properties</h1><p className="mt-1 text-xs text-[#71806f]">{total.toLocaleString()} listings</p></div>
          <a href={exportHref} className="inline-flex h-9 items-center gap-2 rounded-full border border-[#dce2d8] bg-white px-3.5 text-xs font-semibold text-[#405643] hover:bg-[#f2f5f0]"><Download className="h-3.5 w-3.5" /> Export CSV</a>
        </div>

        <section aria-label="Listing search and filters" className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#e1e6de] bg-white p-3 shadow-[0_4px_16px_rgba(42,61,43,.035)]">
          <form className="flex min-w-[220px] flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); void load(1); }}>
            <label className="relative min-w-0 flex-1"><span className="sr-only">Search properties or listing owners</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#819080]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search properties or owners" className="h-9 w-full rounded-lg border border-[#e1e6de] bg-[#fbfcfa] pl-9 pr-3 text-xs outline-none focus:border-[#315c3d]" /></label>
            <button className="h-9 rounded-lg bg-[#244c2c] px-3.5 text-xs font-semibold text-white hover:bg-[#193c21]">Search</button>
          </form>
          <label className="flex items-center gap-2 text-[11px] text-[#677466]">Review <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-lg border border-[#e1e6de] bg-white px-2 text-xs text-[#344538]"><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
          <label className="flex items-center gap-2 text-[11px] text-[#677466]">Availability <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)} className="h-9 rounded-lg border border-[#e1e6de] bg-white px-2 text-xs text-[#344538]"><option value="">All</option><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option><option value="SOLD">Sold</option></select></label>
        </section>

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-3 text-xs text-red-700">{error}</p>}
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#e1e6de] bg-white shadow-[0_8px_26px_rgba(42,61,43,.04)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left text-xs">
              <thead className="border-b border-[#e9ede6] bg-[#f7f9f6] text-[10px] font-semibold uppercase tracking-[.08em] text-[#768273]"><tr><th className="px-4 py-3">Property</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Price</th><th className="whitespace-nowrap px-4 py-3">Listed at</th><th className="px-4 py-3">Listing owner</th><th className="px-4 py-3">Review</th><th className="px-4 py-3">Availability</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf0ea]">
                {rows.map((row) => <tr key={row.id} className="transition-colors hover:bg-[#fbfcfa]">
                  <td className="max-w-[260px] px-4 py-3"><Link className="block truncate font-semibold text-[#314536] hover:text-[#244c2c]" href={'/properties/' + row.id}>{row.title}</Link><span className="mt-1 block truncate text-[10px] text-[#829080]">{row.propertyType} · {row.bedrooms === 0 ? 'Studio' : row.bedrooms + ' bed'}</span></td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-[#5d695d]" title={row.location}>{row.location}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#315c3d]">KES {row.price.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#5d695d]">{dateTime(row.listingCreatedAt)}</td>
                  <td className="max-w-[220px] px-4 py-3"><span className="block truncate font-medium text-[#3d4b3e]">{row.owner?.name || (row.owner ? 'Account holder' : 'Unlinked listing')}</span><span className="block truncate text-[10px] text-[#829080]">{row.owner?.email || '—'}</span></td>
                  <td className="px-4 py-3"><select aria-label={'Review status for ' + row.title} value={row.status} onChange={(event) => void updateStatus(row.id, event.target.value)} className="h-8 max-w-[150px] rounded-md border border-[#e1e6de] bg-white px-2 text-[10px]">{statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></td>
                  <td className="px-4 py-3"><select aria-label={'Availability for ' + row.title} value={row.availability || 'AVAILABLE'} onChange={(event) => void updateAvailability(row.id, event.target.value as Row['availability'])} className="h-8 rounded-md border border-[#e1e6de] bg-white px-2 text-[10px]"><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option><option value="SOLD">Sold</option></select></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5"><Link href={'/list-property?edit=' + row.id} className="rounded-full border border-[#dce2d8] px-2.5 py-1.5 text-[10px] font-semibold hover:bg-[#f5f7f3]">Edit</Link><Link href={'/admin/promotions?property=' + row.id} className="rounded-full border border-[#dce2d8] px-2.5 py-1.5 text-[10px] font-semibold hover:bg-[#f5f7f3]">Promote</Link><button onClick={() => void remove(row.id)} className="rounded-full border border-red-200 px-2.5 py-1.5 text-[10px] font-semibold text-red-700 hover:bg-red-50">Delete</button></div></td>
                </tr>)}
              </tbody>
            </table>
            {!loading && rows.length === 0 && <p className="p-10 text-center text-xs text-[#788477]">No listings match these filters.</p>}
            {loading && <p className="p-8 text-center text-xs text-[#788477]">Loading listings…</p>}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9ede6] bg-[#fcfdfa] px-4 py-3 text-[11px] text-[#71806f]">
            <div className="flex items-center gap-2"><label htmlFor="admin-page-size">Rows</label><select id="admin-page-size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-8 rounded-md border border-[#e1e6de] bg-white px-2 text-xs text-[#344538]">{pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select><span>per page · {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total}</span></div>
            <div className="flex items-center gap-2"><button onClick={() => void load(Math.max(1, page - 1))} disabled={page <= 1 || loading} className="h-8 rounded-full border border-[#dce2d8] bg-white px-3 font-medium disabled:opacity-40">Previous</button><span>Page {page} of {pageCount}</span><button onClick={() => void load(Math.min(pageCount, page + 1))} disabled={page >= pageCount || loading} className="h-8 rounded-full border border-[#dce2d8] bg-white px-3 font-medium disabled:opacity-40">Next</button></div>
          </footer>
        </div>
      </div>
    </main>
  );
}

