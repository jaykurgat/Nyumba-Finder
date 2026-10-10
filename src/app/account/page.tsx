import { Suspense } from 'react';
import { AccountForm } from '@/components/auth/AccountForm';
import { AccountDashboard } from '@/components/auth/AccountDashboard';
import { getCurrentUser } from '@/lib/user-auth';

type Search = Promise<{ mode?: string }>;

async function AccountContent({ searchParams }: { searchParams: Search }) {
  const [{ mode }, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (user) return <AccountDashboard user={user} />;
  const selected = mode === 'register' || mode === 'forgot' || mode === 'reset' ? mode : 'login';
  return <AccountForm mode={selected} />;
}

export default function AccountPage({ searchParams }: { searchParams: Search }) {
  return <Suspense fallback={<div className="mx-auto max-w-md py-16 text-center text-sm text-muted-foreground">Loading account…</div>}><AccountContent searchParams={searchParams} /></Suspense>;
}
