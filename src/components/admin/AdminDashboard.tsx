"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReportNotifications } from "@/components/notifications/ReportNotifications";

type Dashboard = {
  total: number; active: number; pending: number; suspended: number; rejected: number; promotions: number;
  recentActivity: { id: string; action: string; entityType: string; entityId: string | null; createdAt: string }[];
};

const groups = [
  { title: "Property management", description: "Review listings and manage marketplace visibility.", items: [
    { label: "Properties", href: "/admin/properties", description: "Edit listings, review status, partner source and property details." },
    { label: "AI property importer", href: "/admin/ai-importer", description: "Discover properties for sale from approved sources and review imports before publishing." },
    { label: "Partner directory", href: "/admin/partner-contacts", description: "Save and update partner company contacts, and associate them with properties." },
    { label: "Sponsored listings", href: "/admin/promotions", description: "Manage paid placements and promotion periods." },
    { label: "Reports", href: "/admin/reports", description: "Review reports and issues raised about listings." },
  ]},
  { title: "People & enquiries", description: "Manage the people using NyumbaFinder and their requests.", items: [
    { label: "Users", href: "/admin/users", description: "Review user accounts and access." },
    { label: "Agents", href: "/admin/agents", description: "Manage agent profiles and network access." },
    { label: "House Hunt", href: "/admin/house-requests", description: "Review renter requests and agent matching." },
  ]},
  { title: "Locations", description: "Maintain location data and review suggested additions.", items: [
    { label: "Location directory", href: "/admin/locations", description: "Manage the locations used in property searches." },
    { label: "Location submissions", href: "/admin/location-submissions", description: "Approve or reject user-submitted locations." },
    { label: "Map places & amenities", href: "/admin/map-amenities", description: "Manually pin schools, hospitals, malls, parks and other places on property maps." },
  ]},
  { title: "Communication & system", description: "Configure customer communications and review admin activity.", items: [
    { label: "Email Studio", href: "/admin/email-studio", description: "Draft, preview, test and publish House Hunt email templates." },
    { label: "Settings", href: "/admin/settings", description: "Manage platform settings." },
    { label: "Activity log", href: "/admin/activity", description: "See recent administrative changes." },
  ]},
];

