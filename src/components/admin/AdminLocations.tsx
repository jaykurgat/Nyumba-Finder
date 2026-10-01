"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminLocations() {
  const [counties, setCounties] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [form, setForm] = useState({ kind:'county', name:'', code:'', countyId:'', townId:'' });
  const load=async()=>{
    const [locations, pending] = await Promise.all([
      fetch('/api/admin/locations').then(r=>r.json()),
      fetch('/api/admin/location-submissions').then(r=>r.ok ? r.json() : []),
    ]);
    setCounties(Array.isArray(locations) ? locations : []);
    setSubmissions(Array.isArray(pending) ? pending : []);
  };
  useEffect(()=>{load();},[]);
  async function add(){
    const body={...form};
    const r=await fetch('/api/admin/locations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(r.ok){setForm({...form,name:'',code:''});load();}
  }
  async function review(id:string, action:'approve'|'reject'){
    const r=await fetch('/api/admin/location-submissions',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action})});
    if(r.ok) load();
  }
  const towns=counties.find(c=>c.id===form.countyId)?.towns||[];
  return <main className="min-h-screen bg-muted/20">
    <header className="border-b bg-background"><div className="mx-auto flex max-w-7xl gap-5 px-4 py-4"><Link href="/admin" className="font-semibold">NyumbaFinder Admin</Link><Link href="/admin/properties" className="text-sm text-muted-foreground">Properties</Link></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Locations</h1>
      <p className="mt-2 text-sm text-muted-foreground">Canonical Kenya geography plus reviewed user-submitted places.</p>

      {submissions.length > 0 && <section className="mt-6 border bg-background p-5">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold">Location submissions</h2><p className="text-sm text-muted-foreground">{submissions.length} waiting for review.</p></div></div>
        <div className="mt-4 space-y-3">
          {submissions.map((item:any)=><div key={item.id} className="border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><p className="font-medium">{item.proposedName}</p><p className="text-xs text-muted-foreground">{[item.suggestedParent?.name,item.suggestedParent?.countyName,item.context].filter(Boolean).join(' · ') || 'No parent/context supplied'}</p></div>
              <div className="flex gap-2"><button onClick={()=>review(item.id,'reject')} className="h-9 border px-4 text-sm hover:bg-muted">Reject</button><button onClick={()=>review(item.id,'approve')} className="h-9 bg-primary px-4 text-sm text-primary-foreground hover:opacity-90">Approve as new location</button></div>
            </div>
          </div>)}
        </div>
      </section>}

      <div className="mt-6 grid gap-3 border bg-background p-5 md:grid-cols-4">
        <select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})} className="h-10 border bg-background px-2 text-sm"><option value="county">County</option><option value="town">Town / City</option><option value="area">Area / Estate</option></select>
        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name" className="h-10 border px-3 text-sm"/>
        {form.kind==='county'?<input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="County code" className="h-10 border px-3 text-sm"/>:form.kind==='town'?<select value={form.countyId} onChange={e=>setForm({...form,countyId:e.target.value})} className="h-10 border bg-background px-2 text-sm"><option value="">County</option>{counties.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>:<select value={form.townId} onChange={e=>setForm({...form,townId:e.target.value})} className="h-10 border bg-background px-2 text-sm"><option value="">Town / City</option>{towns.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select>}
        <button onClick={add} className="h-10 bg-primary px-5 text-sm text-primary-foreground">Add location</button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">{counties.map(c=><div key={c.id} className="border bg-background p-5"><h2 className="font-semibold">{c.name}</h2><div className="mt-3 space-y-3">{c.towns.map((t:any)=><div key={t.id} className="border-l pl-3"><p className="font-medium">{t.name}</p><p className="mt-1 text-xs text-muted-foreground">{t.areas.map((a:any)=>a.name).join(' · ')||'No areas yet'}</p></div>)}</div></div>)}</div>
    </div>
  </main>;
}