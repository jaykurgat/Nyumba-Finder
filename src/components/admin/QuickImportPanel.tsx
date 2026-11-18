"use client";

import { useState } from "react";

type Result = {
  message: string;
  listingId?: string;
  status: string;
  duplicate: boolean;
  title: string;
  description: string;
  category: string;
  propertyType: string;
  location: string;
  price: number | null;
  currency: string | null;
  missingFields: string[];
  confidence: Record<string, number>;
  sourceUrl: string;
};

export default function QuickImportPanel({ onImported }: { onImported: () => void }) {
  const [url, setUrl] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/admin/ai-importer/quick-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), authorized }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not import this property.");
      setResult(data as Result);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import this property.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-[#dce7dc] bg-white p-5 shadow-[0_2px_8px_rgba(31,48,35,.035)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#64856b]">Individual property import</p>
          <h2 className="mt-1 text-xl font-semibold">Quick Import with AI</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#718076]">Paste an individual property URL. AI analyses the page, maps its facts to Nyumba-Finder fields and writes an original title and description. Images are not imported.</p>
        </div>
        <span className="rounded-full bg-[#edf6eb] px-3 py-1.5 text-xs font-semibold text-[#47734c]">AI field mapping</span>
      </div>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-xs font-semibold text-[#59675d]">
          Property page URL
          <input type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://property-website.com/listing/123" className="mt-1.5 h-11 w-full rounded-lg border border-[#dce4da] px-3 text-sm font-normal outline-none focus:border-[#719579]" />
        </label>
        <label className="flex items-start gap-2 rounded-lg bg-[#f7f9f6] p-3 text-xs leading-5 text-[#59675d]">
          <input type="checkbox" checked={authorized} onChange={e => setAuthorized(e.target.checked)} className="mt-0.5 accent-[#315a3d]" />
          I confirm I am authorised to access this page and use its property information for review on Nyumba-Finder.
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={busy || !url.trim() || !authorized} className="rounded-lg bg-[#284b35] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? "Analysing page with AI…" : "Extract & map property"}
          </button>
          <span className="text-xs text-[#829087]">Private review only · No image downloads</span>
        </div>
      </form>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
      {result && <div className="mt-5 rounded-xl border border-[#dce7dc] bg-[#f9fbf8] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#365f40]">{result.message}</p>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#526456]">{result.status.replaceAll("_", " ")}</span>
        </div>
        <h3 className="mt-3 text-base font-semibold">{result.title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#68766c]">{result.description}</p>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-2.5"><span className="text-[#829087]">Category</span><p className="mt-1 font-semibold">{result.category} · {result.propertyType}</p></div>
          <div className="rounded-lg bg-white p-2.5"><span className="text-[#829087]">Location</span><p className="mt-1 font-semibold">{result.location || "Not detected"}</p></div>
          <div className="rounded-lg bg-white p-2.5"><span className="text-[#829087]">Price</span><p className="mt-1 font-semibold">{result.price == null ? "Not detected / verify currency" : (result.currency || "KES") + " " + result.price.toLocaleString()}</p></div>
          <div className="rounded-lg bg-white p-2.5"><span className="text-[#829087]">Duplicate check</span><p className="mt-1 font-semibold">{result.duplicate ? "Possible duplicate" : "No matching duplicate found"}</p></div>
        </div>
        {result.missingFields?.length > 0 && <p className="mt-3 text-xs leading-5 text-amber-800"><strong>Missing information:</strong> {result.missingFields.join(", ")}</p>}
        <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block break-all text-xs font-semibold text-[#477653] underline underline-offset-2">Open original property page ↗</a>
        <p className="mt-2 text-[11px] text-[#829087]">The listing has been saved privately. Refresh the review queue below to inspect it before approval.</p>
      </div>}
    </section>
  );
}
