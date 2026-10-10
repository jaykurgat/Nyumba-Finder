import { Suspense } from 'react';
import { AccountForm } from '@/components/auth/AccountForm';

type Search = Promise<{ mode?: string }>;
async function AccountContent({ searchParams }: { searchParams: Search }) {
  const { mode } = await searchParams;
  const selected = mode === 'register' || mode === 'forgot' || mode === 'reset' ? mode : 'login';
  return <AccountForm mode={selected} />;
}
export default function AccountPage({ searchParams }: { searchParams: Search }) {
  return <Suspense fallback={<div className="mx-auto max-w-md py-16 text-center text-sm text-muted-foreground">Loading account…</div>}><AccountContent searchParams={searchParams} /></Suspense>;
}
