"use client";

import { useState } from "react";

type Asset = { url: string; kind: "PROPERTY" | "LOGO" | "BANNER" | "UNRELATED"; permission: boolean };

export default function ReviewCompletionPanel({ listing, onSaved, onPublish }: { listing: { id: string; sourceUrl: string; rawData: Record<string, any> | null; title: string; description: string; propertyType: string | null; price: number | null; location: string }; onSaved: () => void; onPublish: () => void }) {
  const quick = listing.rawData?.quickImport ?? {};
  const [sourceUrl, setSourceUrl] = useState(listing.sourceUrl || "");
  const [assets, setAssets] = useState<Asset[]>(Array.isArray(quick.imageAssets) ? quick.imageAssets : (listing.sourceUrl ? [] : []));
  const [imageUrl, setImageUrl] = useState("");
  const [manualException, setManualException] = useState(quick.manualSourceException === true);
  const [duplicateChecked, setDuplicateChecked] = useState(quick.duplicateChecked === true);
  const [verified, setVerified] = useState(quick.administratorVerified === true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const photoCount = assets.filter(asset => asset.kind === "PROPERTY" && asset.permission && /^https:\/\//i.test(asset.url)).length;
  const completion = [!!listing.title.trim(), !!listing.description.trim(), !!listing.propertyType?.trim(), listing.price != null && listing.price > 0, !!listing.location.trim(), !!sourceUrl.trim() || manualException, photoCount > 0, duplicateChecked, verified];
  const completedCount = completion.filter(Boolean).length;

  function addImage() {
    if (!imageUrl.trim()) return;
    setAssets(current => [...current, { url: imageUrl.trim(), kind: "PROPERTY", permission: false }]); setSaved(false);
    setImageUrl("");
  }

  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/ai-importer", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        id: listing.id, action: "complete-listing", sourceUrl, imageAssets: assets, manualSourceException: manualException,
        imageReusePermission: assets.some(asset => asset.permission), duplicateChecked, administratorVerified: verified,
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save the review checklist.");
      setMessage("Review checklist saved."); onSaved();
      setSaved(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the review checklist."); }
    finally { setBusy(false); }
  }

  return <section className="mt-3 space-y-2 rounded-lg border border-[#dce4da] bg-[#f8faf7] p-3">
    <p className="text-xs font-semibold">Next step: add property images</p>
    <p className="text-[10px] text-[#718076]">Keep this listing in review while you complete its details. Publishing is optional and becomes available after every required check passes.</p>
    <p className="text-[11px] text-[#526456]">{completedCount} of {completion.length} checks complete · {photoCount} valid photos (3 recommended)</p>
    <div className="h-1.5 overflow-hidden rounded bg-[#e6ece4]"><div className="h-full bg-[#668c6c]" style={{ width: `${completedCount / completion.length * 100}%` }} /></div>
    <ul className="grid gap-1 text-[10px] text-[#526456] sm:grid-cols-2">{["Title", "Description", "Property type", "Valid price", "Location", "Source URL or documented exception", "Property photo with reuse permission", "Duplicate check", "Administrator verification"].map((label, index) => <li key={label}>{completion[index] ? "✓" : "○"} {label}</li>)}</ul>
    <label className="block text-[11px] font-medium">Property image URL
      <div className="mt-1 flex gap-2"><input type="url" value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="https://…/property-photo.jpg" className="min-w-0 flex-1 rounded border border-[#dce4da] bg-white px-2 py-2 text-xs" /><button type="button" onClick={addImage} className="rounded border border-[#dce4da] px-2 text-xs">Add</button></div>
    </label>
    {assets.map((asset, index) => <div key={index} className="flex flex-wrap items-center gap-2 rounded bg-white p-2 text-[10px]">
      <span className="min-w-0 flex-1 truncate">{asset.url}</span>
      <select aria-label="Image classification" value={asset.kind} onChange={event => { setAssets(current => current.map((value, i) => i === index ? { ...value, kind: event.target.value as Asset["kind"] } : value)); setSaved(false); }} className="rounded border px-1 py-1"><option value="PROPERTY">Property photo</option><option value="LOGO">Logo</option><option value="BANNER">Banner</option><option value="UNRELATED">Unrelated</option></select>
      <label className="flex items-center gap-1"><input type="checkbox" checked={asset.permission} onChange={event => { setAssets(current => current.map((value, i) => i === index ? { ...value, permission: event.target.checked } : value)); setSaved(false); }} />Reuse permission</label>
      <button type="button" aria-label="Move image earlier" disabled={index === 0} onClick={() => { setAssets(current => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; }); setSaved(false); }}>↑</button>
      <button type="button" aria-label="Move image later" disabled={index === assets.length - 1} onClick={() => { setAssets(current => { const next = [...current]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; }); setSaved(false); }}>↓</button>
      <button type="button" onClick={() => { setAssets(current => current.filter((_, i) => i !== index)); setSaved(false); }} className="text-red-700">Remove</button>
    </div>)}
    <p className="text-[10px] text-[#718076]">At least one permitted property photo is required; three are recommended. Logos, banners and unrelated images do not count. Add photo URLs here; upload and automatic retrieval are not available in this workflow yet.</p>
    <label className="block text-[11px] font-medium">Next: add or confirm the source URL
      <input type="url" value={sourceUrl} onChange={event => { setSourceUrl(event.target.value); setSaved(false); }} placeholder="https://…" className="mt-1 w-full rounded border border-[#dce4da] bg-white px-2 py-2 text-xs" />
    </label>
    <label className="flex items-start gap-2 text-[11px]"><input type="checkbox" checked={manualException} onChange={event => { setManualException(event.target.checked); setSaved(false); }} className="mt-0.5" />Document a manual-source exception (use only when no source URL exists)</label>
    <label className="flex items-start gap-2 text-[11px]"><input type="checkbox" checked={duplicateChecked} onChange={event => { setDuplicateChecked(event.target.checked); setSaved(false); }} className="mt-0.5" />I checked for duplicate listings</label>
    <label className="flex items-start gap-2 text-[11px]"><input type="checkbox" checked={verified} onChange={event => { setVerified(event.target.checked); setSaved(false); }} className="mt-0.5" />I verified the property details and photos</label>
    <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={busy} onClick={() => void save()} className="rounded bg-[#284b35] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save and continue review"}</button><button type="button" disabled={!completion.every(Boolean) || !saved || busy} onClick={onPublish} title={!completion.every(Boolean) ? "Complete all required review checks first" : !saved ? "Save the checklist before publishing" : ""} className="rounded border border-[#54765b] px-3 py-2 text-[11px] font-semibold text-[#365f40] disabled:cursor-not-allowed disabled:opacity-40">Publish (optional)</button><span role="status" className="text-[10px] text-[#526456]">{message}</span></div>
  </section>;
}
