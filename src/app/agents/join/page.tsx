"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, MapPin, Plus, ShieldCheck, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const propertyOptions = ["Bedsitter", "Studio", "Apartment", "House", "Shared accommodation", "Any type"];
const agentTypes = ["Independent agent", "Property manager", "Landlord", "Agency"];

type CountyOption = { id: string; name: string };
type LocationOption = {
  id: string | null;
  name: string;
  level: string;
  countyId?: string;
  countyName: string;
  parentId?: string | null;
  parentName?: string | null;
  label?: string;
  custom?: boolean;
};

function locationKey(location: LocationOption) {
  return location.countyName.toLowerCase() + "::" + location.name.toLowerCase();
}

function cleanUnique(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

export default function AgentJoinPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(["Apartment", "House"]);
  const [form, setForm] = useState({
    name: "", businessName: "", email: "", phone: "", whatsapp: "",
    agentType: "Independent agent", minRent: "", maxRent: "", canVideoPreview: true,
    notes: "", consent: false, website: "",
  });
  const [counties, setCounties] = useState<CountyOption[]>([]);
  const [countiesLoading, setCountiesLoading] = useState(true);
  const [countiesError, setCountiesError] = useState("");
  const [selectedCounties, setSelectedCounties] = useState<CountyOption[]>([]);
  const [countyToAdd, setCountyToAdd] = useState("");
  const [townOptions, setTownOptions] = useState<LocationOption[]>([]);
  const [townsLoading, setTownsLoading] = useState(false);
  const [selectedTowns, setSelectedTowns] = useState<LocationOption[]>([]);
  const [townToAdd, setTownToAdd] = useState("");
  const [manualTownOpen, setManualTownOpen] = useState(false);
  const [manualTownName, setManualTownName] = useState("");
  const [manualTownCounty, setManualTownCounty] = useState("");
  const [activeTownKey, setActiveTownKey] = useState("");
  const [areaOptions, setAreaOptions] = useState<LocationOption[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areaToAdd, setAreaToAdd] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<LocationOption[]>([]);
  const [manualAreaOpen, setManualAreaOpen] = useState(false);
  const [manualAreaName, setManualAreaName] = useState("");
  const [manualAreaLevel, setManualAreaLevel] = useState("ESTATE");
  const [manualAreaTown, setManualAreaTown] = useState("");
  const selectedCountyKey = selectedCounties.map((county) => county.id).join(",");
  const activeTown = selectedTowns.find((town) => locationKey(town) === activeTownKey) || null;
  const countyNameList = useMemo(() => selectedCounties.map((county) => county.name), [selectedCounties]);
  function update(key: string, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/locations?kind=counties", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.counties)) throw new Error(data.message || "Could not load counties.");
        return data.counties as CountyOption[];
      })
      .then((data) => { if (!cancelled) { setCounties(data); setCountiesError(""); } })
      .catch((caught) => { if (!cancelled) setCountiesError(caught instanceof Error ? caught.message : "Could not load counties."); })
      .finally(() => { if (!cancelled) setCountiesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedCountyKey) {
      setTownOptions([]);
      setSelectedTowns([]);
      setSelectedAreas([]);
      setActiveTownKey("");
      return;
    }
    setTownsLoading(true);
    const selectedIds = selectedCountyKey.split(",").filter(Boolean);
    Promise.all(selectedIds.flatMap((countyId) => ["TOWN", "CITY"].map((level) =>
      fetch("/api/locations?" + new URLSearchParams({ countyId, level }), { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Could not load towns and cities.");
          return Array.isArray(data.locations) ? data.locations as LocationOption[] : [];
        })
    ))).then((groups) => {
      if (cancelled) return;
      const available = groups.flat().filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index);
      setTownOptions(available);
      setSelectedTowns((current) => current.filter((town) => town.custom || available.some((item) => item.id === town.id)));
    }).catch((caught) => {
      if (!cancelled) { setTownOptions([]); setError(caught instanceof Error ? caught.message : "Could not load towns and cities."); }
    }).finally(() => { if (!cancelled) setTownsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCountyKey]);

  useEffect(() => {
    let cancelled = false;
    if (!activeTown?.id) {
      setAreaOptions([]);
      setAreaToAdd("");
      return;
    }
    setAreasLoading(true);
    const levels = ["ESTATE", "NEIGHBORHOOD", "AREA", "VILLAGE", "LOCALITY"];
    Promise.all(levels.map((level) =>
      fetch("/api/locations?" + new URLSearchParams({ parentId: activeTown.id as string, level }), { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Could not load area suggestions.");
          return Array.isArray(data.locations) ? data.locations as LocationOption[] : [];
        })
    )).then((groups) => {
      if (!cancelled) setAreaOptions(groups.flat().filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index));
    }).catch(() => { if (!cancelled) setAreaOptions([]); })
      .finally(() => { if (!cancelled) setAreasLoading(false); });
    return () => { cancelled = true; };
  }, [activeTown?.id]);

  function addCounty() {
    if (selectedCounties.length >= 20) { setError("You can select up to 20 counties."); return; }
    const county = counties.find((item) => item.id === countyToAdd);
    if (!county || selectedCounties.some((item) => item.id === county.id)) return;
    setSelectedCounties((current) => [...current, county]);
    setCountyToAdd("");
  }
  function removeCounty(county: CountyOption) {
    setSelectedCounties((current) => current.filter((item) => item.id !== county.id));
    setSelectedTowns((current) => current.filter((item) => item.countyId !== county.id));
    setSelectedAreas((current) => current.filter((item) => item.countyId !== county.id));
    if (activeTown?.countyId === county.id) setActiveTownKey("");
  }
  function addTown() {
    if (selectedTowns.length >= 30) { setError("You can add up to 30 towns or cities."); return; }
    const town = townOptions.find((item) => item.id === townToAdd);
    if (!town || selectedTowns.some((item) => locationKey(item) === locationKey(town))) return;
    setSelectedTowns((current) => [...current, town]);
    setActiveTownKey(locationKey(town));
    setTownToAdd("");
  }
  function addManualTown() {
    if (selectedTowns.length >= 30) { setError("You can add up to 30 towns or cities."); return; }
    const name = manualTownName.trim();
    const county = selectedCounties.find((item) => item.id === manualTownCounty);
    if (name.length < 2 || !county) { setError("Choose a coverage county and enter the town or city name."); return; }
    const town: LocationOption = { id: null, name, level: "TOWN", countyId: county.id, countyName: county.name, parentId: null, parentName: null, label: name + ", " + county.name, custom: true };
    if (selectedTowns.some((item) => locationKey(item) === locationKey(town))) { setError("That town or city has already been added."); return; }
    setSelectedTowns((current) => [...current, town]);
    setActiveTownKey(locationKey(town));
    setManualTownName("");
    setManualTownOpen(false);
    setError("");
  }
  function removeTown(town: LocationOption) {
    setSelectedTowns((current) => current.filter((item) => locationKey(item) !== locationKey(town)));
    setSelectedAreas((current) => current.filter((item) => !(item.countyName === town.countyName && item.parentName === town.name)));
    if (activeTownKey === locationKey(town)) setActiveTownKey("");
  }
  function addArea() {
    if (selectedAreas.length >= 50) { setError("You can add up to 50 estates or areas."); return; }
    const area = areaOptions.find((item) => item.id === areaToAdd);
    if (!area || selectedAreas.some((item) => locationKey(item) === locationKey(area))) return;
    setSelectedAreas((current) => [...current, { ...area, parentName: activeTown?.name || area.parentName }]);
    setAreaToAdd("");
  }
  function addManualArea() {
    if (selectedAreas.length >= 50) { setError("You can add up to 50 estates or areas."); return; }
    const name = manualAreaName.trim();
    const town = selectedTowns.find((item) => locationKey(item) === manualAreaTown);
    if (name.length < 2 || !town) { setError("Choose a town or city and enter the estate, area or neighbourhood name."); return; }
    const area: LocationOption = { id: null, name, level: manualAreaLevel, countyId: town.countyId, countyName: town.countyName, parentId: town.id, parentName: town.name, label: [name, town.name, town.countyName].filter(Boolean).join(", "), custom: true };
    if (selectedAreas.some((item) => locationKey(item) === locationKey(area))) { setError("That area has already been added."); return; }
    setSelectedAreas((current) => [...current, area]);
    setManualAreaName("");
    setManualAreaOpen(false);
    setError("");
  }
  function toggleType(value: string) {
    setPropertyTypes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current.filter((item) => item !== "Any type"), value]);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.consent) { setError("Please agree to the agent network terms before submitting."); return; }
    if (!propertyTypes.length) { setError("Choose at least one property type."); return; }
    if (!selectedCounties.length) { setError("Select at least one county where you operate."); return; }
    if (form.minRent !== "" && form.maxRent !== "" && Number(form.minRent) > Number(form.maxRent)) { setError("Minimum rent must not exceed maximum rent."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          coverageCounties: cleanUnique(countyNameList),
          coverageTowns: cleanUnique(selectedTowns.map((town) => town.name)),
          coverageAreas: cleanUnique(selectedAreas.map((area) => [area.name, area.parentName, area.countyName].filter(Boolean).join(", "))),
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
                <section className="border-t border-[#edf0e9] pt-5">
                  <h3 className="text-sm font-semibold">Where you work</h3>
                  <p className="mt-1 text-xs leading-5 text-[#788174]">Use the same county and location directory as property listings and House Hunt. Select the counties you cover, then add the towns and estates you actually serve.</p>
                  <div className="mt-4 rounded-2xl border border-[#e5e9e1] bg-[#fbfcf9] p-4 sm:p-5">
                    <label className="mb-1.5 block text-sm font-medium">Counties served *</label>
                    <div className="flex gap-2">
                      <select value={countyToAdd} onChange={(event) => setCountyToAdd(event.target.value)} disabled={countiesLoading || Boolean(countiesError)} className="h-11 min-w-0 flex-1 rounded-xl border border-[#dfe5da] bg-white px-3 text-sm outline-none focus:border-[#91a386]">
                        <option value="">{countiesLoading ? "Loading counties…" : "Select a county to add"}</option>
                        {counties.filter((county) => !selectedCounties.some((item) => item.id === county.id)).map((county) => <option key={county.id} value={county.id}>{county.name}</option>)}
                      </select>
                      <Button type="button" variant="outline" onClick={addCounty} disabled={!countyToAdd} className="h-11 rounded-xl border-[#dfe5da]"><Plus className="mr-1.5 h-4 w-4" />Add</Button>
                    </div>
                    {countiesError && <p role="alert" className="mt-2 text-xs text-red-700">{countiesError}</p>}
                    {selectedCounties.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{selectedCounties.map((county) => <span key={county.id} className="inline-flex items-center gap-2 rounded-full border border-[#dce5d5] bg-[#edf2e8] px-3 py-1.5 text-sm text-[#43583b]">{county.name}<button type="button" onClick={() => removeCounty(county)} aria-label={"Remove " + county.name} className="rounded-full p-0.5 hover:bg-white"><Trash2 className="h-3.5 w-3.5" /></button></span>)}</div>}
                    {selectedCounties.length === 0 && <p className="mt-2 text-xs text-[#788174]">Choose one or more counties to continue.</p>}
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#e5e9e1] p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2"><label className="text-sm font-medium">Towns / cities served</label><span className="text-xs text-[#788174]">Optional, recommended</span></div>
                    <div className="mt-3 flex gap-2">
                      <select value={townToAdd} onChange={(event) => setTownToAdd(event.target.value)} disabled={!selectedCounties.length || townsLoading || !townOptions.length} className="h-11 min-w-0 flex-1 rounded-xl border border-[#dfe5da] bg-white px-3 text-sm outline-none focus:border-[#91a386]">
                        <option value="">{!selectedCounties.length ? "Select counties first" : townsLoading ? "Loading towns and cities…" : townOptions.length ? "Select a town or city" : "No towns listed for these counties"}</option>
                        {townOptions.filter((town) => !selectedTowns.some((item) => locationKey(item) === locationKey(town))).map((town) => <option key={town.id || locationKey(town)} value={town.id || ""}>{town.name} · {town.countyName}</option>)}
                      </select>
                      <Button type="button" variant="outline" onClick={addTown} disabled={!townToAdd} className="h-11 rounded-xl border-[#dfe5da]"><Plus className="mr-1.5 h-4 w-4" />Add</Button>
                    </div>
                    <button type="button" onClick={() => { setManualTownOpen((open) => !open); setManualTownCounty(selectedCounties[0]?.id || ""); }} disabled={!selectedCounties.length} className="mt-3 text-xs font-medium text-[#53694b] underline underline-offset-4">Town/city not listed? Add it manually</button>
                    {manualTownOpen && <div className="mt-3 grid gap-2 rounded-xl bg-[#f7f8f4] p-3 sm:grid-cols-[1fr_1fr_auto]">
                      <div><label className="mb-1 block text-xs font-medium">Town / city name</label><Input value={manualTownName} onChange={(event) => setManualTownName(event.target.value)} placeholder="Enter town or city" className="h-10 rounded-lg" /></div>
                      <div><label className="mb-1 block text-xs font-medium">Parent county</label><select value={manualTownCounty} onChange={(event) => setManualTownCounty(event.target.value)} className="h-10 w-full rounded-lg border bg-white px-3 text-sm">{selectedCounties.map((county) => <option key={county.id} value={county.id}>{county.name}</option>)}</select></div>
                      <Button type="button" onClick={addManualTown} className="self-end rounded-lg bg-[#53694b] hover:bg-[#43563c]">Add town</Button>
                    </div>}
                    {selectedTowns.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{selectedTowns.map((town) => <span key={locationKey(town)} className="inline-flex items-center gap-2 rounded-full border border-[#dce5d5] bg-[#f2f5ef] px-3 py-1.5 text-sm text-[#43583b]">{town.name}<span className="text-xs text-[#71806c]">{town.countyName}{town.custom ? " · custom" : ""}</span><button type="button" onClick={() => removeTown(town)} aria-label={"Remove " + town.name} className="rounded-full p-0.5 hover:bg-white"><Trash2 className="h-3.5 w-3.5" /></button></span>)}</div>}
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#e5e9e1] p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2"><label className="text-sm font-medium">Estates / areas / neighbourhoods</label><span className="text-xs text-[#788174]">Optional, recommended</span></div>
                    <p className="mt-1 text-xs leading-5 text-[#788174]">Choose a town to see its saved area suggestions, or add a local name if it is missing.</p>
                    <div className="mt-3"><label className="mb-1.5 block text-xs font-medium">Town / city for these areas</label><select value={activeTownKey} onChange={(event) => setActiveTownKey(event.target.value)} disabled={!selectedTowns.length} className="h-11 w-full rounded-xl border border-[#dfe5da] bg-white px-3 text-sm outline-none focus:border-[#91a386]"><option value="">Select a town or city</option>{selectedTowns.map((town) => <option key={locationKey(town)} value={locationKey(town)}>{town.name} · {town.countyName}</option>)}</select></div>
                    <div className="mt-3 flex gap-2">
                      <select value={areaToAdd} onChange={(event) => setAreaToAdd(event.target.value)} disabled={!activeTown || areasLoading || !areaOptions.length} className="h-11 min-w-0 flex-1 rounded-xl border border-[#dfe5da] bg-white px-3 text-sm outline-none focus:border-[#91a386]"><option value="">{!activeTown ? "Select a town first" : areasLoading ? "Loading area suggestions…" : areaOptions.length ? "Select an estate or area" : "No saved areas for this town"}</option>{areaOptions.filter((area) => !selectedAreas.some((item) => locationKey(item) === locationKey(area))).map((area) => <option key={area.id || locationKey(area)} value={area.id || ""}>{area.name} · {area.level.toLowerCase().replace(/_/g, " ")}</option>)}</select>
                      <Button type="button" variant="outline" onClick={addArea} disabled={!areaToAdd} className="h-11 rounded-xl border-[#dfe5da]"><Plus className="mr-1.5 h-4 w-4" />Add</Button>
                    </div>
                    <button type="button" onClick={() => { setManualAreaOpen((open) => !open); setManualAreaTown(activeTown ? locationKey(activeTown) : selectedTowns[0] ? locationKey(selectedTowns[0]) : ""); }} disabled={!selectedTowns.length} className="mt-3 text-xs font-medium text-[#53694b] underline underline-offset-4">Estate or area not listed? Add it manually</button>
                    {manualAreaOpen && <div className="mt-3 grid gap-2 rounded-xl bg-[#f7f8f4] p-3 sm:grid-cols-2">
                      <div><label className="mb-1 block text-xs font-medium">Estate / area name</label><Input value={manualAreaName} onChange={(event) => setManualAreaName(event.target.value)} placeholder="e.g. a local estate" className="h-10 rounded-lg" /></div>
                      <div><label className="mb-1 block text-xs font-medium">Type</label><select value={manualAreaLevel} onChange={(event) => setManualAreaLevel(event.target.value)} className="h-10 w-full rounded-lg border bg-white px-3 text-sm"><option value="ESTATE">Estate</option><option value="NEIGHBORHOOD">Neighbourhood</option><option value="AREA">Area</option><option value="VILLAGE">Village</option><option value="LOCALITY">Local centre / locality</option></select></div>
                      <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium">Parent town / city</label><select value={manualAreaTown} onChange={(event) => setManualAreaTown(event.target.value)} className="h-10 w-full rounded-lg border bg-white px-3 text-sm">{selectedTowns.map((town) => <option key={locationKey(town)} value={locationKey(town)}>{town.name} · {town.countyName}</option>)}</select></div>
                      <div className="sm:col-span-2"><Button type="button" onClick={addManualArea} className="rounded-lg bg-[#53694b] hover:bg-[#43563c]">Add area</Button></div>
                    </div>}
                    {selectedAreas.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{selectedAreas.map((area) => <span key={locationKey(area)} className="inline-flex items-center gap-2 rounded-full border border-[#dce5d5] bg-[#f2f5ef] px-3 py-1.5 text-sm text-[#43583b]">{area.name}<span className="text-xs text-[#71806c]">{[area.parentName, area.countyName].filter(Boolean).join(", ")}{area.custom ? " · custom" : ""}</span><button type="button" onClick={() => setSelectedAreas((current) => current.filter((item) => locationKey(item) !== locationKey(area)))} aria-label={"Remove " + area.name} className="rounded-full p-0.5 hover:bg-white"><Trash2 className="h-3.5 w-3.5" /></button></span>)}</div>}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#788174]">County selection is required. Towns and estates are optional; adding them helps us send you more relevant enquiries. Your custom entries are saved to your agent profile and do not alter the shared location directory.</p>
                </section>
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
