"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Building2, Check, Clock3, MapPin, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Agent = {
  id: string; name: string; businessName: string | null; email: string; phone: string;
  whatsapp: string | null; agentType: string; coverageCounties: string[]; coverageTowns: string[];
  coverageAreas: string[]; propertyTypes: string[]; minRent: number | null; maxRent: number | null;
  canVideoPreview: boolean; notes: string | null; status: string; createdAt: string;
  _count: { notifications: number };
};

const statusStyle: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  REJECTED: "bg-slate-100 text-slate-600 border-slate-200",
  SUSPENDED: "bg-rose-50 text-rose-700 border-rose-200",
};

function rent(value: number | null) {
  return value == null ? "No limit" : "KSh " + Math.round(value).toLocaleString("en-KE");
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/agents", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load agent applications.");
      setAgents(data.agents || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load agent applications.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(agent: Agent, status: string) {
    setBusyId(agent.id); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/agents", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agent.id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update this agent.");
      setMessage(agent.name + " is now " + status.toLowerCase() + ". An email notification was attempted.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update this agent.");
    } finally { setBusyId(""); }
  }

  const filtered = filter === "ALL" ? agents : agents.filter((agent) => agent.status === filter);
  const counts = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"].map((status) => ({ status, count: agents.filter((agent) => agent.status === status).length }));

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#263327]">
      <header className="border-b border-[#e3e8df] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div><Link href="/admin" className="inline-flex items-center gap-2 text-xs text-[#71806c] hover:text-[#40563a]"><ArrowLeft className="h-3.5 w-3.5" /> Admin dashboard</Link><h1 className="mt-1 text-lg font-semibold">Agent Network</h1></div>
          <nav className="flex flex-wrap gap-2 text-sm"><Link className="rounded-lg bg-[#edf2e8] px-3 py-2 font-medium text-[#40563a]" href="/admin/agents">Agents</Link><Link className="rounded-lg px-3 py-2 text-[#63705f] hover:bg-[#f4f6f1]" href="/admin/house-requests">House Hunt requests</Link></nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#75856c]">Supply network</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Review local partners</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#697466]">Approve agents before they can receive renter enquiries. Check their coverage, rent range and ability to provide video previews.</p></div><Button variant="outline" onClick={() => void load()} className="rounded-xl border-[#dfe5da] bg-white"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{counts.map((item) => <div key={item.status} className="rounded-2xl border border-[#e3e8df] bg-white p-4"><p className="text-sm text-[#6e7869]">{item.status.charAt(0) + item.status.slice(1).toLowerCase()}</p><p className="mt-1 text-2xl font-semibold">{item.count}</p></div>)}</div>
        {message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        <div className="mt-6 flex flex-wrap gap-2">{[["PENDING","Pending review"],["APPROVED","Approved"],["SUSPENDED","Suspended"],["REJECTED","Rejected"],["ALL","All applications"]].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={"rounded-full border px-3.5 py-2 text-sm transition " + (filter === value ? "border-[#6d8163] bg-[#eaf0e5] font-medium text-[#40563a]" : "border-[#e0e5dc] bg-white text-[#6a7566] hover:bg-[#f4f6f1]")}>{label}</button>)}</div>
        <div className="mt-4 space-y-4">
          {loading ? <div className="rounded-2xl border border-[#e3e8df] bg-white p-10 text-center text-sm text-[#71806c]">Loading agent applications…</div> :
            filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d7dfd1] bg-white p-10 text-center"><Building2 className="mx-auto h-7 w-7 text-[#8b9a82]" /><p className="mt-3 font-medium">No applications in this view</p><p className="mt-1 text-sm text-[#778171]">New agent applications will appear here.</p></div> :
            filtered.map((agent) => <article key={agent.id} className="rounded-2xl border border-[#e3e8df] bg-white p-5 shadow-[0_2px_10px_rgba(28,43,28,0.025)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eff3eb] text-[#53694b]"><Building2 className="h-5 w-5" /></span><div><h3 className="font-semibold">{agent.name}{agent.businessName ? <span className="font-normal text-[#71806c]"> · {agent.businessName}</span> : null}</h3><p className="mt-1 text-sm text-[#687465]">{agent.agentType} · {agent.email}</p><p className="mt-1 text-sm text-[#687465]">{agent.phone}{agent.whatsapp ? " · WhatsApp " + agent.whatsapp : ""}</p></div></div><span className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium " + (statusStyle[agent.status] || statusStyle.PENDING)}>{agent.status === "APPROVED" ? <BadgeCheck className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{agent.status}</span></div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-[#f7f8f5] p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#75816e]"><MapPin className="h-3.5 w-3.5" /> Coverage</p><p className="mt-2 text-sm font-medium">{agent.coverageCounties.join(", ") || "No counties supplied"}</p>{agent.coverageTowns.length > 0 && <p className="mt-1 text-sm text-[#6d7868]">Towns: {agent.coverageTowns.join(", ")}</p>}{agent.coverageAreas.length > 0 && <p className="mt-1 text-sm text-[#6d7868]">Estates: {agent.coverageAreas.join(", ")}</p>}</div>
                <div className="rounded-xl bg-[#f7f8f5] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#75816e]">Property fit</p><p className="mt-2 text-sm">{agent.propertyTypes.join(", ")}</p><p className="mt-1 text-sm text-[#6d7868]">{rent(agent.minRent)} – {rent(agent.maxRent)} monthly</p><p className="mt-1 text-sm text-[#6d7868]">{agent.canVideoPreview ? "Can provide video previews" : "Video previews not confirmed"} · {agent._count.notifications} requests notified</p></div>
              </div>
              {agent.notes && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#606c5e]"><span className="font-medium">Notes: </span>{agent.notes}</p>}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0e9] pt-4"><p className="text-xs text-[#859080]">Applied {new Date(agent.createdAt).toLocaleDateString()}</p><div className="flex flex-wrap gap-2">
                {agent.status !== "APPROVED" && <Button disabled={busyId === agent.id} onClick={() => void changeStatus(agent, "APPROVED")} className="rounded-xl bg-[#53694b] hover:bg-[#43563c]"><Check className="mr-1.5 h-4 w-4" />Approve</Button>}
                {agent.status !== "REJECTED" && agent.status !== "APPROVED" && <Button disabled={busyId === agent.id} variant="outline" onClick={() => void changeStatus(agent, "REJECTED")} className="rounded-xl border-[#e0e5dc]"><X className="mr-1.5 h-4 w-4" />Reject</Button>}
                {agent.status === "APPROVED" && <Button disabled={busyId === agent.id} variant="outline" onClick={() => void changeStatus(agent, "SUSPENDED")} className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50">Pause agent</Button>}
                {agent.status === "SUSPENDED" && <Button disabled={busyId === agent.id} onClick={() => void changeStatus(agent, "APPROVED")} className="rounded-xl bg-[#53694b] hover:bg-[#43563c]"><Check className="mr-1.5 h-4 w-4" />Reactivate</Button>}
              </div></div>
            </article>)
          }
        </div>
      </div>
    </main>
  );
}
