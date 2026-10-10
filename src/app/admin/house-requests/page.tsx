"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BellRing, CheckCircle2, Clock3, MapPin, RefreshCw, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type AgentNotice = { id: string; status: string; sentAt: string; responseNote: string | null; agent: { id: string; name: string; email: string; phone: string; businessName: string | null } };
type HouseRequest = {
  id: string; reference: string; name: string; phone: string; email: string | null;
  contactPreference: string; propertyType: string; bedrooms: number; countyName: string; townName: string | null;
  preferredAreas: string[]; preferredLocations: { label?: string; name?: string }[];
  minRent: number | null; maxRent: number; moveIn: string; mustHaves: string[]; notes: string | null;
  consent: boolean; agentSharingConsent: boolean; createdAt: string; agentNotifications: AgentNotice[];
};

function rent(value: number | null) {
  return value == null ? "" : "KSh " + Math.round(value).toLocaleString("en-KE");
}

function requestLocations(item: HouseRequest) {
  const fromTree = Array.isArray(item.preferredLocations) ? item.preferredLocations.map((location) => location.label || location.name || "").filter(Boolean) : [];
  return fromTree.length ? fromTree.join(" · ") : [item.townName, item.countyName, ...item.preferredAreas].filter(Boolean).join(" · ");
}

