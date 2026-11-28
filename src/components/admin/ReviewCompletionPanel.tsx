"use client";

import { useState } from "react";

type Asset = { id?: string; url: string; kind: "PROPERTY" | "LOGO" | "BANNER" | "UNRELATED"; permission: boolean; sourceUrl?: string | null };
type Candidate = { url: string; alt: string; kind: Asset["kind"] };

export default function ReviewCompletionPanel({ listing, onSaved, onPublish }: { listing: { id: string; sourceUrl: string; rawData: Record<string, any> | null; title: string; description: string; propertyType: string | null; price: number | null; location: string; imageUrls: string[]; source: { redisplayAllowed: boolean }; reviewImages: { id: string; kind: Asset["kind"]; reusePermitted: boolean; position: number; sourceUrl: string | null }[] }; onSaved: () => void; onPublish: () => void }) {
  const quick = listing.rawData?.quickImport ?? {};
  const [sourceUrl, setSourceUrl] = useState(listing.sourceUrl || "");
  const [assets, setAssets] = useState<Asset[]>([
    ...(Array.isArray(quick.imageAssets) ? quick.imageAssets as Asset[] : []),
    ...(listing.reviewImages ?? []).filter(image => !(Array.isArray(quick.imageAssets) && (quick.imageAssets as Asset[]).some(asset => asset.id === image.id))).map(image => ({ id: image.id, url: `/api/admin/ai-importer/images?id=${image.id}`, kind: image.kind, permission: image.reusePermitted, sourceUrl: image.sourceUrl })),
    ...(!Array.isArray(quick.imageAssets) && listing.sourceUrl && listing.reviewImages.length === 0 && listing.imageUrls?.length && listing.source.redisplayAllowed ? listing.imageUrls.map(url => ({ url, kind: "PROPERTY" as const, permission: true })) : []),
  ]);
  const [imageUrl, setImageUrl] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [manualException, setManualException] = useState(quick.manualSourceException === true);
  const [duplicateChecked, setDuplicateChecked] = useState(quick.duplicateChecked === true);
  const [verified, setVerified] = useState(quick.administratorVerified === true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const photoCount = assets.filter(asset => asset.kind === "PROPERTY" && asset.permission && (!!asset.id || /^https:\/\//i.test(asset.url))).length;
  const completion = [!!listing.title.trim(), !!listing.description.trim(), !!listing.propertyType?.trim(), listing.price != null && listing.price > 0, !!listing.location.trim(), !!sourceUrl.trim() || manualException, photoCount > 0, duplicateChecked, verified];
  const completedCount = completion.filter(Boolean).length;
  const nextCheck = ["Add a title", "Add a description", "Choose a property type", "Enter a valid price", "Add the property location", "Add a source URL or document the manual-source exception", "Add at least one property photo and confirm reuse rights", "Check for duplicate listings", "Verify the property details and photos"].find((_, index) => !completion[index]);

  async function addImage() {
    if (!imageUrl.trim()) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/ai-importer/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retrieve", listingId: listing.id, url: imageUrl.trim(), kind: "PROPERTY" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not retrieve this image URL.");
      setAssets(current => [...current, data.image]); setSaved(false); setImageUrl(""); setMessage("Image saved. Confirm its type and reuse permission."); onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not retrieve this image URL."); }
    finally { setBusy(false); }
  }

  async function discoverImages() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/ai-importer/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "discover", listingId: listing.id, sourceUrl }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not find source images.");
      setCandidates(data.candidates || []); setMessage(data.message || "Choose property photos to retrieve.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not find source images."); }
    finally { setBusy(false); }
  }

  async function retrieveImage(candidate: Candidate) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/ai-importer/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retrieve", listingId: listing.id, url: candidate.url, kind: candidate.kind }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not retrieve this image.");
      setAssets(current => [...current, data.image]); setSaved(false); setMessage("Image saved to this review. Confirm its type and reuse permission."); onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not retrieve this image."); }
    finally { setBusy(false); }
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    const form = new FormData(); form.set("listingId", listing.id); form.set("file", file);
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/ai-importer/images", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not upload this image.");
      setAssets(current => [...current, data.image]); setSaved(false); setMessage("Upload saved. Record reuse permission separately before approval."); onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not upload this image."); }
    finally { setBusy(false); }
  }

  async function removeImage(asset: Asset, index: number) {
    if (asset.id) {
      const response = await fetch(`/api/admin/ai-importer/images?id=${encodeURIComponent(asset.id)}`, { method: "DELETE" });
      if (!response.ok) { setMessage("Could not remove this saved image."); return; }
    }
    setAssets(current => current.filter((_, i) => i !== index)); setSaved(false);
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
      setMessage("Progress saved. This listing stays private in the review queue until you choose to publish it."); onSaved();
      setSaved(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the review checklist."); }
    finally { setBusy(false); }
  }

  return <section className="mt-3 space-y-2 rounded-lg border border-[#dce4da] bg-[#f8faf7] p-3">
    <p className="text-xs font-semibold">Complete this listing review</p>
    <p className="text-[10px] text-[#718076]">Save progress whenever you like. Publishing is available at this stage too: it needs a saved title, asking price and location. You can finish the photos, source details and remaining checks later from the property page. Only photos with confirmed reuse permission will appear publicly.</p>
    {nextCheck && <p className="rounded-md bg-white px-2 py-1.5 text-[10px] font-medium text-[#526456]">Next to complete: {nextCheck}.</p>}
    <p className="text-[11px] text-[#526456]">{completedCount} of {completion.length} checks complete · {photoCount} valid photos (3 recommended)</p>
    <div className="h-1.5 overflow-hidden rounded bg-[#e6ece4]"><div className="h-full bg-[#668c6c]" style={{ width: `${completedCount / completion.length * 100}%` }} /></div>
    <ul className="grid gap-1 text-[10px] text-[#526456] sm:grid-cols-2">{["Title", "Description", "Property type", "Valid price", "Location", "Source URL or documented exception", "Property photo with reuse permission", "Duplicate check", "Administrator verification"].map((label, index) => <li key={label}>{completion[index] ? "✓" : "○"} {label}</li>)}</ul>
    <label className="block text-[11px] font-medium">Property image URL
      <div className="mt-1 flex gap-2"><input type="url" value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="https://…/property-photo.jpg" className="min-w-0 flex-1 rounded border border-[#dce4da] bg-white px-2 py-2 text-xs" /><button type="button" disabled={busy} onClick={() => void addImage()} className="rounded border border-[#dce4da] px-2 text-xs disabled:opacity-40">Retrieve</button></div>
    </label>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !sourceUrl.trim()} onClick={() => void discoverImages()} className="rounded border border-[#dce4da] bg-white px-3 py-2 text-[11px] font-semibold disabled:opacity-40">{busy ? "Working…" : "Find images on source page"}</button><label className="cursor-pointer rounded border border-[#dce4da] bg-white px-3 py-2 text-[11px] font-semibold">Upload property photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={event => { for (const file of Array.from(event.target.files ?? [])) void uploadImage(file); event.currentTarget.value = ""; }} /></label></div>
    {candidates.length > 0 && <div className="max-h-48 space-y-1 overflow-y-auto rounded border border-[#e3e9e0] bg-white p-2">{candidates.map(candidate => <div key={candidate.url} className="flex items-center gap-2 text-[10px]"><span className="min-w-0 flex-1 truncate">{candidate.alt || candidate.url}</span><span>{candidate.kind.toLowerCase()}</span><button type="button" disabled={busy} onClick={() => void retrieveImage(candidate)} className="rounded border px-2 py-1 font-semibold">Retrieve</button></div>)}</div>}
    {assets.map((asset, index) => <div key={index} className="flex flex-wrap items-center gap-2 rounded bg-white p-2 text-[10px]">
      {asset.id && <img src={asset.url} alt="Selected property photo" className="h-10 w-14 rounded object-cover" />}<span className="min-w-0 flex-1 truncate">{asset.sourceUrl || asset.url}</span>
      <select aria-label="Image classification" value={asset.kind} onChange={event => { setAssets(current => current.map((value, i) => i === index ? { ...value, kind: event.target.value as Asset["kind"] } : value)); setSaved(false); }} className="rounded border px-1 py-1"><option value="PROPERTY">Property photo</option><option value="LOGO">Logo</option><option value="BANNER">Banner</option><option value="UNRELATED">Unrelated</option></select>
      <label className="flex items-center gap-1" title="Only confirm this if NyumbaFinder owns this photo or has permission to display it publicly."><input type="checkbox" checked={asset.permission} onChange={event => { setAssets(current => current.map((value, i) => i === index ? { ...value, permission: event.target.checked } : value)); setSaved(false); }} />We may display this photo</label>
      <button type="button" aria-label="Move image earlier" disabled={index === 0} onClick={() => { setAssets(current => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; }); setSaved(false); }}>↑</button>
      <button type="button" aria-label="Move image later" disabled={index === assets.length - 1} onClick={() => { setAssets(current => { const next = [...current]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; }); setSaved(false); }}>↓</button>
      <button type="button" onClick={() => void removeImage(asset, index)} className="text-red-700">Remove</button>
    </div>)}
    <p className="text-[10px] text-[#718076]">Only photos marked as authorized for NyumbaFinder to display will be shown publicly. Confirm only photos we own or have permission to reuse. A source website’s access approval does not automatically grant photo rights. Three permitted photos are recommended. Logos, banners and unrelated images do not count.</p>
    <label className="block text-[11px] font-medium">Next: add or confirm the source URL
      <input type="url" value={sourceUrl} onChange={event => { setSourceUrl(event.target.value); setSaved(false); }} placeholder="https://…" className="mt-1 w-full rounded border border-[#dce4da] bg-white px-2 py-2 text-xs" />
    </label>
    <label className="flex items-start gap-2 text-[11px]"><input type="checkbox" checked={manualException} onChange={event => { setManualException(event.target.checked); setSaved(false); }} className="mt-0.5" />Document a manual-source exception (use only when no source URL exists)</label>
    <label className="flex items-start gap-2 text-[11px]"><input type="checkbox" checked={duplicateChecked} onChange={event => { setDuplicateChecked(event.target.checked); setSaved(false); }} className="mt-0.5" />I checked for duplicate listings</label>
    <label className="flex items-start gap-2 text-[11px]"><input type="checkbox" checked={verified} onChange={event => { setVerified(event.target.checked); setSaved(false); }} className="mt-0.5" />I verified the property details and photos</label>
    <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={busy} onClick={() => void save()} className="rounded bg-[#284b35] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save review progress"}</button><button type="button" disabled={busy} onClick={onPublish} title="Publish with the saved title, price and location. You can edit and add photos afterward." className="rounded border border-[#54765b] px-3 py-2 text-[11px] font-semibold text-[#365f40] disabled:cursor-not-allowed disabled:opacity-40">Publish now and edit later</button><span role="status" className="text-[10px] text-[#526456]">{message}</span></div>
  </section>;
}

