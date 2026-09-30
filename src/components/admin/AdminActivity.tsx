"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
export default function AdminActivity() {
  const [items,setItems]=useState<any[]>([]);
  useEffect(()=>{fetch('/api/admin/activity').then(r=>r.json()).then(setItems)},[]);
  return <main className="min-h-screen bg-muted/20"><header className="border-b bg-background"><div className="mx-auto flex max-w-7xl gap-5 px-4 py-4"><Link href="/admin" className="font-semibold">NyumbaFinder Admin</Link><Link href="/admin/properties" className="text-sm text-muted-foreground">Properties</Link></div></header><div className="mx-auto max-w-7xl px-4 py-8"><h1 className="text-3xl font-semibold">Activity log</h1><div className="mt-6 divide-y border bg-background">{items.map(i=><div key={i.id} className="grid gap-2 p-4 text-sm md:grid-cols-[220px_180px_1fr]"><span>{new Date(i.createdAt).toLocaleString()}</span><span className="font-medium">{i.action}</span><span className="text-muted-foreground">{i.entityType}{i.entityId?' · '+i.entityId:''}</span></div>)}{items.length===0&&<p className="p-8 text-sm text-muted-foreground">No activity recorded.</p>}</div></div></main>;
}
