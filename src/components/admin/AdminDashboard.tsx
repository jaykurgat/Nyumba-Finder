"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Dashboard = {
  total: number; active: number; pending: number; suspended: number; rejected: number; promotions: number;
  recentActivity: { id: string; action: string; entityType: string; entityId: string | null; createdAt: string }[];
};

const cards = [
  ['total', 'All listings'], ['active', 'Active'], ['pending', 'Pending review'],
  ['suspended', 'Suspended'], ['rejected', 'Rejected'], ['promotions', 'Active promotions'],
] as const;

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/dashboard').then(async (r) => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.message || 'Unable to load dashboard.');
      setData(body);
    }).catch((e) => setError(e.message));
  }, []);

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  if (error) return <main className="p-8">{error}</main>;
  if (!data) return <main className="p-8">Loading dashboard…</main>;

  return (
    <main className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4">
          <Link href="/admin" className="font-semibold">NyumbaFinder Admin</Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/admin/properties">Properties</Link>
            <Link href="/admin/promotions">Sponsored listings</Link>
            <Link href="/admin/reports">Reports</Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/locations">Locations</Link>
            <Link href="/admin/settings">Settings</Link>
          </nav>
          <button onClick={logout} className="ml-auto border px-3 py-2 text-sm">Sign out</button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div><p className="text-sm text-primary">Marketplace overview</p><h1 className="mt-1 text-3xl font-semibold">Dashboard</h1></div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([key, label]) => <div key={key} className="border bg-background p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{data[key]}</p></div>)}
        </div>
        <section className="mt-8 border bg-background p-6">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Recent activity</h2><Link href="/admin/properties" className="text-sm text-primary">Manage listings</Link></div>
          <div className="mt-4 divide-y">
            {data.recentActivity.length === 0 ? <p className="py-5 text-sm text-muted-foreground">No admin activity yet.</p> : data.recentActivity.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 py-3 text-sm"><span>{item.action}</span><span className="text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
