"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Contact = {
  id: string; companyName: string; contactName: string | null; role: string | null;
  phone: string | null; whatsapp: string | null; email: string | null; website: string | null;
  notes: string; propertyCount: number; updatedAt: string;
};
type Draft = Omit<Contact, "id" | "propertyCount" | "updatedAt">;
const empty: Draft = { companyName: "", contactName: "", role: "", phone: "", whatsapp: "", email: "", website: "", notes: "" };
const fields: { key: keyof Draft; label: string; placeholder: string; type?: string }[] = [
  { key: "companyName", label: "Partner company name *", placeholder: "Company or agency name" },
  { key: "contactName", label: "Contact person", placeholder: "Full name" },
  { key: "role", label: "Role / position", placeholder: "e.g. Lettings manager" },
  { key: "phone", label: "Phone", placeholder: "+254...", type: "tel" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "+254...", type: "tel" },
  { key: "email", label: "Email", placeholder: "name@company.com", type: "email" },
  { key: "website", label: "Website", placeholder: "https://..." , type: "url"},
];

export default function AdminPartnerContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [draft, setDraft] = useState<Draft>(empty);
  const [editingId, setEditingId] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/partner-contacts", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to load contacts.");
    setContacts(data.contacts || []);
  }
  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  function startEdit(contact: Contact) {
    setEditingId(contact.id);
    setDraft({ companyName: contact.companyName, contactName: contact.contactName || "", role: contact.role || "", phone: contact.phone || "", whatsapp: contact.whatsapp || "", email: contact.email || "", website: contact.website || "", notes: contact.notes || "" });
    setError(""); setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() { setDraft(empty); setEditingId(""); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/partner-contacts", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, id: editingId || undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save contact.");
      await load(); reset(); setNotice(data.message || "Saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save contact."); }
    finally { setBusy(false); }
  }
  async function remove(contact: Contact) {
    if (!window.confirm("Delete the contact for " + contact.companyName + "? Its property listings will remain, but the partner association will be cleared.")) return;
    setError(""); setNotice("");
    const response = await fetch("/api/admin/partner-contacts?id=" + encodeURIComponent(contact.id), { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { setError(data.message || "Could not delete contact."); return; }
    setContacts(current => current.filter(item => item.id !== contact.id));
    if (editingId === contact.id) reset();
    setNotice(data.message || "Deleted.");
  }

  const visible = contacts.filter(c => [c.companyName, c.contactName, c.phone, c.whatsapp, c.email, c.notes].some(v => (v || "").toLowerCase().includes(query.toLowerCase())));

  return <main className="min-h-screen bg-[#f7f8f5] text-[#26372d]">
    <header className="border-b border-[#e2e6df] bg-white"><div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4"><Link href="/admin" className="font-semibold">NyumbaFinder Admin</Link><span className="text-sm text-[#788279]">Partner directory</span><Link href="/admin/properties" className="ml-auto text-sm underline">Properties</Link></div></header>
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 lg:grid-cols-[minmax(300px,.8fr)_minmax(0,1.2fr)]">
      <section className="h-fit rounded-xl border border-[#e2e6df] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#64806a]">{editingId ? "Edit existing record" : "New partner record"}</p>
        <h1 className="mt-1 text-xl font-semibold">{editingId ? "Update partner contact" : "Add a property partner"}</h1>
        <p className="mt-2 text-sm leading-5 text-[#788279]">Keep company and contact details here so you can quickly reach the right person when a tenant enquires.</p>
        <form onSubmit={save} className="mt-5 space-y-3">
          {fields.map(field => <label key={field.key} className="block text-sm font-medium">{field.label}<input required={field.key === "companyName"} type={field.type || "text"} value={draft[field.key] || ""} onChange={e => setDraft(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder} className="mt-1 block w-full rounded-lg border border-[#dfe4dc] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#6b9275]" /></label>)}
          <label className="block text-sm font-medium">Internal notes<textarea value={draft.notes} onChange={e => setDraft(prev => ({ ...prev, notes: e.target.value }))} rows={4} placeholder="Access instructions, best time to call, referral terms, etc." className="mt-1 block w-full rounded-lg border border-[#dfe4dc] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#6b9275]" /></label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
          <div className="flex gap-2 pt-1"><button disabled={busy} className="rounded-lg bg-[#355d41] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : editingId ? "Save changes" : "Add partner"}</button>{editingId && <button type="button" onClick={reset} className="rounded-lg border px-4 py-2.5 text-sm">Cancel</button>}</div>
        </form>
      </section>
      <section className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Partner directory</h2><p className="mt-1 text-sm text-[#788279]">{contacts.length} saved {contacts.length === 1 ? "partner" : "partners"}</p></div><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search company, contact, phone…" className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm sm:max-w-xs" /></div>
        <div className="mt-4 space-y-3">
          {visible.map(c => <article key={c.id} className="rounded-xl border border-[#e2e6df] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{c.companyName}</h3>{c.contactName && <p className="mt-0.5 text-sm text-[#657267]">{c.contactName}{c.role ? " · " + c.role : ""}</p>}<p className="mt-1 text-xs text-[#788279]">{c.propertyCount} associated {c.propertyCount === 1 ? "property" : "properties"}</p></div><button onClick={() => startEdit(c)} className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-[#f7f8f5]">Edit details</button></div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {c.phone && <a className="underline" href={"tel:" + c.phone}>Call {c.phone}</a>}
              {c.whatsapp && <a className="underline" target="_blank" rel="noreferrer" href={"https://wa.me/" + c.whatsapp.replace(/[^\d]/g, "")}>WhatsApp</a>}
              {c.email && <a className="underline" href={"mailto:" + c.email}>{c.email}</a>}
              {c.website && <a className="underline" href={c.website} target="_blank" rel="noreferrer">Website ↗</a>}
            </div>
            {c.notes && <p className="mt-3 whitespace-pre-wrap border-t border-[#edf0ea] pt-3 text-sm leading-5 text-[#657267]">{c.notes}</p>}
            <div className="mt-3 border-t border-[#edf0ea] pt-3"><button onClick={() => remove(c)} className="text-xs text-red-700 underline">Delete contact</button></div>
          </article>)}
          {!visible.length && <div className="rounded-xl border border-dashed border-[#d5ddd4] bg-white p-8 text-center text-sm text-[#788279]">{contacts.length ? "No partners match your search." : "No partner contacts yet. Add the first one using the form."}</div>}
        </div>
      </section>
    </div>
  </main>;
}
