"use client";

import Link from "next/link";
import QuickImportPanel from "./QuickImportPanel";
import { useEffect, useState } from "react";

type Source = {
  id: string; name: string; baseUrl: string; listingUrl: string | null; listingPatterns: string[]; enabled: boolean;
  accessApproved: boolean; redisplayAllowed: boolean; lastRunAt: string | null; lastError: string | null;
};
type ScanItem = { id: string; url: string; status: string; attempts: number; error: string | null; updatedAt: string; };
type Scan = { id: string; status: string; discovered: number; processed: number; queued: number; possibleDuplicates: number; rejected: number; failed: number; source: { name: string }; items: ScanItem[]; };
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
  const [scans, setScans] = useState<Scan[]>([]);
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
  const [editingId, setEditingId] = useState("");
  const [editingListingId, setEditingListingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editPropertyType, setEditPropertyType] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/ai-importer", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load importer.");
      setSources(data.sources || []); setListings(data.listings || []); setScans(data.scans || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load importer."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function saveSource(event: React.FormEvent) {
    event.preventDefault(); setBusy("save"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/ai-importer", {
        method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: editingId ? "update-source" : "save-source", id: editingId || undefined, name, baseUrl, listingUrl, listingPatterns: patterns.split("\n").map(v => v.trim()).filter(Boolean), accessApproved, redisplayAllowed, enabled, accessMethod: "AUTHORIZED_WEB" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save source.");
      setNotice(editingId ? "Source updated." : "Source saved. It will only be scanned when enabled and approved.");
      resetSourceForm();
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save source."); }
    finally { setBusy(""); }
  }

  function resetSourceForm() {
    setEditingId(""); setName(""); setBaseUrl(""); setListingUrl(""); setPatterns("");
    setAccessApproved(false); setRedisplayAllowed(false); setEnabled(false);
  }

  function editSource(source: Source) {
    setEditingId(source.id); setName(source.name); setBaseUrl(source.baseUrl);
    setListingUrl(source.listingUrl || ""); setPatterns((source.listingPatterns || []).join("\n")); setAccessApproved(source.accessApproved);
    setRedisplayAllowed(source.redisplayAllowed); setEnabled(source.enabled);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeSource(source: Source) {
    if (!window.confirm("Remove " + source.name + "? Sources with import history cannot be deleted; you can disable those instead.")) return;
    setBusy("delete:" + source.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/ai-importer?id=" + encodeURIComponent(source.id), { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not remove source.");
      setNotice(data.message || "Source removed.");
      if (editingId === source.id) resetSourceForm();
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not remove source."); }
    finally { setBusy(""); }
  }

  async function processScan(scanId: string) {
    let finished = false;
    while (!finished) {
      const response = await fetch("/api/admin/ai-importer/worker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scanId }) });
      const raw = await response.text();
      let data: any;
      try { data = JSON.parse(raw); } catch { throw new Error("Worker HTTP " + response.status + " returned non-JSON: " + raw.slice(0, 240)); }
      if (!response.ok) throw new Error(data.message || "Scan worker failed (HTTP " + response.status + ").");
      if (data.scan) { const s = data.scan; setNotice("Processing: " + s.processed + "/" + s.discovered + " · " + s.queued + " queued · " + s.possibleDuplicates + " duplicates · " + s.failed + " failed."); }
      finished = data.done === true;
      if (data.busy) await new Promise(resolve => setTimeout(resolve, 1000));
      await load();
    }
    setNotice("Scan completed. Check the scan totals and review queue.");
  }

  async function runSource(sourceName: string) {
    setBusy("run:" + sourceName); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/ai-importer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start-scan", name: sourceName }) });
      const raw = await response.text(); let data: any;
      try { data = JSON.parse(raw); } catch { throw new Error("Scan start HTTP " + response.status + " returned non-JSON: " + raw.slice(0, 240)); }
      if (!response.ok) throw new Error(data.message || "Could not start scan.");
      await load(); await processScan(data.scan.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Source scan failed."); await load(); }
    finally { setBusy(""); }
  }

  async function resumeScan(scanId: string) {
    setBusy("scan:" + scanId); setError("");
    try { await processScan(scanId); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to resume scan."); }
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

  async function saveListingEdits(id: string) {
    setBusy("edit:" + id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/ai-importer", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        id, action: "edit-listing", title: editTitle, description: editDescription,
        price: editPrice === "" ? null : Number(editPrice), location: editLocation, propertyType: editPropertyType,
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save listing edits.");
      setEditingListingId(""); setNotice("Listing corrections saved. Review it again before approval."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save listing edits."); }
    finally { setBusy(""); }
  }

  function beginListingEdit(item: Listing) {
    setEditingListingId(item.id); setEditTitle(item.title); setEditDescription(item.description || "");
    setEditPrice(item.price == null ? "" : String(item.price)); setEditLocation(item.location || "");
    setEditPropertyType(item.propertyType || "");
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
        <QuickImportPanel onImported={() => { void load(); setNotice("Quick import saved. Review the generated listing below before approving it."); }} />

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
          <div className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-[0_2px_8px_rgba(31,48,35,.035)]">
            <div className="mb-4"><h2 className="text-lg font-semibold">Approved source websites</h2><p className="mt-1 text-xs leading-5 text-[#7a877d]">Add a website only when you have permission to access it automatically. Image reuse requires separate permission.</p></div>
            <div className="space-y-3">
              {sources.map(source => <div key={source.id} className="rounded-xl border border-[#edf0eb] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">{source.name}</p><p className="mt-0.5 break-all text-xs text-[#7b887e]">{source.baseUrl}</p></div><span className={"rounded-full px-2.5 py-1 text-[11px] font-semibold " + (source.enabled && source.accessApproved ? "bg-[#edf6eb] text-[#47734c]" : "bg-[#f4f1e9] text-[#8a7444]")}>{source.enabled && source.accessApproved ? "Ready to scan" : "Disabled / not approved"}</span></div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#78857b]"><span>{source.redisplayAllowed ? "Image reuse approved" : "No image reuse permission"}</span><div className="flex flex-wrap gap-2"><button disabled={!!busy} onClick={() => editSource(source)} className="rounded-lg border border-[#dce4da] px-3 py-2 font-semibold text-[#365f40] disabled:opacity-40">Edit</button><button disabled={!!busy} onClick={() => void removeSource(source)} className="rounded-lg border border-[#eadbd6] px-3 py-2 font-semibold text-[#986254] disabled:opacity-40">{busy === "delete:" + source.id ? "Removing…" : "Remove"}</button><button disabled={!source.enabled || !source.accessApproved || !!busy} onClick={() => void runSource(source.name)} className="rounded-lg bg-[#284b35] px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy === "run:" + source.name ? "Scanning…" : "Scan source"}</button></div></div>
                {source.lastError && <p className="mt-2 whitespace-pre-wrap text-xs text-red-700">{source.lastError}</p>}
              </div>)}
              {sources.length === 0 && <p className="rounded-xl border border-dashed border-[#dfe6dd] px-4 py-6 text-center text-sm text-[#829087]">No sources configured yet.</p>}
            </div>
          </div>

          <form onSubmit={saveSource} className="rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-[0_2px_8px_rgba(31,48,35,.035)]">
            <h2 className="text-lg font-semibold">{editingId ? "Edit source" : "Add a source"}</h2>
            <p className="mb-4 mt-1 text-xs leading-5 text-[#7a877d]">Start with one Kenyan property website or an authorized listing feed.</p>
            <label className="mb-3 block text-xs font-semibold text-[#59675d]">Source name<input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Partner property feed" className="mt-1.5 h-10 w-full rounded-lg border border-[#dce4da] px-3 text-sm font-normal outline-none focus:border-[#719579]" /></label>
            <label className="mb-3 block text-xs font-semibold text-[#59675d]">Website URL<input required type="url" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://example.co.ke" className="mt-1.5 h-10 w-full rounded-lg border border-[#dce4da] px-3 text-sm font-normal outline-none focus:border-[#719579]" /></label>
            <label className="mb-3 block text-xs font-semibold text-[#59675d]">Search / listings page URL<input required type="url" value={listingUrl} onChange={e => setListingUrl(e.target.value)} placeholder="https://example.co.ke/houses-for-sale" className="mt-1.5 h-10 w-full rounded-lg border border-[#dce4da] px-3 text-sm font-normal outline-none focus:border-[#719579]" /></label>
            <label className="mb-4 block text-xs font-semibold text-[#59675d]">Listing URL patterns (optional, one per line)<textarea value={patterns} onChange={e => setPatterns(e.target.value)} rows={2} placeholder="property/\d+&#10;listing/" className="mt-1.5 w-full rounded-lg border border-[#dce4da] px-3 py-2 text-sm font-normal outline-none focus:border-[#719579]" /></label>
            <div className="space-y-3 rounded-xl bg-[#f7f9f6] p-3">
              <label className="flex items-start gap-2 text-xs leading-5 text-[#59675d]"><input type="checkbox" checked={accessApproved} onChange={e => setAccessApproved(e.target.checked)} className="mt-0.5 accent-[#315a3d]" />I confirm Nyumba-Finder has permission to access this website/feed automatically.</label>
              <label className="flex items-start gap-2 text-xs leading-5 text-[#59675d]"><input type="checkbox" checked={redisplayAllowed} onChange={e => setRedisplayAllowed(e.target.checked)} className="mt-0.5 accent-[#315a3d]" />I have permission to reuse the source's property photographs on Nyumba-Finder.</label>
              <label className="flex items-start gap-2 text-xs leading-5 text-[#59675d]"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="mt-0.5 accent-[#315a3d]" />Allow manual scans for this source.</label>
            </div>
            <button disabled={busy === "save"} className="mt-4 w-full rounded-lg bg-[#284b35] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy === "save" ? "Saving…" : editingId ? "Save changes" : "Save source"}</button>{editingId && <button type="button" onClick={resetSourceForm} className="mt-2 w-full rounded-lg border border-[#dce4da] px-4 py-2.5 text-sm font-semibold text-[#526456]">Cancel editing</button>}
          </form>
        </section>

        <section className="mt-7">
          <div className="mb-3"><h2 className="text-xl font-semibold">Scan activity</h2><p className="mt-1 text-xs text-[#7b887e]">Saved listing jobs can be resumed without repeating completed work.</p></div>
          <div className="grid gap-3 md:grid-cols-2">
            {scans.map(scan => <div key={scan.id} className="rounded-xl border border-[#e1e7df] bg-white p-4">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">{scan.source.name}</p><span className="text-[11px] font-semibold uppercase text-[#64856b]">{scan.status}</span></div>
              <p className="mt-2 text-xs text-[#718076]">{scan.processed}/{scan.discovered} processed · {scan.queued} queued · {scan.possibleDuplicates} duplicates · {scan.failed} failed</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf1eb]"><div className="h-full rounded-full bg-[#668c6c]" style={{ width: (scan.discovered ? Math.min(100, scan.processed / scan.discovered * 100) : 0) + "%" }} /></div>
              {["PROCESSING","QUEUED"].includes(scan.status) && <button disabled={!!busy} onClick={() => void resumeScan(scan.id)} className="mt-3 rounded-lg bg-[#284b35] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy === "scan:" + scan.id ? "Processing…" : "Resume scan"}</button>}
              {scan.items?.some(item => item.status === "FAILED" && item.attempts < 5 && item.error?.includes("AI extraction service returned HTTP 503")) && <button disabled={!!busy} onClick={async () => { setBusy("retry:" + scan.id); try { const r = await fetch("/api/admin/ai-importer/worker", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scanId: scan.id, action: "retry-failed" }) }); const d = await r.json(); if (!r.ok) throw new Error(d.message || "Could not retry temporary AI failures."); await load(); if (d.retried > 0) { setNotice("Retrying " + d.retried + " temporary AI failure(s). " + d.skipped + " other failure(s) left untouched."); await processScan(scan.id); } } catch (e) { setError(e instanceof Error ? e.message : "Could not retry temporary AI failures."); } finally { setBusy(""); } }} className="ml-2 mt-3 rounded-lg border border-[#dce4da] px-3 py-2 text-xs font-semibold text-[#365f40] disabled:opacity-40">{busy === "retry:" + scan.id ? "Retrying…" : "Retry temporary AI failures"}</button>}
              <div className="mt-4 border-t border-[#edf0eb] pt-3">
                <p className="mb-2 text-xs font-semibold text-[#526456]">Discovered URLs and results ({scan.items?.length || 0})</p>
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {(scan.items || []).map(item => <div key={item.id} className="rounded-lg border border-[#edf0eb] bg-[#fbfcfa] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={"rounded-full px-2 py-1 text-[10px] font-semibold " + (item.status === "FAILED" ? "bg-red-50 text-red-700" : item.status === "COMPLETED" ? "bg-[#edf6eb] text-[#47734c]" : "bg-[#f4f1e9] text-[#8a7444]")}>{item.status}</span>
                      <span className="text-[10px] text-[#829087]">Attempt {item.attempts}</span>
                    </div>
                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs font-medium text-[#477653] underline underline-offset-2">{item.url}</a>
                    {item.error && <div className="mt-2"><p className="text-[11px] font-semibold text-red-700">{item.error.includes("HTTP 403") ? "Source access denied" : item.error.includes("HTTP 503") ? "Temporary AI service unavailable" : "Processing failure"}</p><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-red-700">Failure reason: {item.error}</p>{item.error.includes("HTTP 403") && <p className="mt-1 text-[11px] leading-4 text-[#7b655d]">Not automatically retried. Use an authorized API/feed or obtain source permission.</p>}{item.error.includes("HTTP 503") && item.attempts >= 5 && <p className="mt-1 text-[11px] leading-4 text-[#7b655d]">Automatic retry limit reached.</p>}</div>}
                  </div>)}
                  {(!scan.items || scan.items.length === 0) && <p className="text-xs text-[#829087]">No listing URLs recorded for this scan.</p>}
                </div>
              </div>
            </div>)}
            {scans.length === 0 && <p className="rounded-xl border border-dashed border-[#dfe6dd] bg-white p-5 text-sm text-[#829087]">No scans have been started yet.</p>}
          </div>
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
                {editingListingId === item.id ? <div className="mt-3 space-y-2 rounded-lg bg-[#f7f9f6] p-3">
                  <label className="block text-[11px] font-semibold text-[#59675d]">Nyumba-Finder title<input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="mt-1 w-full rounded border border-[#dce4da] bg-white px-2 py-2 text-xs font-normal" /></label>
                  <label className="block text-[11px] font-semibold text-[#59675d]">Description<textarea rows={4} value={editDescription} onChange={e => setEditDescription(e.target.value)} className="mt-1 w-full rounded border border-[#dce4da] bg-white px-2 py-2 text-xs font-normal" /></label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-[11px] font-semibold text-[#59675d]">Price (KES)<input type="number" min="1" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="mt-1 w-full rounded border border-[#dce4da] bg-white px-2 py-2 text-xs font-normal" /></label>
                    <label className="block text-[11px] font-semibold text-[#59675d]">Property type<input value={editPropertyType} onChange={e => setEditPropertyType(e.target.value)} className="mt-1 w-full rounded border border-[#dce4da] bg-white px-2 py-2 text-xs font-normal" /></label>
                  </div>
                  <label className="block text-[11px] font-semibold text-[#59675d]">Location<input value={editLocation} onChange={e => setEditLocation(e.target.value)} className="mt-1 w-full rounded border border-[#dce4da] bg-white px-2 py-2 text-xs font-normal" /></label>
                  <div className="flex gap-2"><button disabled={!!busy} onClick={() => void saveListingEdits(item.id)} className="flex-1 rounded-lg bg-[#284b35] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy === "edit:" + item.id ? "Saving…" : "Save corrections"}</button><button disabled={!!busy} onClick={() => setEditingListingId("")} className="rounded-lg border border-[#dce4da] px-3 py-2 text-xs font-semibold">Cancel</button></div>
                </div> : <button disabled={!!busy} onClick={() => beginListingEdit(item)} className="mt-3 rounded-lg border border-[#dce4da] px-3 py-2 text-xs font-semibold text-[#365f40] disabled:opacity-40">Edit extracted details</button>}
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