const cards = [
  { key: "total", label: "All listings" }, { key: "active", label: "Active" },
  { key: "pending", label: "Pending review" }, { key: "suspended", label: "Suspended" },
  { key: "rejected", label: "Rejected" }, { key: "promotions", label: "Active promotions" },
] as const;

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const menuRootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openGroup) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !menuRootRef.current?.contains(event.target)) setOpenGroup(null);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [openGroup]);
  useEffect(() => {
    fetch("/api/admin/dashboard").then(async (r) => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.message || "Unable to load dashboard.");
      setData(body);
    }).catch((e) => setError(e.message));
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.map(group => ({ ...group, items: group.items.filter(item => (item.label + " " + item.description + " " + group.title).toLowerCase().includes(q)) })).filter(group => group.items.length);
  }, [query]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  if (error) return <main className="min-h-screen bg-[#f7f8f5] p-6 text-sm text-red-700">{error}</main>;
  if (!data) return <main className="min-h-screen bg-[#f7f8f5] p-6 text-sm text-[#647067]">Loading dashboard…</main>;

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#26372d]">
      <header className="border-b border-[#e2e6df] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-5 py-3">
          <Link href="/admin" className="mr-2 whitespace-nowrap text-base font-bold tracking-tight">NyumbaFinder <span className="font-medium text-[#788279]">Admin</span></Link>
          <div className="relative min-w-[220px] flex-1 md:max-w-md">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a867d]" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find an admin menu…" aria-label="Search admin menus" className="w-full rounded-lg border border-[#dfe4dc] bg-[#fafbf8] py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#6b9275] focus:bg-white" />
          </div>
          <ReportNotifications audience="admin" />
          <button onClick={logout} className="ml-auto rounded-lg border border-[#dfe4dc] px-3 py-2 text-sm font-medium hover:bg-[#f7f8f5]">Sign out</button>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#6a8b71]">Marketplace overview</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1></div>
          <p className="text-xs text-[#778278]">Admin workspace · {groups.reduce((n, g) => n + g.items.length, 0)} tools</p>
        </div>

        <section aria-label="Listing statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {cards.map(({ key, label }) => <div key={key} className="rounded-xl border border-[#e2e6df] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(25,40,28,0.03)]"><p className="text-xs font-medium text-[#748076]">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{data[key]}</p></div>)}
        </section>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.85fr)]">
          <section className="rounded-xl border border-[#e2e6df] bg-white">
            <div className="border-b border-[#edf0ea] px-4 py-3"><h2 className="font-semibold">Admin menus</h2><p className="mt-0.5 text-xs text-[#788279]">Point to a category or select it to open its tools.</p></div>
            <div ref={menuRootRef} className="flex flex-wrap gap-2 p-3">
              {filteredGroups.map(group => {
                const open = openGroup === group.title;
                return <div key={group.title} className="relative" onMouseEnter={() => setOpenGroup(group.title)} onMouseLeave={() => setOpenGroup(null)} onFocus={() => setOpenGroup(group.title)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenGroup(null); }} onKeyDown={event => { if (event.key === 'Escape') setOpenGroup(null); }}>
                  <button aria-expanded={open} aria-haspopup="true" onClick={() => setOpenGroup(group.title)} className={'inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86a08a] ' + (open ? 'border-[#bfd0c0] bg-[#f0f5ef] text-[#315c3d]' : 'border-[#e5e9e3] bg-white text-[#506052] hover:bg-[#f8faf7]')}>
                    {group.title}<span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] text-[#788279]">{group.items.length}</span><span aria-hidden="true" className={'text-[#849184] transition-transform ' + (open ? 'rotate-180' : '')}>⌄</span>
                  </button>
                  {open && <div className="absolute left-0 top-full z-30 w-[min(88vw,355px)] overflow-hidden rounded-xl border border-[#e1e7df] bg-white p-1.5 shadow-[0_16px_38px_rgba(26,43,31,.16)]">
                    <p className="px-3 pb-2 pt-2 text-[10px] leading-4 text-[#7a867c]">{group.description}</p>
                    {group.items.map(item => <Link key={item.href} href={item.href} onClick={() => setOpenGroup(null)} className="group flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 transition hover:bg-[#f4f7f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#86a08a]"><span><span className="block text-xs font-semibold text-[#34463a]">{item.label}</span><span className="mt-0.5 block text-[10px] leading-4 text-[#7a867c]">{item.description}</span></span><span aria-hidden="true" className="mt-0.5 text-xs text-[#98a397] transition group-hover:translate-x-0.5 group-hover:text-[#477653]">↗</span></Link>)}
                  </div>}
                </div>;
              })}
              {filteredGroups.length === 0 && <p className="w-full px-4 py-8 text-center text-sm text-[#788279]">No admin menus match “{query}”. Try a different word.</p>}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#e2e6df] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf0ea] px-4 py-3"><div><h2 className="font-semibold">Recent activity</h2><p className="mt-0.5 text-xs text-[#788279]">Latest changes in the admin workspace.</p></div><Link href="/admin/activity" className="whitespace-nowrap text-xs font-semibold text-[#477653] hover:underline">View log →</Link></div>
            <div className="divide-y divide-[#edf0ea]">
              {data.recentActivity.length === 0 ? <p className="px-4 py-6 text-sm text-[#788279]">No admin activity yet.</p> : data.recentActivity.slice(0, 8).map(item => <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3"><span className="min-w-0 text-sm leading-5">{item.action.replaceAll("_", " ").toLowerCase()}</span><time className="shrink-0 text-right text-[11px] leading-5 text-[#879188]">{new Date(item.createdAt).toLocaleDateString()}<br />{new Date(item.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time></div>)}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
