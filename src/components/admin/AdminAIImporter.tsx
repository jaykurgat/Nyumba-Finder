"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Source = {
  id: string; name: string; baseUrl: string; listingUrl: string | null; enabled: boolean;
  accessApproved: boolean; redisplayAllowed: boolean; lastRunAt: string | null; lastError: string | null;
};
type Listing = {
  id: string; title: string; description: string; price: number | null; bedrooms: number | null;
  bathrooms: number | null; propertyType: string | null; location: string; sourceUrl: string;
  imageUrls: string[]; status: string; source: { name: string; redisplayAllowed: boolean };
  rawData: Record<string, unknown> | null;
};

const money = (value: number | null) => value == null ? "Price not detected" : "KES " + value.toLocaleString("en-KE");

export default function AdminAIImporter() {
  const [sources, setSources] = useState<Source[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [patterns, setPatterns] = useState("");
  const [accessApproved, setAccessApproved] = useState(false);
  const [redisplayAllowed, setRedisplayAllowed] = useState(false);
  const [enabled, setEnabled] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/ai-importer", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load importer.");
      setSources(data.sources || []); setListings(data.listings || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load importer."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function saveSource(event: React.FormEvent) {
    event.preventDefault(); setBusy("save"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/ai-importer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-source", name, baseUrl, listingUrl, listingPatterns: patterns.split("\n").map(v => v.trim()).filter(Boolean), accessApproved, redisplayAllowed, enabled, accessMethod: "AUTHORIZED_WEB" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save source.");
      setNotice("Source saved. It will only be scanned when enabled and approved.");
      setName(""); setBaseUrl(""); setListingUrl(""); setPatterns(""); setAccessApproved(false); setRedisplayAllowed(false); setEnabled(false);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save source."); }
    finally { setBusy(""); }
  }

  async function runSource(sourceName: string) {
    setBusy("run:" + sourceName); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/ai-importer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run-source", name: sourceName }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Source scan failed.");
      setNotice("Scan complete: " + data.discovered + " pages discovered, " + data.queued + " awaiting review, " + data.possibleDuplicates + " possible duplicates.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Source scan failed."); }
    finally { setBusy(""); }
  }

  async function review(id: string, action: "approve" | "reject") {
    setBusy(id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/ai-importer", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Review action failed.");
      setNotice(data.message || "Review saved."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Review action failed."); }
    finally { setBusy(""); }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f5] text-[#26372d]">
      <header className="border-b border-[#e2e7df] bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-4">
          <Link href="/admin" className="text-sm font-semibold">NyumbaFinder Admin</Link>
          <span className="text-sm text-[#839087]">/ AI property importer</span>
          <button onClick={() => void load()} className="ml-auto rounded-lg border border-[#dce4da] px-3 py-2 text-xs font-semibold hover:bg-[#f6f8f5]">Refresh</button>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] px-5 py-7">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#64856b]">Inventory discovery</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">AI property importer</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#718076]">Discover residential properties for sale from approved sources. Extracted listings remain private until you review and approve them.</p>
        </div>
        {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg border border-[#cbdcc9] bg-[#f0f6ee] px-4 py-3 text-sm text-[#426c49]">{notice}</p>}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
          <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-[0_2px_8px_rgba(31,48,35,.035)]">
            <div className="mb-4"><h2 className="text-lg font-semibold">Approved source websites</h2><p className="mt-1 text-xs leading-5 text-[#7a877d]">Add a website only when you have permission to access it automatically. Image reuse requires separate permission.</p></div>
            <div className="space-y-3">
              {sources.map(source => <div key={source.id} className="rounded-xl border border-[#edf0eb] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">{source.name}</p><p className="mt-0.5 break-all text-xs text-[#7b887e]">{source.baseUrl}</p></div><span className={"rounded-full px-2.5 py-1 text-[11px] font-semibold " + (source.enabled && source.accessApproved ? "bg-[#edf6eb] text-[#47734c]" : "bg-[#f4f1e9] text-[#8a7444]")}>{source.enabled && source.accessApproved ? "Ready to scan" : "Disabled / not approved"}</span></div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#78857b]"><span>{source.redisplayAllowed ? "Image reuse approved" : "No image reuse permission"}</span><button disabled={!source.enabled || !source.accessApproved || !!busy} onClick={() => void runSource(source.name)} className="rounded-lg bg-[#284b35] px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy === "run:" + source.name ? "Scanning…" : "Scan source"}</button></div>
                {source.lastError && <p className="mt-2 whitespace-pre-wrap text-xs text-red-700">{source.lastError}</p>}
              </div>)}
              {sources.length === 0 && <p className="rounded-xl border border-dashed border-[#dfe6dd] px-4 py-6 text-center text-sm text-[#829087]">No sources configured yet.</p>}
            </div>
          </div>

          <form onSubmit={saveSource} className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-[0_2px_8px_rgba(31,48,35,.035)]">
            <h2 className="text-lg font-semibold">Add a source</h2>
            <p className="mb-4 mt-1 text-xs leading-5 text-[#7a877d]">Start with one Kenyan property website or an authorized listing feed.</p>
            <label className="mb-3 block text-xs font-semibold text-[#59675d]">Source name<input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Partner property feed" className="mt-1.5 h-10 w-full rounded-lg border border-[#dce4da] px-3 text-sm font-normal outline-none focus:border-[#719579]" /></label>
            <label className="mb-3 block text-xs font-semibold text-[#59675d]">Website URL<input required type="url" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://example.co.ke" className="mt-1.5 h-10 w-full rounded-lg border border-[#dce4da] px-3 text-sm font-normal outline-none focus:border-[#719579]" /></label>
            <label className="mb-3 block text-xs font-semibold text-[#59675d]">Search / listings page URL<input required type="url" value={listingUrl} onChange={e => setListingUrl(e.target.value)} placeholder="https://example.co.ke/houses-for-sale" className="mt-1.5 h-10 w-full rounded-lg border border-[#dce4da] px-3 text-sm font-normal outline-none focus:border-[#719579]" /></label>
            <label className="mb-4 block text-xs font-semibold text-[#59675d]">Listing URL patterns (optional, one per line)<textarea value={patterns} onChange={e => setPatterns(e.target.value)} rows={2} placeholder="property/\d+&#10;listing/" className="mt-1.5 w-full rounded-lg border border-[#dce4da] px-3 py-2 text-sm font-normal outline-none focus:border-[#719579]" /></label>
            <div className="space-y-3 rounded-xl bg-[#f7f9f6] p-3">
              <label className="flex items-start gap-2 text-xs leading-5 text-[#59675d]"><input type="checkbox" checked={accessApproved} onChange={e => setAccessApproved(e.target.checked)} className="mt-0.5 accent-[#315a3d]" />I confirm Nyumba-Finder has permission to access this website/feed automatically.</label>
              <label className="flex items-start gap-2 text-xs leading-5 text-[#59675d]"><input type="checkbox" checked={redisplayAllowed} onChange={e => setRedisplayAllowed(e.target.checked)} className="mt-0.5 accent-[#315a3d]" />I have permission to reuse the source's property photographs on Nyumba-Finder.</label>
              <label className="flex items-start gap-2 text-xs leading-5 text-[#59675d]"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="mt-0.5 accent-[#315a3d]" />Enable scheduled / manual scans for this source.</label>
            </div>
            <button disabled={busy === "save"} className="mt-4 w-full rounded-lg bg-[#284b35] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy === "save" ? "Saving…" : "Save source"}</button>
          </form>
        </section>

        <section className="mt-7">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-semibold">Review queue</h2><p className="mt-1 text-xs text-[#7b887e]">Only approved listings can become public Nyumba-Finder properties.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#526456]">{listings.length} awaiting review</span></div>
          {loading ? <p className="rounded-xl border border-[#e1e7df] bg-white p-8 text-center text-sm text-[#7b887e]">Loading imported listings…</p> : listings.length === 0 ? <p className="rounded-xl border border-dashed border-[#dfe6dd] bg-white p-8 text-center text-sm text-[#829087]">No imported properties need review yet.</p> :
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{listings.map(item => <article key={item.id} className="overflow-hidden rounded-2xl border border-[#e1e7df] bg-white shadow-[0_2px_8px_rgba(31,48,35,.035)]">
              <div className="p-4">
                <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold uppercase tracking-wide text-[#66836b]">{item.source.name}</span><span className={"rounded-full px-2 py-1 text-[10px] font-semibold " + (item.status === "POSSIBLE_DUPLICATE" ? "bg-amber-50 text-amber-800" : "bg-[#eef5ec] text-[#4b714e]")}>{item.status === "POSSIBLE_DUPLICATE" ? "Possible duplicate" : "Needs review"}</span></div>
                <h3 className="mt-2 text-base font-semibold leading-6">{item.title}</h3>
                <p className="mt-1 text-sm font-semibold text-[#365f40]">{money(item.price)}</p>
                <p className="mt-2 text-xs text-[#78857b]">{item.location || "Location not detected"} · {item.propertyType || "Property type not detected"}</p>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#68766c]">{item.description || "No description extracted."}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[#718076]">{item.bedrooms != null && <span>{item.bedrooms} bedrooms</span>}{item.bathrooms != null && <span>{item.bathrooms} bathrooms</span>}</div>
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-[#477653] underline underline-offset-2">Open original listing ↗</a>
                {item.status === "POSSIBLE_DUPLICATE" && <p className="mt-2 text-xs text-amber-800">Compare this with existing listings before deciding. Automatic approval is disabled for possible duplicates.</p>}
                <div className="mt-4 flex gap-2 border-t border-[#edf0eb] pt-3">
                  <button disabled={!!busy || item.status === "POSSIBLE_DUPLICATE"} onClick={() => void review(item.id, "approve")} className="flex-1 rounded-lg bg-[#284b35] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{busy === item.id ? "Saving…" : "Approve & publish"}</button>
                  <button disabled={!!busy} onClick={() => void review(item.id, "reject")} className="rounded-lg border border-[#e4d8d4] px-3 py-2.5 text-xs font-semibold text-[#986254] disabled:opacity-40">Reject</button>
                </div>
              </div>
            </article>)}</div>}
        </section>
      </div>
    </main>
  );
}
