"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type LocationSubmission = {
  id: string;
  name: string;
  level: string;
  createdAt: string;
  county: { id: string; name: string };
  parent: { id: string; name: string; level: string } | null;
};

export default function LocationSubmissionsPage() {
  const [locations, setLocations] = useState<LocationSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/location-submissions', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to load pending locations.');
      setLocations(body.locations || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load pending locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function review(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/location-submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to review this location.');
      setLocations((current) => current.filter((location) => location.id !== id));
      setNotice(action === 'approve'
        ? 'Location approved and made available in public suggestions.'
        : 'Location rejected and kept out of public suggestions.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to review this location.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <main className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-4">
          <Link href="/admin" className="font-semibold">NyumbaFinder Admin</Link>
          <Link href="/admin/locations" className="text-sm text-muted-foreground">Location master</Link>
          <span className="text-sm font-medium">Location submissions</span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-primary">Location master</p>
            <h1 className="mt-1 text-2xl font-semibold">Pending location submissions</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Review renter-submitted towns, estates, neighbourhoods and other places. Approval makes a location searchable; rejection keeps it private from public suggestions.
            </p>
          </div>
          <button onClick={() => void load()} className="border bg-background px-4 py-2 text-sm" disabled={loading}>Refresh</button>
        </div>
        {error && <p role="alert" className="mt-5 border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mt-5 border bg-background p-3 text-sm">{notice}</p>}
        <section className="mt-6 overflow-hidden border bg-background">
          {loading ? <p className="p-6 text-sm text-muted-foreground">Loading submissions…</p>
            : locations.length === 0 ? <div className="p-8 text-center"><h2 className="font-medium">No pending locations</h2><p className="mt-1 text-sm text-muted-foreground">New custom locations will appear here for review.</p></div>
            : <div className="divide-y">{locations.map((location) => (
              <article key={location.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="font-semibold">{location.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {location.level.replaceAll('_', ' ')} · {location.parent ? location.parent.name + ', ' : ''}{location.county.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(location.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button disabled={busyId === location.id} onClick={() => void review(location.id, 'reject')} className="border px-4 py-2 text-sm disabled:opacity-50">Reject</button>
                  <button disabled={busyId === location.id} onClick={() => void review(location.id, 'approve')} className="bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{busyId === location.id ? 'Saving…' : 'Approve location'}</button>
                </div>
              </article>
            ))}</div>}
        </section>
      </div>
    </main>
  );
}
