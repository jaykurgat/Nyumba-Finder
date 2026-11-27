'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, CircleHelp } from 'lucide-react';

type MenuLink = { label: string; href: string; description: string };
type Props = { signedIn: boolean };

function NavigationMenu({ label, links, active }: { label: string; links: MenuLink[]; active: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

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

  return (
    <div ref={rootRef} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
      <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(true)} className={'inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f28c28] focus-visible:ring-offset-2 ' + (active ? 'bg-[#edf3eb] text-[#244c2c]' : 'text-[#626b60] hover:bg-[#f0f2ec] hover:text-[#244c2c]')}>
        {label}<ChevronDown aria-hidden="true" className={'h-3.5 w-3.5 transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && <div className="absolute left-0 top-full z-[70] w-[min(88vw,330px)] overflow-hidden rounded-2xl border border-[#e1e7df] bg-white p-1.5 shadow-[0_18px_50px_rgba(26,43,31,.18)]">
        <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#8a958b]">{label}</p>
        {links.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="group flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#f4f7f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8fa98f]">
          <span className="min-w-0"><span className="block text-xs font-semibold text-[#34463a] group-hover:text-[#244c2c]">{item.label}</span><span className="mt-0.5 block text-[10px] leading-4 text-[#7a867c]">{item.description}</span></span>
          <ArrowUpRight aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9aa69b] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#477653]" />
        </Link>)}
      </div>}
    </div>
  );
}

export function PrimaryNavigation({ signedIn }: Props) {
  const pathname = usePathname();
  const exploreActive = pathname === '/find-a-house' || pathname === '/properties' || pathname.startsWith('/properties/') || pathname === '/saved';
  const landlordActive = pathname === '/list-property' || pathname === '/my-listings';
  const exploreLinks: MenuLink[] = [
    { label: 'Find a house', href: '/find-a-house', description: 'Tell us what you need and explore matching homes.' },
    { label: 'Browse properties', href: '/properties', description: 'View available homes across Kenya.' },
    { label: 'Saved homes', href: '/saved', description: 'Return to properties you have saved.' },
  ];
  const landlordLinks: MenuLink[] = [
    { label: 'List a property', href: '/list-property', description: 'Add a property to the NyumbaFinder marketplace.' },
    { label: signedIn ? 'Manage my listings' : 'Sign in to manage listings', href: signedIn ? '/my-listings' : '/account?mode=login', description: 'Edit your property details, photos and availability.' },
  ];

  return (
    <nav aria-label="Primary navigation" className="flex items-center gap-1">
      <NavigationMenu label="Find a home" links={exploreLinks} active={exploreActive} />
      <NavigationMenu label="For landlords" links={landlordLinks} active={landlordActive} />
      <Link href="/info/how-it-works" aria-current={pathname === '/info/how-it-works' ? 'page' : undefined} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-[13px] font-semibold text-[#626b60] transition hover:bg-[#f0f2ec] hover:text-[#244c2c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f28c28] focus-visible:ring-offset-2">
        <CircleHelp aria-hidden="true" className="h-4 w-4" />How it works
      </Link>
    </nav>
  );
}
