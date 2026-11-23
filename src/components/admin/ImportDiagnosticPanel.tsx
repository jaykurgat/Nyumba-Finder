"use client";

import { useState } from "react";

type Report = {
  stage?: string; ok?: boolean; message?: string; model?: string; latencyMs?: number;
  totalMs?: number; acquisition?: { ok: boolean; method: string; error?: string; bytes?: number; finalUrl?: string };
  checks?: Record<string, boolean>; extraction?: Record<string, any>; usage?: any; finishReason?: string;
};

export default function ImportDiagnosticPanel() {
  const [url, setUrl] = useState("https://www.buyrentkenya.com/listings/1-bedroom-apartment-for-sale-westlands-area-10005044");
  const [content, setContent] = useState("");
  const [tryUrl, setTryUrl] = useState(false);
  const [busy, setBusy] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  async function run(action: "connection" | "extract") {
    setBusy(action); setError(""); setReport(null);
    try {
      const response = await fetch("/api/admin/ai-importer/diagnostic", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, url, content, tryUrl: action === "extract" && tryUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(data, null, 2));
      setReport(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Diagnostic failed."); }
    finally { setBusy(""); }
  }

  const extraction = report?.extraction;
  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-amber-700">Temporary diagnostic · admin only</p>
          <h2 className="mt-1 text-xl font-semibold">AI Importer System Test</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Tests Gemini independently from source access. Paste listing text/HTML to test extraction directly; URL retrieval is optional and only appropriate for sources that authorize it.</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">No listing saved</span>
      </div>
      <div className="mt-4 space-y-3">
        <label className="block text-xs font-semibold text-slate-600">Property URL
          <input value={url} onChange={e => setUrl(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={tryUrl} onChange={e => setTryUrl(e.target.checked)} />
          Try server retrieval instead of pasted content (only for sources that permit automated access)
        </label>
        <label className="block text-xs font-semibold text-slate-600">Paste property page text or HTML (recommended; takes priority and skips URL retrieval)
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Paste the listing text or HTML copied from a page you are authorized to use. This runs Gemini directly without requesting the source website." className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm font-normal" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => run("connection")} disabled={!!busy} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy === "connection" ? "Testing…" : "1. Test Gemini connection"}</button>
          <button onClick={() => run("extract")} disabled={!!busy || (!tryUrl && !content.trim())} className="rounded-lg bg-[#284b35] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy === "extract" ? "Running extraction…" : "2. Test property extraction"}</button>
        </div>
        <p className="text-xs text-slate-500">Connection test sends a small JSON prompt. Extraction uses pasted content directly when present; otherwise it can optionally fetch an accessible, authorized URL. It never bypasses HTTP 403 and never writes to the database. JavaScript-only pages must be copied from the rendered browser page; this tool does not run website JavaScript.</p>
      </div>
      {error && <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</pre>}
      {report && <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="text-sm">{report.stage?.replaceAll("_", " ")}</strong>
          <span className={report.ok ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800" : "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"}>{report.ok ? "Passed checks" : "Needs attention"}</span>
        </div>
        <div className="grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-lg bg-white p-3"><span className="text-slate-500">Model</span><p className="mt-1 font-semibold">{report.model || "—"}</p></div>
          <div className="rounded-lg bg-white p-3"><span className="text-slate-500">Gemini latency</span><p className="mt-1 font-semibold">{report.latencyMs == null ? "—" : report.latencyMs + " ms"}</p></div>
          <div className="rounded-lg bg-white p-3"><span className="text-slate-500">Total time</span><p className="mt-1 font-semibold">{report.totalMs == null ? "—" : report.totalMs + " ms"}</p></div>
        </div>
        {report.acquisition && <div className="rounded-lg bg-white p-3 text-xs"><strong>Page acquisition:</strong> {report.acquisition.ok ? "Succeeded" : "Failed"} · {report.acquisition.method}{report.acquisition.bytes ? " · " + report.acquisition.bytes + " bytes" : ""}{report.acquisition.error ? <p className="mt-1 text-red-700">{report.acquisition.error}</p> : null}</div>}
        {report.checks && <div className="rounded-lg bg-white p-3"><strong className="text-xs">Extraction validation</strong><div className="mt-2 grid gap-1 sm:grid-cols-2">{Object.entries(report.checks).map(([key, value]) => <p key={key} className="text-xs"><span className={value ? "text-green-700" : "text-red-700"}>{value ? "✓" : "✕"}</span> {key}</p>)}</div></div>}
        {extraction && <div className="rounded-lg bg-white p-3"><strong className="text-xs">Gemini's actual response</strong><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(extraction, null, 2)}</pre></div>}
        {report.message && <p className="text-xs text-red-700">{report.message}</p>}
      </div>}
    </section>
  );
}