export default function AdminHouseRequestsPage() {
  const [requests, setRequests] = useState<HouseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/house-requests", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load requests.");
      setRequests(data.requests || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load requests.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function updateNotification(notice: AgentNotice, status: "RESPONDED" | "UNAVAILABLE") {
    setBusyId(notice.id); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/house-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-notification", notificationId: notice.id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to record agent response.");
      setMessage(notice.agent.name + ": " + data.message);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to record agent response.");
    } finally { setBusyId(""); }
  }

  async function notifyAgents(item: HouseRequest) {
    setBusyId(item.id); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/house-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: item.id, action: "notify-matching-agents" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to notify matching agents.");
      setMessage(item.reference + ": " + data.message);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to notify matching agents.");
    } finally { setBusyId(""); }
  }

  const filtered = requests.filter((item) => {
    const needle = query.trim().toLowerCase();
    return !needle || [item.reference, item.name, item.phone, item.countyName, item.townName || "", requestLocations(item)].join(" ").toLowerCase().includes(needle);
  });

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#263327]">
      <header className="border-b border-[#e3e8df] bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6"><div><Link href="/admin" className="inline-flex items-center gap-2 text-xs text-[#71806c] hover:text-[#40563a]"><ArrowLeft className="h-3.5 w-3.5" /> Admin dashboard</Link><h1 className="mt-1 text-lg font-semibold">House Hunt requests</h1></div><nav className="flex flex-wrap gap-2 text-sm"><Link className="rounded-lg px-3 py-2 text-[#63705f] hover:bg-[#f4f6f1]" href="/admin/agents">Agents</Link><Link className="rounded-lg bg-[#edf2e8] px-3 py-2 font-medium text-[#40563a]" href="/admin/house-requests">House Hunt requests</Link></nav></div></header>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#75856c]">Service coordination</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Connect renters with local supply</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#697466]">Review a request, check the consent status, and notify approved agents whose coverage and rent range match. Previously notified agents are not emailed again.</p></div><Button variant="outline" onClick={() => void load()} className="rounded-xl border-[#dfe5da] bg-white"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-[#e3e8df] bg-white p-4"><p className="text-sm text-[#6e7869]">Requests loaded</p><p className="mt-1 text-2xl font-semibold">{requests.length}</p></div><div className="rounded-2xl border border-[#e3e8df] bg-white p-4"><p className="text-sm text-[#6e7869]">Consent to agent sharing</p><p className="mt-1 text-2xl font-semibold">{requests.filter((item) => item.agentSharingConsent).length}</p></div><div className="rounded-2xl border border-[#e3e8df] bg-white p-4"><p className="text-sm text-[#6e7869]">Agent notifications sent</p><p className="mt-1 text-2xl font-semibold">{requests.reduce((sum, item) => sum + item.agentNotifications.length, 0)}</p></div></div>
        <div className="mt-5"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by reference, renter, phone or location…" className="h-12 w-full rounded-xl border border-[#e0e5dc] bg-white px-4 text-sm outline-none focus:border-[#91a386] sm:max-w-lg" /></div>
        {message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        <div className="mt-5 space-y-4">
          {loading ? <div className="rounded-2xl border border-[#e3e8df] bg-white p-10 text-center text-sm text-[#71806c]">Loading House Hunt requests…</div> :
            filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d7dfd1] bg-white p-10 text-center"><Users className="mx-auto h-7 w-7 text-[#8b9a82]" /><p className="mt-3 font-medium">No matching requests</p><p className="mt-1 text-sm text-[#778171]">New House Hunt submissions will appear here.</p></div> :
            filtered.map((item) => {
              const sentIds = new Set(item.agentNotifications.map((notice) => notice.agent.id));
              return <article key={item.id} className="rounded-2xl border border-[#e3e8df] bg-white p-5 shadow-[0_2px_10px_rgba(28,43,28,0.025)] sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.reference}</h3><span className="rounded-full bg-[#f0f3ec] px-2.5 py-1 text-xs text-[#52664a]">{item.contactPreference}</span></div><p className="mt-1 text-sm text-[#687465]">Submitted {new Date(item.createdAt).toLocaleString()}</p></div><div className="flex flex-wrap items-center gap-2">{item.agentSharingConsent ? <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />Agent sharing consent</span> : <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800"><Clock3 className="h-3.5 w-3.5" />No agent-sharing consent</span>}</div></div>
                <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-xl bg-[#f7f8f5] p-4"><p className="font-semibold">{item.name}</p><p className="mt-1 text-sm text-[#586654]">{item.phone}{item.email ? " · " + item.email : ""}</p><p className="mt-3 flex items-start gap-2 text-sm leading-5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#718667]" />{requestLocations(item)}</p><p className="mt-2 text-sm">{item.propertyType}{item.bedrooms > 0 ? " · " + item.bedrooms + " bedroom(s)" : ""}</p><p className="mt-1 text-sm font-medium">{item.minRent != null ? rent(item.minRent) + " – " : "Up to "}{rent(item.maxRent)} monthly</p><p className="mt-1 text-sm text-[#687465]">Move-in: {item.moveIn}</p>{item.mustHaves.length > 0 && <p className="mt-2 text-sm text-[#687465]">Must-haves: {item.mustHaves.join(", ")}</p>}{item.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[#687465]">Notes: {item.notes}</p>}</div>
                  <div className="rounded-xl border border-[#e8ece4] p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">Agent activity</p><span className="rounded-full bg-[#f0f3ec] px-2.5 py-1 text-xs text-[#52664a]">{item.agentNotifications.length} notified</span></div>
                    {item.agentNotifications.length === 0 ? <p className="mt-3 text-sm leading-5 text-[#788273]">No agents have been notified yet. Use the action below to contact matching approved agents.</p> : <div className="mt-3 space-y-2">{item.agentNotifications.map((notice) => <div key={notice.id} className="flex items-start justify-between gap-3 rounded-lg bg-[#f7f8f5] px-3 py-2.5"><div><p className="text-sm font-medium">{notice.agent.name}{notice.agent.businessName ? " · " + notice.agent.businessName : ""}</p><p className="mt-0.5 text-xs text-[#71806c]">{notice.agent.email}</p>{notice.responseNote && <p className="mt-1 text-xs text-[#657064]">{notice.responseNote}</p>}<div className="mt-2 flex flex-wrap gap-2"><button disabled={busyId === notice.id || notice.status === "RESPONDED"} onClick={() => void updateNotification(notice, "RESPONDED")} className="rounded-lg border border-[#dce5d5] px-2.5 py-1 text-xs font-medium text-[#49603f] hover:bg-[#edf2e8] disabled:opacity-50">Mark responded</button><button disabled={busyId === notice.id || notice.status === "UNAVAILABLE"} onClick={() => void updateNotification(notice, "UNAVAILABLE")} className="rounded-lg border border-[#e7e3d9] px-2.5 py-1 text-xs text-[#746d5c] hover:bg-[#f7f5ef] disabled:opacity-50">Unavailable</button></div></div><span className="whitespace-nowrap text-[11px] text-[#71806c]">{notice.status.toLowerCase()}</span></div>)}</div>}
                    <Button disabled={busyId === item.id || !item.agentSharingConsent} onClick={() => void notifyAgents(item)} className="mt-4 w-full rounded-xl bg-[#53694b] hover:bg-[#43563c]">{busyId === item.id ? "Sending notifications…" : <><Send className="mr-2 h-4 w-4" />Notify matching agents</>}</Button>
                    {!item.agentSharingConsent && <p className="mt-2 text-xs leading-5 text-amber-800">For privacy, contact details are not shared until the renter explicitly consents to agent sharing. Existing requests remain unchanged.</p>}
                    {item.agentNotifications.length > 0 && <p className="mt-2 text-xs leading-5 text-[#788273]">Already-notified agents are skipped. Only new matching agents will be emailed.</p>}
                  </div>
                </div>
              </article>;
            })
          }
        </div>
      </div>
    </main>
  );
}
