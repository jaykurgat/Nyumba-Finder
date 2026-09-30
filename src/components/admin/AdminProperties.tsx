"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Row = {
  id: string; title: string; location: string; price: number; bedrooms: number; propertyType: string; status: string;
  images: string[]; promotion: { id: string; package: string; status: string; boost: number } | null;
};

const statuses = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'EXPIRED'];

export default function AdminProperties() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch('/api/admin/properties?q=' + encodeURIComponent(query));
    const data = await response.json();
    if (!response.ok) { setError(data.message || 'Unable to load listings.'); return; }
    setRows(data);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    const response = await fetch('/api/admin/properties', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }),
    });
    if (!response.ok) { const data = await response.json(); setError(data.message || 'Update failed.'); return; }
    setRows((current) => current.map((row) => row.id === id ? { ...row, status } : row));
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this listing permanently?')) return;
    const response = await fetch('/api/admin/properties?id=' + encodeURIComponent(id), { method: 'DELETE' });
    if (!response.ok) { const data = await response.json(); setError(data.message || 'Delete failed.'); return; }
    setRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <main className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4">
          <Link href="/admin" className="font-semibold">NyumbaFinder Admin</Link>
          <Link href="/admin/promotions" className="text-sm text-muted-foreground">Sponsored listings</Link>
          <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/admin/login'; }} className="ml-auto border px-3 py-2 text-sm">Sign out</button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="text-sm text-primary">Marketplace control</p><h1 className="mt-1 text-3xl font-semibold">Properties</h1></div>
          <div className="flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or location" className="h-10 w-64 border bg-background px-3 text-sm" /><button onClick={load} className="h-10 border bg-background px-4 text-sm">Search</button></div>
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <div className="mt-6 overflow-x-auto border bg-background">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Property</th><th className="p-3">Location</th><th className="p-3">Rent</th><th className="p-3">Status</th><th className="p-3">Promotion</th><th className="p-3">Actions</th></tr></thead>
            <tbody className="divide-y">
              {rows.map((row) => <tr key={row.id}>
                <td className="p-3"><Link className="font-medium hover:text-primary" href={'/properties/' + row.id}>{row.title}</Link><div className="text-xs text-muted-foreground">{row.propertyType} · {row.bedrooms === 0 ? 'Studio' : row.bedrooms + ' bed'}</div></td>
                <td className="p-3">{row.location}</td>
                <td className="p-3">KES {row.price.toLocaleString()}</td>
                <td className="p-3"><select value={row.status} onChange={(e) => updateStatus(row.id, e.target.value)} className="h-9 border bg-background px-2 text-xs">{statuses.map((status) => <option key={status}>{status}</option>)}</select></td>
                <td className="p-3">{row.promotion ? <span>{row.promotion.status} · +{row.promotion.boost}</span> : <span className="text-muted-foreground">None</span>}</td>
                <td className="p-3"><div className="flex gap-2"><Link href={'/list-property?edit=' + row.id} className="border px-3 py-2 text-xs">Edit</Link><button onClick={() => remove(row.id)} className="border border-destructive px-3 py-2 text-xs text-destructive">Delete</button></div></td>
              </tr>)}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No listings found.</p>}
        </div>
      </div>
    </main>
  );
}
