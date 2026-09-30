"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminSettings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [key, setKey] = useState(''); const [value, setValue] = useState('');
  const load = () => fetch('/api/admin/settings').then(r => r.json()).then(setSettings);
  useEffect(() => { load(); }, []);
  async function save() {
    await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
    setKey(''); setValue(''); load();
  }
  return <main className="min-h-screen bg-muted/20"><header className="border-b bg-background"><div className="mx-auto flex max-w-7xl gap-5 px-4 py-4"><Link href="/admin" className="font-semibold">NyumbaFinder Admin</Link><Link href="/admin/properties" className="text-sm text-muted-foreground">Properties</Link></div></header><div className="mx-auto max-w-5xl px-4 py-8"><h1 className="text-3xl font-semibold">Site settings</h1><div className="mt-6 grid gap-3 border bg-background p-5 md:grid-cols-[1fr_2fr_auto]"><input value={key} onChange={e=>setKey(e.target.value)} placeholder="setting key" className="h-10 border px-3 text-sm"/><input value={value} onChange={e=>setValue(e.target.value)} placeholder="value" className="h-10 border px-3 text-sm"/><button onClick={save} className="h-10 bg-primary px-5 text-sm text-primary-foreground">Save</button></div><div className="mt-6 border bg-background divide-y">{settings.map(s=><div key={s.id} className="flex justify-between gap-4 p-4 text-sm"><span className="font-medium">{s.key}</span><span className="text-muted-foreground">{s.value}</span></div>)}{settings.length===0&&<p className="p-8 text-sm text-muted-foreground">No settings configured.</p>}</div></div></main>;
}
