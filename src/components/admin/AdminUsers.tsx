"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => { fetch('/api/admin/users').then(r => r.json()).then(setUsers); }, []);
  return <main className="min-h-screen bg-muted/20"><header className="border-b bg-background"><div className="mx-auto flex max-w-7xl gap-5 px-4 py-4"><Link href="/admin" className="font-semibold">NyumbaFinder Admin</Link><Link href="/admin/properties" className="text-sm text-muted-foreground">Properties</Link></div></header><div className="mx-auto max-w-7xl px-4 py-8"><h1 className="text-3xl font-semibold">Users</h1><p className="mt-2 text-sm text-muted-foreground">Tenant and landlord accounts available to the platform.</p><div className="mt-6 overflow-x-auto border bg-background"><table className="w-full text-sm"><thead className="border-b text-left"><tr><th className="p-3">User</th><th className="p-3">Role/profile</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y">{users.map(u=><tr key={u.id}><td className="p-3">{u.profile?.displayName || [u.profile?.firstName,u.profile?.lastName].filter(Boolean).join(' ') || u.email || u.phone || u.id}</td><td className="p-3">{u.landlordProfile?'Landlord ':''}{u.tenantProfile?'Tenant':''}{!u.landlordProfile&&!u.tenantProfile?'—':''}</td><td className="p-3">{u.status}</td><td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>{users.length===0&&<p className="p-8 text-center text-sm text-muted-foreground">No user accounts yet.</p>}</div></div></main>;
}
