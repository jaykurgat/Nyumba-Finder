'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, CircleUserRound, House, ListPlus, LogOut, UserRound } from 'lucide-react';

type Props = { name: string; email: string | null; superlandlord: boolean };

export function AccountMenu({ name, email, superlandlord }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  async function signOut() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Could not sign out. Please try again.');
      setOpen(false);
      router.replace('/account?mode=login');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign out. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={rootRef} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <button type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e2e7df] bg-white px-2.5 text-[#3e4e42] shadow-sm transition hover:border-[#cbd6c8] hover:bg-[#f8faf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f28c28] sm:gap-2.5 sm:px-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf3ed] text-[#315c3d]"><UserRound className="h-4 w-4" aria-hidden="true" /></span>
        <span className="hidden max-w-28 truncate text-xs font-semibold xl:inline">{name}</span>
        <ChevronDown className={'hidden h-3.5 w-3.5 text-[#879388] transition-transform sm:block ' + (open ? 'rotate-180' : '')} aria-hidden="true" />
      </button>

      {open && <div aria-label="Account menu" className="absolute right-0 top-full z-[70] w-[min(88vw,290px)] overflow-hidden rounded-2xl border border-[#e1e7df] bg-white p-1.5 shadow-[0_18px_50px_rgba(26,43,31,.18)]">
        <div className="border-b border-[#edf0ea] px-3 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf3ed] text-[#315c3d]"><CircleUserRound className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#2b3c30]">{name}</p><p className="truncate text-[11px] text-[#79857b]">{email || 'NyumbaFinder account'}{superlandlord ? ' · Superlandlord' : ''}</p></div>
          </div>
        </div>
        <Link href="/account" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-[#4c5b50] transition hover:bg-[#f4f7f2] hover:text-[#244c2c]"><CircleUserRound className="h-4 w-4 text-[#78887b]" aria-hidden="true" />Account overview</Link>
        <Link href="/my-listings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-[#4c5b50] transition hover:bg-[#f4f7f2] hover:text-[#244c2c]"><House className="h-4 w-4 text-[#78887b]" aria-hidden="true" />{superlandlord ? 'Manage listings' : 'My listings'}</Link>
        <Link href="/list-property" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-[#4c5b50] transition hover:bg-[#f4f7f2] hover:text-[#244c2c]"><ListPlus className="h-4 w-4 text-[#78887b]" aria-hidden="true" />Add a property</Link>
        {error && <p role="alert" className="mx-2 mt-1 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] text-red-700">{error}</p>}
        <div className="mt-1 border-t border-[#edf0ea] pt-1">
          <button type="button" disabled={busy} onClick={() => void signOut()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#7e4b47] transition hover:bg-[#fff4f2] disabled:opacity-50"><LogOut className="h-4 w-4" aria-hidden="true" />{busy ? 'Signing out…' : 'Sign out'}</button>
        </div>
      </div>}
    </div>
  );
}
