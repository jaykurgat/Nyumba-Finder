'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';

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

  useEffect(() => { void load(); }, [load]);

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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update notifications.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Property report notifications" className={audience === 'admin'
      ? 'overflow-hidden rounded-xl border border-[#e2e6df] bg-white'
      : 'mb-5 overflow-hidden rounded-xl border border-[#e2e6df] bg-white shadow-sm'}>
      <header className="flex items-center justify-between gap-3 border-b border-[#edf0ea] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf3ed] text-[#315c3d]"><Bell className="h-4 w-4" /></span>
          <div><h2 className="text-sm font-semibold text-[#26372d]">Notifications</h2><p className="text-xs text-[#788279]">{unreadCount ? `${unreadCount} unread report${unreadCount === 1 ? '' : 's'}` : 'Listing report updates'}</p></div>
        </div>
        {unreadCount > 0 && <button type="button" disabled={busy} onClick={() => void markAllRead()} className="text-xs font-semibold text-[#477653] hover:underline disabled:opacity-50">Mark all read</button>}
      </header>
      {error ? <p role="alert" className="px-4 py-4 text-sm text-red-700">{error}</p>
        : items.length === 0 ? <p className="px-4 py-5 text-sm text-[#788279]">You’re all caught up. New listing reports will appear here.</p>
          : <div className="divide-y divide-[#edf0ea]">{items.slice(0, 8).map((item) => (
            <div key={item.id} className={'flex items-start gap-3 px-4 py-3 ' + (item.readAt ? 'bg-white' : 'bg-[#f7faf6]')}>
              <span className={'mt-1 h-2 w-2 shrink-0 rounded-full ' + (item.readAt ? 'bg-[#d8ded6]' : 'bg-[#df7547]')} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <Link href={item.href} onClick={() => { if (!item.readAt) void markRead(item.id); }} className="group flex items-start justify-between gap-2 text-sm font-semibold text-[#26372d] hover:text-[#477653]">
                  <span>{item.title}</span><ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                </Link>
                <p className="mt-1 text-xs leading-5 text-[#68766d]">{item.message}</p>
                <time className="mt-1 block text-[10px] text-[#879188]">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</time>
              </div>
              {!item.readAt && <button type="button" disabled={busy} onClick={() => void markRead(item.id)} aria-label="Mark notification as read" className="mt-1 rounded p-1 text-[#477653] hover:bg-[#edf3ed] disabled:opacity-50"><Check className="h-4 w-4" /></button>}
            </div>
          ))}</div>}
    </section>
  );
}

