'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, CircleCheck, ExternalLink } from 'lucide-react';

type Notice = {
  id: string;
  title: string;
  message: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

type Props = { audience: 'account' | 'admin' };

export function ReportNotifications({ audience }: Props) {
  const [items, setItems] = useState<Notice[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/report-notifications', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load notifications.');
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load notifications.');
    }
  }, []);

  useEffect(() => {
    void load();
    const refreshId = window.setInterval(() => { void load(); }, 60_000);
    return () => window.clearInterval(refreshId);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const unreadCount = items.filter((item) => !item.readAt).length;

  async function markRead(id: string) {
    setBusy(true);
    try {
      const response = await fetch('/api/report-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Unable to update notification.');
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt } : item));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update notification.');
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      const response = await fetch('/api/report-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error('Unable to update notifications.');
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update notifications.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-[#4c5b50] transition hover:border-[#e1e8df] hover:bg-[#f0f4ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f28c28]"
      >
        <Bell className="h-[19px] w-[19px]" aria-hidden="true" />
        {unreadCount > 0 && <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#fbfaf6] bg-[#c93e36] px-1 text-[9px] font-bold leading-none text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && <section aria-label="Notifications" className="absolute right-0 top-full z-[70] w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-[#e2e7e0] bg-white shadow-[0_18px_55px_rgba(26,43,31,.2)]">
        <header className="flex items-center justify-between gap-3 border-b border-[#edf0ea] px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf3ed] text-[#315c3d]"><Bell className="h-4 w-4" aria-hidden="true" /></span>
            <div className="min-w-0"><h2 className="text-sm font-bold text-[#26372d]">Notifications</h2><p className="mt-0.5 text-[11px] text-[#7a867c]">{unreadCount ? `${unreadCount} new update${unreadCount === 1 ? '' : 's'}` : 'You’re up to date'}</p></div>
          </div>
          {unreadCount > 0 && <button type="button" disabled={busy} onClick={() => void markAllRead()} className="shrink-0 rounded-md px-2 py-1.5 text-[11px] font-semibold text-[#477653] hover:bg-[#f1f5ef] disabled:opacity-50">Mark all read</button>}
        </header>

        {error && <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-700">{error}</p>}
        {items.length === 0 ? <div className="flex flex-col items-center px-6 py-9 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f2f5f1] text-[#748575]"><CircleCheck className="h-5 w-5" aria-hidden="true" /></span>
          <p className="mt-3 text-sm font-semibold text-[#39483d]">You’re all caught up</p>
          <p className="mt-1 max-w-[250px] text-xs leading-5 text-[#7a867c]">Listing reports and important updates will show up here.</p>
        </div> : <div className="max-h-[min(65vh,440px)] overflow-y-auto overscroll-contain">
          {items.map((item) => <div key={item.id} className={'relative flex items-start gap-3 border-b border-[#f0f2ee] px-4 py-3.5 transition-colors last:border-b-0 ' + (item.readAt ? 'bg-white hover:bg-[#fafbf9]' : 'bg-[#f5f9f4] hover:bg-[#eef5ed]')}>
            <span aria-hidden="true" className={'mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ' + (item.readAt ? 'bg-[#f1f3ef] text-[#788579]' : 'bg-[#e6f0e3] text-[#315c3d]')}><Bell className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <Link href={item.href} onClick={() => { if (!item.readAt) void markRead(item.id); setOpen(false); }} className="block rounded-sm pr-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ca58d]">
                <span className="flex items-start gap-2"><span className={'text-[13px] leading-5 ' + (item.readAt ? 'font-medium text-[#35443a]' : 'font-bold text-[#26372d]')}>{item.title}</span><ExternalLink className="mt-1 h-3 w-3 shrink-0 text-[#879388]" aria-hidden="true" /></span>
                <span className="mt-0.5 line-clamp-2 block text-xs leading-[1.4rem] text-[#657267]">{item.message}</span>
                <time className="mt-1.5 block text-[10px] font-medium text-[#8a958b]">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</time>
              </Link>
            </div>
            {!item.readAt && <button type="button" disabled={busy} onClick={() => void markRead(item.id)} aria-label="Mark notification as read" title="Mark as read" className="absolute right-3 top-3 rounded-full p-1.5 text-[#627969] transition hover:bg-white hover:text-[#315c3d] disabled:opacity-50"><Check className="h-3.5 w-3.5" aria-hidden="true" /></button>}
          </div>)}
        </div>}
        <footer className="border-t border-[#edf0ea] bg-[#fbfcfa] px-4 py-2.5"><p className="text-center text-[10px] text-[#89938a]">{audience === 'admin' ? 'Admin workspace alerts' : 'Your account alerts'} · refreshes automatically</p></footer>
      </section>}
    </div>
  );
}
