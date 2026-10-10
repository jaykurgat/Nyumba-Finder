"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, MapPin, ShieldCheck, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const propertyOptions = ["Bedsitter", "Studio", "Apartment", "House", "Shared accommodation", "Any type"];
const agentTypes = ["Independent agent", "Property manager", "Landlord", "Agency"];

function splitList(value: string) {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
}

export default function AgentJoinPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(["Apartment", "House"]);
  const [form, setForm] = useState({
    name: "", businessName: "", email: "", phone: "", whatsapp: "",
    agentType: "Independent agent", coverageCounties: "Nairobi", coverageTowns: "",
    coverageAreas: "", minRent: "", maxRent: "", canVideoPreview: true,
    notes: "", consent: false, website: "",
  });
  function update(key: string, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function toggleType(value: string) {
    setPropertyTypes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current.filter((item) => item !== "Any type"), value]);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.consent) { setError("Please agree to the agent network terms before submitting."); return; }
    if (!propertyTypes.length) { setError("Choose at least one property type."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          coverageCounties: splitList(form.coverageCounties),
          coverageTowns: splitList(form.coverageTowns),
          coverageAreas: splitList(form.coverageAreas),
          propertyTypes,
          minRent: form.minRent === "" ? null : Number(form.minRent),
          maxRent: form.maxRent === "" ? null : Number(form.maxRent),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "We couldn't submit your application.");
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#243126]">
      <header className="border-b border-[#e4e8df] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">NyumbaFinder<span className="text-[#6a805f]">.</span></Link>
          <Link href="/find-a-house" className="text-sm font-medium text-[#596b52] hover:underline">Looking for a home?</Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12 lg:py-14">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#dce5d5] bg-white px-3 py-1.5 text-xs font-semibold text-[#52694a]"><BadgeCheck className="h-4 w-4" /> NyumbaFinder Agent Network</p>
          <h1 className="mt-5 max-w-lg text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Bring the right home closer to the people who need it.</h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-[#657064]">Join a growing network of local agents, landlords and property managers. Get relevant House Hunt enquiries based on your location coverage, property types and rent range.</p>
          <div className="mt-7 space-y-4">
            <div className="flex gap-3 rounded-2xl border border-[#e4e8df] bg-white p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf2e8] text-[#53694b]"><MapPin className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Requests matched to your area</p><p className="mt-1 text-sm leading-5 text-[#6a7467]">Tell us the counties, towns and estates you actually serve.</p></div></div>
            <div className="flex gap-3 rounded-2xl border border-[#e4e8df] bg-white p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf2e8] text-[#53694b]"><Video className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Video previews are a plus</p><p className="mt-1 text-sm leading-5 text-[#6a7467]">Help renters shortlist real homes before they travel.</p></div></div>
            <div className="flex gap-3 rounded-2xl border border-[#e4e8df] bg-white p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf2e8] text-[#53694b]"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Reviewed before activation</p><p className="mt-1 text-sm leading-5 text-[#6a7467]">Your profile is checked by our team before you receive enquiries.</p></div></div>
          </div>
          <p className="mt-6 text-xs leading-5 text-[#778073]">Applications are free. Submitting an application does not guarantee approval or a minimum number of leads.</p>
        </aside>

        <section className="rounded-3xl border border-[#e2e7dd] bg-white p-5 shadow-sm sm:p-8">
          {success ? (
            <div className="py-10 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf4e9] text-[#52694a]"><CheckCircle2 className="h-7 w-7" /></span>
              <h2 className="mt-5 text-2xl font-semibold">Application received</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#657064]">Thanks for joining the conversation. Our team will review your coverage and contact you by email when your application status changes.</p>
              <Button asChild className="mt-6 rounded-xl bg-[#53694b] hover:bg-[#43563c]"><Link href="/">Back to NyumbaFinder <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf2e8] text-[#53694b]"><Building2 className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold tracking-tight">Apply to become a network agent</h2><p className="mt-1 text-sm leading-5 text-[#6a7467]">Usually takes about 3 minutes. Fields marked * are required.</p></div></div>
              <form onSubmit={submit} className="mt-7 space-y-6">
                <section><h3 className="text-sm font-semibold">Your details</h3><div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1.5 block text-sm font-medium">Full name *</label><Input required minLength={2} maxLength={100} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Name" className="h-11 rounded-xl" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium">Role *</label><select value={form.agentType} onChange={(e) => update("agentType", e.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 text-sm">{agentTypes.map((item) => <option key={item}>{item}</option>)}</select></div>
                  <div><label className="mb-1.5 block text-sm font-medium">Agency / business name</label><Input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} maxLength={120} placeholder="Optional" className="h-11 rounded-xl" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium">Email address *</label><Input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" className="h-11 rounded-xl" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium">Phone number *</label><Input required type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+254 7XX XXX XXX" className="h-11 rounded-xl" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium">WhatsApp number</label><Input type="tel" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="If different from phone" className="h-11 rounded-xl" /></div>
                </div></section>
                <section className="border-t border-[#edf0e9] pt-5"><h3 className="text-sm font-semibold">Where you work</h3><p className="mt-1 text-xs leading-5 text-[#788174]">Separate multiple places with commas. County coverage is required; town and estate details improve matching.</p><div className="mt-3 space-y-3">
                  <div><label className="mb-1.5 block text-sm font-medium">Counties served *</label><Input required value={form.coverageCounties} onChange={(e) => update("coverageCounties", e.target.value)} placeholder="Nairobi, Kiambu" className="h-11 rounded-xl" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium">Towns / cities served</label><Input value={form.coverageTowns} onChange={(e) => update("coverageTowns", e.target.value)} placeholder="Nairobi, Ruiru, Thika" className="h-11 rounded-xl" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium">Estates / neighbourhoods served</label><Input value={form.coverageAreas} onChange={(e) => update("coverageAreas", e.target.value)} placeholder="Kilimani, Umoja, Kasarani" className="h-11 rounded-xl" /></div>
                </div></section>
                <section className="border-t border-[#edf0e9] pt-5"><h3 className="text-sm font-semibold">What you can help renters find</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{propertyOptions.map((item) => <label key={item} className={"flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm " + (propertyTypes.includes(item) ? "border-[#9eaf94] bg-[#f2f5ef]" : "border-[#e5e9e1]")}><input type="checkbox" checked={propertyTypes.includes(item)} onChange={() => toggleType(item)} className="h-4 w-4 accent-[#53694b]" />{item}</label>)}</div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-sm font-medium">Minimum monthly rent (KSh)</label><Input type="number" min="0" value={form.minRent} onChange={(e) => update("minRent", e.target.value)} placeholder="No minimum" className="h-11 rounded-xl" /></div><div><label className="mb-1.5 block text-sm font-medium">Maximum monthly rent (KSh)</label><Input type="number" min="0" value={form.maxRent} onChange={(e) => update("maxRent", e.target.value)} placeholder="No maximum" className="h-11 rounded-xl" /></div></div>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-[#f7f8f4] p-3 text-sm leading-5"><input type="checkbox" checked={form.canVideoPreview} onChange={(e) => update("canVideoPreview", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#53694b]" /><span>I can provide WhatsApp video previews and confirm availability before viewings.</span></label>
                  <div className="mt-4"><label className="mb-1.5 block text-sm font-medium">Anything else we should know?</label><textarea rows={3} maxLength={1000} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Inventory, availability, viewing arrangements…" className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8a9d80]" /></div>
                </section>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e5e9e1] p-4 text-sm leading-6"><input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} className="mt-1 h-4 w-4 accent-[#53694b]" /><span>I confirm these details are accurate and consent to NyumbaFinder reviewing this application and contacting me about relevant House Hunt enquiries. I will respect renter privacy and confirm availability before arranging viewings. *</span></label>
                <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} /></label></div>
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
                <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-[#53694b] text-sm font-semibold hover:bg-[#43563c]">{busy ? "Submitting application…" : "Submit agent application"} {!busy && <ArrowRight className="ml-2 h-4 w-4" />}</Button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
