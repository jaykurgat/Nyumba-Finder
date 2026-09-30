"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.message || 'Unable to sign in.');
    else router.push('/admin');
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-16">
      <div className="mx-auto max-w-md border bg-background p-8 shadow-sm">
        <p className="text-sm font-medium text-primary">NyumbaFinder</p>
        <h1 className="mt-2 text-2xl font-semibold">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage listings, reviews and sponsored placements.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-2 h-11 w-full border bg-background px-3 outline-none focus:border-primary" />
          </label>
          <label className="block text-sm font-medium">Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-2 h-11 w-full border bg-background px-3 outline-none focus:border-primary" />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button disabled={loading} className="h-11 w-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
