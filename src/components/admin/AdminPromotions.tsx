"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

type Promotion = {
  id: string; package: string; status: string; boost: number; targetLocation: string | null; targetType: string | null;
  minBedrooms: number | null; maxBedrooms: number | null; startsAt: string; endsAt: string;
  property: { id: string; title: string; location: string; propertyType: string };
};

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [properties, setProperties] = useState<{ id: string; title: string; location: string }[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ propertyId: '', package: 'Featured', boost: '20', targetLocation: '', targetType: '', minBedrooms: '', maxBedrooms: '', startsAt: '', endsAt: '', status: 'ACTIVE' });

  async function load() {
    const [promotionResponse, propertyResponse] = await Promise.all([fetch('/api/admin/promotions'), fetch('/api/admin/properties')]);
    const p = await promotionResponse.json(); const l = await propertyResponse.json();
    if (!promotionResponse.ok) { setError(p.message || 'Unable to load promotions.'); return; }
    setPromotions(p);
    setProperties((l || []).map((item: any) => ({ id: item.id, title: item.title, location: item.location })));
  }

  useEffect(() => { load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault(); setError('');
    const response = await fetch('/api/admin/promotions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok) { setError(data.message || 'Unable to create promotion.'); return; }
    setForm({ ...form, propertyId: '', targetLocation: '', targetType: '', minBedrooms: '', maxBedrooms: '' });
    load();
  }

  async function setStatus(id: string, status: string) {
    await fetch('/api/admin/promotions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    load();
  }

  return (
    <main className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4">
          <Link href="/admin" className="font-semibold">NyumbaFinder Admin</Link>
          <Link href="/admin/properties" className="text-sm text-muted-foreground">Properties</Link>
          <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/admin/login'; }} className="ml-auto border px-3 py-2 text-sm">Sign out</button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-semibold">Sponsored listings</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Paid placement adds a controlled boost to otherwise eligible results. Relevance, filters and listing status still determine eligibility.</p>
        <form onSubmit={create} className="mt-7 grid gap-4 border bg-background p-6 md:grid-cols-3">
          <label className="text-sm font-medium">Property<select required value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2">{<option value="">Choose property</option>}{properties.map((p) => <option key={p.id} value={p.id}>{p.title} — {p.location}</option>)}</select></label>
          <label className="text-sm font-medium">Package<select value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2"><option>Featured</option><option>Premium</option><option>Top Placement</option></select></label>
          <label className="text-sm font-medium">Ranking boost<input type="number" min="1" max="1000" value={form.boost} onChange={(e) => setForm({ ...form, boost: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2" /></label>
          <label className="text-sm font-medium">Target location<input value={form.targetLocation} onChange={(e) => setForm({ ...form, targetLocation: e.target.value })} placeholder="e.g. Kilimani" className="mt-2 h-10 w-full border bg-background px-2" /></label>
          <label className="text-sm font-medium">Target property type<input value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })} placeholder="e.g. Apartment" className="mt-2 h-10 w-full border bg-background px-2" /></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-sm font-medium">Min beds<input type="number" min="0" value={form.minBedrooms} onChange={(e) => setForm({ ...form, minBedrooms: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2" /></label><label className="text-sm font-medium">Max beds<input type="number" min="0" value={form.maxBedrooms} onChange={(e) => setForm({ ...form, maxBedrooms: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2" /></label></div>
          <label className="text-sm font-medium">Starts<input required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2" /></label>
          <label className="text-sm font-medium">Ends<input required type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2" /></label>
          <div className="flex items-end"><button className="h-10 bg-primary px-5 text-sm font-medium text-primary-foreground">Create promotion</button></div>
        </form>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <div className="mt-7 overflow-x-auto border bg-background">
          <table className="w-full min-w-[950px] text-sm">
            <thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Property</th><th className="p-3">Package</th><th className="p-3">Boost</th><th className="p-3">Target</th><th className="p-3">Period</th><th className="p-3">Status</th></tr></thead>
            <tbody className="divide-y">
              {promotions.map((p) => <tr key={p.id}><td className="p-3">{p.property.title}<div className="text-xs text-muted-foreground">{p.property.location}</div></td><td className="p-3">{p.package}</td><td className="p-3">+{p.boost}</td><td className="p-3">{[p.targetLocation, p.targetType].filter(Boolean).join(' · ') || 'All matching searches'}</td><td className="p-3">{new Date(p.startsAt).toLocaleDateString()} — {new Date(p.endsAt).toLocaleDateString()}</td><td className="p-3"><select value={p.status} onChange={(e) => setStatus(p.id, e.target.value)} className="h-9 border bg-background px-2 text-xs">{['DRAFT','ACTIVE','PAUSED','COMPLETED','CANCELLED'].map((s) => <option key={s}>{s}</option>)}</select></td></tr>)}
            </tbody>
          </table>
          {promotions.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No promotions yet.</p>}
        </div>
      </div>
    </main>
  );
}
