"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { BarChart3, CalendarDays, Sparkles } from 'lucide-react';

type Promotion = {
  id: string; package: string; status: string; boost: number; targetLocation: string | null; targetType: string | null;
  minBedrooms: number | null; maxBedrooms: number | null; startsAt: string; endsAt: string;
  metrics?: { impressions: number; clicks: number; ctr: number };
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

  useEffect(() => {
    const propertyId = new URLSearchParams(window.location.search).get('property');
    if (propertyId) setForm((current) => ({ ...current, propertyId }));
    load();
  }, []);

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
    <main className="min-h-screen bg-[#f7f7f3]">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4">
          <Link href="/admin" className="font-semibold">NyumbaFinder Admin</Link>
          <Link href="/admin/properties" className="text-sm text-muted-foreground">Properties</Link>
          <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/admin/login'; }} className="ml-auto border px-3 py-2 text-sm">Sign out</button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /><p className="text-xs font-semibold uppercase tracking-[0.18em]">Promotion studio</p></div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Sponsored listings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Give an active listing additional visibility while keeping relevance, location and search filters in control.</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/list-property?adminPromote=1" className="inline-flex h-10 items-center rounded-xl border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted">Add a new property for sponsorship</Link><Link href="/admin/properties" className="inline-flex h-10 items-center rounded-xl border border-primary/20 bg-primary/[0.05] px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">Choose an existing property</Link></div>
        <form onSubmit={create} className="mt-7 grid gap-4 rounded-2xl border bg-background p-5 shadow-sm md:grid-cols-3 md:p-6">
          <label className="text-sm font-medium">Property<select required value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2">{<option value="">Choose property</option>}{properties.map((p) => <option key={p.id} value={p.id}>{p.title} — {p.location}</option>)}</select></label>
          <label className="text-sm font-medium">Package<select value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2"><option>Featured</option><option>Premium</option><option>Top Placement</option></select></label>
          <label className="text-sm font-medium">Ranking boost<input type="number" min="1" max="1000" value={form.boost} onChange={(e) => setForm({ ...form, boost: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2" /></label>
          <label className="text-sm font-medium">Target location<input value={form.targetLocation} onChange={(e) => setForm({ ...form, targetLocation: e.target.value })} placeholder="e.g. Kilimani" className="mt-2 h-10 w-full border bg-background px-2" /></label>
          <label className="text-sm font-medium">Target property type<input value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })} placeholder="e.g. Apartment" className="mt-2 h-10 w-full border bg-background px-2" /></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-sm font-medium">Min beds<input type="number" min="0" value={form.minBedrooms} onChange={(e) => setForm({ ...form, minBedrooms: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2" /></label><label className="text-sm font-medium">Max beds<input type="number" min="0" value={form.maxBedrooms} onChange={(e) => setForm({ ...form, maxBedrooms: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2" /></label></div>
          <label className="text-sm font-medium">Starts<input required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2" /></label>
          <label className="text-sm font-medium">Ends<input required type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="mt-2 h-10 w-full border bg-background px-2" /></label>
          <div className="flex items-end md:col-span-3"><button className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm"><Sparkles className="h-4 w-4" />Create sponsored placement</button></div>
        </form>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <div className="mt-8 grid gap-3 md:grid-cols-3"><div className="rounded-2xl border bg-background p-5 shadow-sm"><Sparkles className="h-5 w-5 text-primary" /><p className="mt-4 text-sm font-semibold">Premium visibility</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Sponsored placement is clearly labeled and receives a controlled ranking boost.</p></div><div className="rounded-2xl border bg-background p-5 shadow-sm"><BarChart3 className="h-5 w-5 text-primary" /><p className="mt-4 text-sm font-semibold">Measure performance</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Track impressions, clicks and click-through rate for each promotion.</p></div><div className="rounded-2xl border bg-background p-5 shadow-sm"><CalendarDays className="h-5 w-5 text-primary" /><p className="mt-4 text-sm font-semibold">Time-controlled</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Set a defined start and end date for every promotion.</p></div></div><div className="mt-8 overflow-x-auto rounded-2xl border bg-background shadow-sm">
          <table className="w-full min-w-[950px] text-sm">
            <thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Property</th><th className="p-3">Package</th><th className="p-3">Boost</th><th className="p-3">Target</th><th className="p-3">Period</th><th className="p-3">Performance</th><th className="p-3">Status</th></tr></thead>
            <tbody className="divide-y">
              {promotions.map((p) => <tr key={p.id}><td className="p-3">{p.property.title}<div className="text-xs text-muted-foreground">{p.property.location}</div></td><td className="p-3">{p.package}</td><td className="p-3">+{p.boost}</td><td className="p-3">{[p.targetLocation, p.targetType].filter(Boolean).join(' · ') || 'All matching searches'}</td><td className="p-3">{new Date(p.startsAt).toLocaleDateString()} — {new Date(p.endsAt).toLocaleDateString()}</td><td className="p-3">{p.metrics?.impressions ?? 0} views · {p.metrics?.clicks ?? 0} clicks · {((p.metrics?.ctr ?? 0) * 100).toFixed(1)}% CTR</td><td className="p-3"><select value={p.status} onChange={(e) => setStatus(p.id, e.target.value)} className="h-9 border bg-background px-2 text-xs">{['DRAFT','ACTIVE','PAUSED','COMPLETED','CANCELLED'].map((s) => <option key={s}>{s}</option>)}</select></td></tr>)}
            </tbody>
          </table>
          {promotions.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No promotions yet.</p>}
        </div>
      </div>
    </main>
  );
}
