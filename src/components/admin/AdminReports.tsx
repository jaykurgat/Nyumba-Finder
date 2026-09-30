"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Report = { id: string; type: string; description: string | null; status: string; createdAt: string; property: { id: string; title: string; location: string; status: string } };

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const load = () => fetch('/api/admin/reports').then(r => r.json()).then(setReports);
  useEffect(() => { load(); }, []);
  async function update(id: string, status: string) {
    await fetch('/api/admin/reports', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    load();
  }
  return <main className="min-h-screen bg-muted/20"><header className="border-b bg-background"><div className="mx-auto flex max-w-7xl gap-5 px-4 py-4"><Link href="/admin" className="font-semibold">NyumbaFinder Admin</Link><Link href="/admin/properties" className="text-sm text-muted-foreground">Properties</Link></div></header><div className="mx-auto max-w-7xl px-4 py-8"><h1 className="text-3xl font-semibold">Reports & problems</h1><div className="mt-6 border bg-background"><table className="w-full text-sm"><thead className="border-b text-left"><tr><th className="p-3">Listing</th><th className="p-3">Issue</th><th className="p-3">Description</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y">{reports.map(r => <tr key={r.id}><td className="p-3"><Link href={'/properties/'+r.property.id} className="font-medium">{r.property.title}</Link><div className="text-xs text-muted-foreground">{r.property.location}</div></td><td className="p-3">{r.type}</td><td className="p-3">{r.description || '—'}</td><td className="p-3"><select value={r.status} onChange={e => update(r.id,e.target.value)} className="border bg-background px-2 py-2 text-xs">{['OPEN','REVIEWING','RESOLVED','DISMISSED'].map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table>{reports.length===0&&<p className="p-8 text-center text-sm text-muted-foreground">No reports.</p>}</div></div></main>;
}
