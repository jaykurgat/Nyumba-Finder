"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type CountyOption = { id: string; name: string };
type TownOption = { id: string; name: string; level: string; countyId: string };
type LocationSubmission = {
  id: string;
  name: string;
  level: string;
  createdAt: string;
  countyId: string;
  parentId: string | null;
  county: { id: string; name: string };
  parent: { id: string; name: string; level: string } | null;
  editName: string;
  editLevel: string;
  editCountyId: string;
  editParentId: string;
};

const locationTypes = [
  { value: 'TOWN', label: 'Town' },
  { value: 'CITY', label: 'City' },
  { value: 'ESTATE', label: 'Estate' },
  { value: 'NEIGHBORHOOD', label: 'Neighbourhood' },
  { value: 'AREA', label: 'Area' },
  { value: 'VILLAGE', label: 'Village' },
  { value: 'LOCALITY', label: 'Locality' },
];

export default function LocationSubmissionsPage() {
  const [locations, setLocations] = useState<LocationSubmission[]>([]);
  const [counties, setCounties] = useState<CountyOption[]>([]);
  const [towns, setTowns] = useState<TownOption[]>([]);
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
      setLocations((body.locations || []).map((location: LocationSubmission) => ({
        ...location,
        editName: location.name,
        editLevel: location.level,
        editCountyId: location.countyId || location.county.id,
        editParentId: location.parentId || '',
      })));
      setCounties(body.counties || []);
      setTowns(body.towns || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load pending locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function edit(id: string, field: 'editName' | 'editLevel' | 'editCountyId' | 'editParentId', value: string) {
    setLocations((current) => current.map((location) => location.id === id
      ? { ...location, [field]: value, ...(field === 'editCountyId' ? { editParentId: '' } : {}) }
      : location));
  }

  async function review(location: LocationSubmission, action: 'approve' | 'reject') {
    setBusyId(location.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/location-submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: location.id, action, name: location.editName, level: location.editLevel,
          countyId: location.editCountyId,
          parentId: ['TOWN', 'CITY'].includes(location.editLevel) ? null : location.editParentId || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to review this location.');
      setLocations((current) => current.filter((item) => item.id !== location.id));
      setNotice(action === 'approve'
        ? 'Location changes saved. The corrected location is now available in public suggestions.'
        : 'Location rejected and kept out of public suggestions. The associated property or request is unchanged.');
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
              Correct spelling, type, county and parent town/city before approval. Only approved locations become public verified suggestions; property listings remain independent of this review.
            </p>
          </div>
          <button onClick={() => void load()} className="border bg-background px-4 py-2 text-sm" disabled={loading}>Refresh</button>
        </div>
        {error && <p role="alert" className="mt-5 border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mt-5 border bg-background p-3 text-sm">{notice}</p>}
        <section className="mt-6 overflow-hidden border bg-background">
          {loading ? <p className="p-6 text-sm text-muted-foreground">Loading submissions…</p>
            : locations.length === 0 ? <div className="p-8 text-center"><h2 className="font-medium">No pending locations</h2><p className="mt-1 text-sm text-muted-foreground">New custom locations will appear here for review.</p></div>
            : <div className="divide-y">{locations.map((location) => {
              const townOptions = towns.filter((town) => town.countyId === location.editCountyId);
              const isTown = ['TOWN', 'CITY'].includes(location.editLevel);
              return (
                <article key={location.id} className="p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                    <div><h2 className="font-semibold">Review submitted location</h2><p className="mt-1 text-xs text-muted-foreground">Originally submitted as “{location.name}” · {new Date(location.createdAt).toLocaleString()}</p></div>
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">Pending review</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block text-xs font-medium">Corrected location name
                      <input value={location.editName} onChange={(event) => edit(location.id, 'editName', event.target.value)} maxLength={100} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm" />
                    </label>
                    <label className="block text-xs font-medium">Location type
                      <select value={location.editLevel} onChange={(event) => edit(location.id, 'editLevel', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm">
                        {locationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-medium">Parent county
                      <select value={location.editCountyId} onChange={(event) => edit(location.id, 'editCountyId', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm">
                        <option value="">Select county</option>{counties.map((county) => <option key={county.id} value={county.id}>{county.name}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-medium">Parent town/city {isTown ? '(not applicable)' : '(if known)'}
                      <select value={isTown ? '' : location.editParentId} disabled={isTown} onChange={(event) => edit(location.id, 'editParentId', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50">
                        <option value="">No parent town/city</option>{townOptions.map((town) => <option key={town.id} value={town.id}>{town.name} ({town.level.toLowerCase()})</option>)}
                      </select>
                    </label>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">County: {counties.find((county) => county.id === location.editCountyId)?.name || 'Select a county'}{!isTown && location.editParentId ? ' · Parent: ' + (townOptions.find((town) => town.id === location.editParentId)?.name || '') : ''}</p>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button disabled={busyId === location.id} onClick={() => void review(location, 'reject')} className="rounded-md border px-4 py-2 text-sm disabled:opacity-50">Reject</button>
                    <button disabled={busyId === location.id} onClick={() => void review(location, 'approve')} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{busyId === location.id ? 'Saving…' : 'Save changes & approve'}</button>
                  </div>
                </article>
              );
            })}</div>}
        </section>
      </div>
    </main>
  );
}
