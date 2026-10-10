"use client";

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, Mail, ArrowRight, Loader2 } from 'lucide-react';

type Mode = 'login' | 'register' | 'forgot' | 'reset';
const inputClass = 'mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15';
const buttonClass = 'inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';

export function AccountForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const title = mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Choose a new password';
  const subtitle = mode === 'login' ? 'Sign in to your NyumbaFinder account.' : mode === 'register' ? 'Create one account for your NyumbaFinder journey.' : mode === 'forgot' ? 'We will send a secure reset link if an account matches your email.' : 'Choose a strong password you have not used here before.';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const endpoint = mode === 'login' ? 'login' : mode === 'register' ? 'register' : mode === 'forgot' ? 'forgot-password' : 'reset-password';
      const body = mode === 'login' || mode === 'forgot' ? { email, ...(mode === 'login' ? { password } : {}) } :
        mode === 'register' ? { email, password, name } : { token: search.get('token') || '', password };
      const response = await fetch('/api/auth/' + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
      setMessage(data.message || 'Signed in successfully.');
      if (mode === 'login' || mode === 'register') { router.push('/'); router.refresh(); }
      if (mode === 'reset') window.setTimeout(() => router.push('/account?mode=login&reset=success'), 900);
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }
  const authError = search.get('error');
  const notice = authError === 'google_not_configured' ? 'Google sign-in is not configured yet.' :
    authError === 'use_existing_signin' ? 'An account already uses this email. Sign in with your password, or use Forgot password.' :
    authError ? 'Google sign-in could not be completed. Please try again.' :
    search.get('reset') === 'success' ? 'Your password has been reset. Sign in with your new password.' : '';

  return <section className="mx-auto w-full max-w-md py-10 sm:py-16">
    <div className="mb-6 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LockKeyhole className="h-5 w-5" /></div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
    </div>
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
      {notice && <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
      {mode === 'login' && <>
        <a href="/api/auth/google/start" className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border bg-background px-4 text-sm font-medium transition hover:bg-muted">
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.5 0 6.3 1.2 8.6 3.4l6.4-6.4C35.1 2.5 30.1 0 24 0 14.6 0 6.5 5.4 3 13.2l7.5 5.8C12.2 13.1 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.4-4.6 7.1l7.4 5.7c4.3-4 6.9-9.9 6.9-17.3z"/><path fill="#FBBC05" d="M10.5 28.9A14.4 14.4 0 0 1 9.7 24c0-1.7.3-3.3.8-4.9L3 13.2A24 24 0 0 0 0 24c0 3.9.9 7.6 3 10.8l7.5-5.9z"/><path fill="#34A853" d="M24 48c6.1 0 11.2-2 15-6.2l-7.4-5.7c-2.1 1.4-4.6 2.3-7.6 2.3-6.4 0-11.8-3.6-13.5-9.5L3 34.8C6.5 43.1 14.6 48 24 48z"/></svg>
          Continue with Google
        </a>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />OR CONTINUE WITH EMAIL<span className="h-px flex-1 bg-border" /></div>
      </>}
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && <label className="block text-sm font-medium">Full name<input className={inputClass} value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={100} /></label>}
        {mode !== 'reset' && <label className="block text-sm font-medium">Email address<div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input className={inputClass + ' pl-9'} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></div></label>}
        {(mode === 'login' || mode === 'register' || mode === 'reset') && <label className="block text-sm font-medium">{mode === 'reset' ? 'New password' : 'Password'}<div className="relative"><LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input className={inputClass + ' pl-9 pr-10'} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={10} maxLength={128} required /><button type="button" className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{(mode === 'register' || mode === 'reset') && <span className="mt-1 block text-xs font-normal text-muted-foreground">Use at least 10 characters.</span>}</label>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
        <button className={buttonClass} type="submit" disabled={busy}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" />Please wait…</> : <>{mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Update password'}<ArrowRight className="h-4 w-4" /></>}</button>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        {mode === 'login' && <Link className="font-medium text-primary hover:underline" href="/account?mode=forgot">Forgot password?</Link>}
        {mode === 'login' && <Link className="text-muted-foreground hover:text-foreground" href="/account?mode=register">Create account</Link>}
        {mode === 'register' && <Link className="text-muted-foreground hover:text-foreground" href="/account?mode=login">Already have an account? Sign in</Link>}
        {(mode === 'forgot' || mode === 'reset') && <Link className="text-muted-foreground hover:text-foreground" href="/account?mode=login">Back to sign in</Link>}
      </div>
    </div>
  </section>;
}
