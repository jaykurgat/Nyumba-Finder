"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Bath, BedDouble, Check, CheckCircle2, ChevronDown,
  Clock3, Heart, Home, Mail, MapPin, MessageCircle, Search, ShieldCheck,
  Sparkles, Wallet, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LocationSuggestion = {
  id: string; name: string; level: string; countyId?: string; countyName: string;
  parentId?: string | null; parentName?: string | null; label: string;
};
type PreferredLocation = {
  label: string; name: string; level: string; countyName: string; townName: string;
  areaName: string; locationNodeId: string | null; parentId: string | null;
  source: "DATABASE" | "CUSTOM";
};
type MatchedProperty = {
  id: string;
  title: string;
  location: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  image: string;
  href: string;
  reasons: string[];
};
type SubmissionResult = {
  reference: string;
  matches: MatchedProperty[];
  totalMatches: number;
  hasMoreMatches: boolean;
  usedNearbyFallback: boolean;
  whatsappUrl: string | null;
  notifications: {
    adminEmailSent: boolean;
    clientEmailSent: boolean;
    whatsappAdminSent: boolean;
    whatsappClientSent: boolean;
    emailConfigured: boolean;
    whatsappConfigured: boolean;
  };
};

const homeTypes = [
  { value: "Bedsitter", label: "Bedsitter", detail: "A compact, self-contained space" },
  { value: "Studio", label: "Studio", detail: "Open-plan living and sleeping" },
  { value: "Apartment", label: "Apartment", detail: "A flat in a residential building" },
  { value: "House", label: "Standalone house", detail: "More room to make your own" },
  { value: "Shared accommodation", label: "Shared home", detail: "A room in a shared property" },
  { value: "Any type", label: "I'm flexible", detail: "Show me what fits my needs" },
];
const featureOptions = [
  "Reliable water", "Secure access", "Near matatu stage", "Near work or school",
  "Parking", "Internet ready", "Pet friendly", "Accessible entrance",
];
const moveInOptions = ["Immediately", "Within 2 weeks", "Within a month", "Flexible", "Later"];

const currency = (value: number) => "KSh " + value.toLocaleString("en-KE");

export default function FindAHousePage() {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<LocationSuggestion[]>([]);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [customCounty, setCustomCounty] = useState("");
  const [customTown, setCustomTown] = useState("");
  const [counties, setCounties] = useState<Array<{ id: string; name: string }>>([]);
  const [customTowns, setCustomTowns] = useState<LocationSuggestion[]>([]);
  const [customTownManual, setCustomTownManual] = useState(false);
  const [customLevel, setCustomLevel] = useState("NEIGHBORHOOD");
  const [form, setForm] = useState({
    propertyType: "Apartment",
    bedrooms: 1,
    countyName: "",
    townName: "",
    preferredAreas: [] as string[],
    preferredLocations: [] as PreferredLocation[],
    minRent: "",
    maxRent: "",
    moveIn: "Within a month",
    mustHaves: [] as string[],
    notes: "",
    name: "",
    phone: "",
    email: "",
    contactPreference: "WHATSAPP",
    consent: false,
    website: "",
  });

  const update = (key: keyof typeof form, value: string | number | boolean | string[]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/locations?kind=counties", { cache: "no-store" }).then((response) => response.json()), fetch("/api/locations?level=TOWN", { cache: "no-store" }).then((response) => response.json()), fetch("/api/locations?level=CITY", { cache: "no-store" }).then((response) => response.json())]).then(([countyData, townData, cityData]) => {
      if (cancelled) return;
      setCounties(Array.isArray(countyData.counties) ? countyData.counties : []);
      setCustomTowns([...(Array.isArray(townData.locations) ? townData.locations : []), ...(Array.isArray(cityData.locations) ? cityData.locations : [])]);
    }).catch(() => { if (!cancelled) { setCounties([]); setCustomTowns([]); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationResults([]);
      setLocationBusy(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLocationBusy(true);
      try {
        const response = await fetch("/api/locations?q=" + encodeURIComponent(query), { cache: "no-store" });
        const data = await response.json();
        if (!cancelled) setLocationResults(Array.isArray(data.locations) ? data.locations : []);
      } catch {
        if (!cancelled) setLocationResults([]);
      } finally {
        if (!cancelled) setLocationBusy(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [locationQuery]);

  function applyPreferredLocations(next: PreferredLocation[]) {
    const locations = next.slice(0, 5);
    const first = locations[0];
    setForm((current) => ({
      ...current,
      preferredLocations: locations,
      countyName: first?.countyName || "",
      townName: first?.townName || "",
      preferredAreas: locations.filter((location, index) => Boolean(location.areaName) || index > 0).map((location) => location.label).slice(0, 5),
    }));
  }

  function chooseLocation(option: LocationSuggestion) {
    const isArea = !["COUNTY", "TOWN", "CITY"].includes(option.level);
    const isTown = ["TOWN", "CITY"].includes(option.level);
    const label = option.label || [option.name, option.parentName, option.countyName].filter(Boolean).join(", ");
    const selected: PreferredLocation = {
      label, name: option.name, level: option.level, countyName: option.countyName,
      townName: isTown ? option.name : (isArea ? option.parentName || "" : ""),
      areaName: isArea ? option.name : "",
      locationNodeId: option.id, parentId: option.parentId || null, source: "DATABASE",
    };
    if (form.preferredLocations.some((item) => item.label.toLowerCase() === label.toLowerCase())) {
      setError("That location is already in your preferred list.");
      return;
    }
    if (form.preferredLocations.length >= 5) {
      setError("You can add up to five preferred locations.");
      return;
    }
    setError("");
    applyPreferredLocations([...form.preferredLocations, selected]);
    setLocationQuery("");
    setLocationResults([]);
    setLocationOpen(false);
  }

  function addCustomLocation() {
    const name = locationQuery.trim();
    const countyName = customCounty.trim();
    const townName = customTown.trim();
    if (name.length < 2) { setError("Enter the name of the location you want to add."); return; }
    if (countyName.length < 2) { setError("Enter the parent county for this location."); return; }
    const areaName = ["ESTATE", "NEIGHBORHOOD", "AREA", "VILLAGE", "LOCALITY"].includes(customLevel) ? name : "";
    const resolvedTown = ["TOWN", "CITY"].includes(customLevel) ? name : townName;
    const label = [name, resolvedTown && resolvedTown !== name ? resolvedTown : "", countyName].filter(Boolean).join(", ");
    if (form.preferredLocations.some((item) => item.label.toLowerCase() === label.toLowerCase())) {
      setError("That location is already in your preferred list.");
      return;
    }
    if (form.preferredLocations.length >= 5) { setError("You can add up to five preferred locations."); return; }
    const selected: PreferredLocation = {
      label, name, level: customLevel, countyName, townName: resolvedTown,
      areaName, locationNodeId: null, parentId: null, source: "CUSTOM",
    };
    setError("");
    applyPreferredLocations([...form.preferredLocations, selected]);
    setLocationQuery("");
    setLocationResults([]);
    setLocationOpen(false);
    setCustomTown("");
  }

  function moveLocation(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= form.preferredLocations.length) return;
    const next = [...form.preferredLocations];
    [next[index], next[target]] = [next[target], next[index]];
    applyPreferredLocations(next);
  }

  function removeLocation(value: string) {
    applyPreferredLocations(form.preferredLocations.filter((item) => item.label !== value));
  }

  function toggleFeature(feature: string) {
    update("mustHaves", form.mustHaves.includes(feature)
      ? form.mustHaves.filter((item) => item !== feature)
      : [...form.mustHaves, feature]);
  }

  function validateStep() {
    setError("");
    if (step === 1 && !form.propertyType) return "Choose the kind of home you would like.";
    if (step === 2 && form.preferredLocations.length === 0) return "Add at least one preferred location, using a suggestion or your own entry.";
    if (step === 3) {
      if (!form.maxRent || Number(form.maxRent) <= 0) return "Enter your maximum monthly rent.";
      if (form.minRent && Number(form.minRent) > Number(form.maxRent)) return "Your minimum rent cannot be higher than your maximum.";
    }
    if (step === 4) {
      if (form.name.trim().length < 2) return "Enter your name so we know who to contact.";
      if (form.phone.trim().length < 7) return "Enter a valid phone number.";
      if (form.contactPreference === "EMAIL" && !form.email.trim()) return "Enter your email or choose WhatsApp or phone.";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Check the email address you entered.";
      if (!form.consent) return "Please agree to be contacted about your house search.";
    }
    return "";
  }

  function nextStep() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep((current) => Math.min(4, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 4) { nextStep(); return; }
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/house-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bedrooms: Number(form.bedrooms),
          minRent: form.minRent ? Number(form.minRent) : undefined,
          maxRent: Number(form.maxRent),
          preferredAreas: form.preferredAreas,
          preferredLocations: form.preferredLocations,
          agentSharingConsent: form.consent,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "We couldn't submit your request.");
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-14">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-[2rem] border border-[#dce3d6] bg-[#f5f6f0] p-6 sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e0e8d9] text-[#4f6748]"><CheckCircle2 className="h-7 w-7" /></div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#62765a]">Request received</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#253126] sm:text-4xl">Your next home search starts here.</h1>
            <p className="mt-3 max-w-2xl leading-7 text-[#606a5d]">Thanks, {form.name}. We've received your house-hunting request. A NyumbaFinder representative will reach out to discuss suitable options and the next steps.</p>
            <div className="mt-5 rounded-2xl border border-[#d7dfd0] bg-white p-4 sm:p-5">
              <p className="text-sm font-semibold text-[#33432f]">Your House Hunt service · KSh 2,500</p>
              <p className="mt-2 text-sm leading-6 text-[#606a5d]">Includes up to five WhatsApp video previews of suitable properties, subject to availability, plus help coordinating viewings. No payment has been taken through this form; your representative will explain the next steps.</p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[#d7dfd0] bg-white px-4 py-2 text-sm font-medium text-[#33432f]">Reference {result.reference}</span>
              <span className="rounded-full bg-white/80 px-4 py-2 text-sm text-[#606a5d]">{result.totalMatches} {result.totalMatches === 1 ? "suggested match" : "suggested matches"}</span>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {result.whatsappUrl ? (
                <Button asChild className="h-12 rounded-xl bg-[#53694b] px-5 hover:bg-[#43563c]">
                  <a href={result.whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Contact us on WhatsApp</a>
                </Button>
              ) : (
                <Button asChild className="h-12 rounded-xl bg-[#53694b] px-5 hover:bg-[#43563c]">
                  <Link href="/properties"><Search className="mr-2 h-4 w-4" />Browse available homes</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="h-12 rounded-xl border-[#d7dfd0] bg-white px-5"><Link href="/properties">Browse all homes <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#53634d]">
              {result.notifications.clientEmailSent
                ? "A confirmation email has been sent to " + form.email + "."
                : result.notifications.whatsappClientSent
                  ? "A WhatsApp confirmation has been sent to your phone."
                  : form.email
                    ? "Your request is saved. Email confirmation is not available right now, so keep your reference number."
                    : "Your request is saved. Keep your reference number, and use WhatsApp below to contact our team."}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#6c7569]">Property availability must be confirmed with the listing contact. Your request reference is {result.reference}.</p>
          </div>

          <div className="mt-10">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Selected for you</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Homes that may fit</h2>
                <p className="mt-2 text-sm text-muted-foreground">Ranked using your budget, preferred location and house requirements.</p>
              </div>
            </div>
            {result.usedNearbyFallback && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">We couldn't find a close match in your exact location, so these options are broader suggestions within your budget. Check each location before arranging a visit.</div>}
            {result.matches.length ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {result.matches.map((property) => (
                  <article key={property.id} className="group overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                    <Link href={property.href} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-[#f1f0eb]">
                        {property.image ? <img src={property.image} alt={property.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><Home className="h-9 w-9" /></div>}
                        <span className="absolute right-3 top-3 rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-sm font-semibold text-[#263426]">{currency(property.price)}<span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span></span>
                      </div>
                    </Link>
                    <div className="p-4">
                      <h3 className="truncate font-semibold">{property.title}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{property.location}</p>
                      <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4" />{property.bedrooms === 0 ? "Studio" : property.bedrooms + " beds"}</span>
                        <span className="flex items-center gap-1.5"><Bath className="h-4 w-4" />{property.bathrooms} baths</span>
                      </div>
                      {!!property.reasons.length && <div className="mt-4 flex flex-wrap gap-1.5">{property.reasons.slice(0, 3).map((reason) => <span key={reason} className="rounded-full bg-[#f0f3ed] px-2.5 py-1 text-[11px] font-medium text-[#52674b]">{reason}</span>)}</div>}
                      <Button asChild variant="outline" className="mt-4 h-10 w-full rounded-xl"><Link href={property.href}>View property <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed p-8 text-center">
                <Search className="mx-auto h-7 w-7 text-muted-foreground" />
                <h3 className="mt-3 font-semibold">No close matches just yet</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">We haven't found a listed home that fits your current budget and requirements. Contact us and we can help you explore alternatives.</p>
                {result.whatsappUrl && <Button asChild className="mt-4 rounded-xl"><a href={result.whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Ask us to help</a></Button>}
              </div>
            )}
            {result.hasMoreMatches && <p className="mt-5 text-center text-sm text-muted-foreground">These are the strongest matches from the current listings. <Link className="font-medium text-primary underline underline-offset-4" href="/properties">Browse all rentals</Link> for more options.</p>}
            <div className="mt-8 rounded-2xl border p-5 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Want help finding another option?</p>
                <p className="mt-1 text-sm text-muted-foreground">Share your request reference when you contact us: {result.reference}</p>
              </div>
              {result.whatsappUrl && <Button asChild variant="outline" className="mt-4 rounded-xl sm:mt-0"><a href={result.whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Get personal help</a></Button>}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
        <section>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to NyumbaFinder</Link>
          <div className="mt-5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dfe5d9] bg-[#f5f6f0] px-3 py-1.5 text-xs font-medium text-[#52674b]"><Sparkles className="h-3.5 w-3.5" /> A more personal way to find a home</div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">Find a house that suits your needs.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Tell us what matters to you. We'll match your needs with listed rentals, then you can contact our team if you'd like a little more help.</p>
          </div>

          <div className="mt-5 flex items-center gap-2" aria-label={"Step " + step + " of 4"}>
            {[1, 2, 3, 4].map((item) => <div key={item} className={"h-1.5 flex-1 rounded-full transition-colors " + (item <= step ? "bg-[#627957]" : "bg-muted")} />)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>STEP 0{step} OF 04</span><span>{["Your home", "Location", "Your budget", "Contact"][step - 1]}</span></div>

          <form onSubmit={submit} className="mt-5">
            {step === 1 && (
              <section className="animate-in fade-in duration-300">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">First, the basics</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">What kind of home do you have in mind?</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose the closest fit. You can keep your options open.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {homeTypes.map((type) => (
                    <button key={type.value} type="button" onClick={() => { update("propertyType", type.value); update("bedrooms", ["Bedsitter", "Studio"].includes(type.value) ? 0 : form.bedrooms === 0 ? 1 : form.bedrooms); }} className={"group rounded-2xl border p-4 text-left transition-all hover:border-[#8c9c82] hover:bg-[#f8f9f5] " + (form.propertyType === type.value ? "border-[#718568] bg-[#f3f6ef] ring-1 ring-[#718568]" : "bg-card")}>
                      <span className="flex items-center justify-between gap-3"><span className="font-semibold">{type.label}</span><span className={"flex h-5 w-5 items-center justify-center rounded-full border " + (form.propertyType === type.value ? "border-[#627957] bg-[#627957] text-white" : "border-border text-transparent")}><Check className="h-3 w-3" /></span></span>
                      <span className="mt-1.5 block text-sm leading-5 text-muted-foreground">{type.detail}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-7 rounded-2xl border p-4 sm:flex sm:items-center sm:justify-between">
                  <div><p className="font-medium">How many bedrooms?</p><p className="mt-1 text-sm text-muted-foreground">We'll show homes with at least this many.</p></div>
                  <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
                    {[0, 1, 2, 3, 4].map((n) => <button key={n} type="button" onClick={() => update("bedrooms", n)} className={"h-10 min-w-11 rounded-xl border px-3 text-sm font-medium transition-colors " + (form.bedrooms === n ? "border-[#627957] bg-[#edf2e8] text-[#405638]" : "hover:bg-muted")}>{n === 0 ? "Studio" : n === 4 ? "4+" : n}</button>)}
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="animate-in fade-in duration-300">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">A place to call home</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">Where would you like to live?</h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">Add up to five locations in priority order. Choose from our location database or add a missing estate, village, town or neighbourhood yourself.</p>
                <div className="relative mt-4 rounded-2xl border bg-card p-3 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="location-search" className="block text-sm font-medium">Preferred locations</label>
                    <span className="text-xs text-muted-foreground">{form.preferredLocations.length} of 5 selected</span>
                  </div>
                  {form.preferredLocations.length > 0 && <div className="mb-4 flex flex-col gap-2">
                    {form.preferredLocations.map((location, index) => <div key={location.label} className="flex items-center gap-2 rounded-xl border border-[#dce4d5] bg-white px-3 py-2.5 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#53694b] text-xs font-semibold text-white">{index + 1}</span>
                      <span className="min-w-0 flex-1"><span className="block font-medium text-[#33432f]">{location.name}</span><span className="block text-xs text-muted-foreground">{[location.townName && location.townName !== location.name ? location.townName : "", location.countyName].filter(Boolean).join(", ")}{location.source === "CUSTOM" ? " · Added by you" : ""}</span></span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" disabled={index === 0} onClick={() => moveLocation(index, -1)} aria-label="Move location up" className="rounded-md p-1.5 hover:bg-muted disabled:opacity-30"><ArrowLeft className="h-3.5 w-3.5" /></button>
                        <button type="button" disabled={index === form.preferredLocations.length - 1} onClick={() => moveLocation(index, 1)} aria-label="Move location down" className="rounded-md p-1.5 hover:bg-muted disabled:opacity-30"><ArrowRight className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => removeLocation(location.label)} aria-label={"Remove " + location.label} className="rounded-md p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
                      </div>
                    </div>)}
                  </div>}
                  {form.preferredLocations.length < 5 ? <>
                    <label htmlFor="location-search" className="mb-2 block text-xs text-muted-foreground">{form.preferredLocations.length ? "Search for another location" : "Search a county, town, city, estate or neighbourhood"}</label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="location-search" value={locationQuery} onChange={(event) => { setLocationQuery(event.target.value); setLocationOpen(true); setError(""); }} onFocus={() => setLocationOpen(true)} placeholder={form.preferredLocations.length ? "Add another location…" : "e.g. Kapsabet, Kilimani, a village…"} className="h-12 rounded-xl pl-11 pr-10" autoComplete="off" />
                      {locationQuery && <button type="button" onClick={() => { setLocationQuery(""); setLocationResults([]); }} aria-label="Clear location search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>}
                    </div>
                    {locationOpen && locationQuery.trim().length >= 2 && <div className="absolute z-20 mt-2 max-h-64 w-[calc(100%-2rem)] overflow-y-auto rounded-xl border bg-background p-1 shadow-xl">
                      {locationBusy ? <p className="px-3 py-4 text-sm text-muted-foreground">Finding locations…</p> : locationResults.length ? locationResults.map((option) => <button key={option.id} type="button" onClick={() => chooseLocation(option)} className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{option.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{option.label}</span></span><span className="text-[10px] uppercase tracking-wide text-muted-foreground">{option.level.replace(/_/g, " ").toLowerCase()}</span></button>) : <p className="px-3 py-3 text-sm text-muted-foreground">No matching database location found. You can add it below.</p>}
                    </div>}
                    <div className="mt-4 rounded-xl border border-dashed p-3 sm:p-4">
                      <p className="text-sm font-medium">Can't find your location?</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Add it manually. We'll save it with its parent county and, where supplied, town/city. New entries are kept for review before being offered as verified suggestions to everyone.</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div><label htmlFor="custom-location-name" className="mb-1.5 block text-xs font-medium">Location name *</label><Input id="custom-location-name" value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Estate, village or town name" className="h-10 rounded-lg" /></div>
                        <div><label htmlFor="custom-location-level" className="mb-1.5 block text-xs font-medium">Type of location *</label><select id="custom-location-level" value={customLevel} onChange={(event) => setCustomLevel(event.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="TOWN">Town</option><option value="CITY">City</option><option value="ESTATE">Estate</option><option value="NEIGHBORHOOD">Neighbourhood</option><option value="AREA">Area</option><option value="VILLAGE">Village</option><option value="LOCALITY">Local centre / locality</option></select></div>
                        <div><label htmlFor="custom-location-county" className="mb-1.5 block text-xs font-medium">Parent county *</label><select id="custom-location-county" value={customCounty} onChange={(event) => { setCustomCounty(event.target.value); setCustomTown(""); setCustomTownManual(false); }} required className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Select a county</option>{counties.map((county) => <option key={county.id} value={county.name}>{county.name}</option>)}</select></div>
                        {!["TOWN", "CITY"].includes(customLevel) && <div><label htmlFor="custom-location-town" className="mb-1.5 block text-xs font-medium">Parent town / city <span className="font-normal text-muted-foreground">(if known)</span></label><select id="custom-location-town" value={customTownManual ? "__manual__" : customTown} onChange={(event) => { if (event.target.value === "__manual__") { setCustomTown(""); setCustomTownManual(true); } else { setCustomTown(event.target.value); setCustomTownManual(false); } }} className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Select a town/city (optional)</option>{customTowns.filter((town) => town.countyName === customCounty).map((town) => <option key={town.id} value={town.name}>{town.name}</option>)}<option value="__manual__">Town/city not listed — enter manually</option></select>{customTownManual && <Input value={customTown} onChange={(event) => setCustomTown(event.target.value)} placeholder="Enter town/city name" className="mt-2 h-10 rounded-lg" />}</div>}
                      </div>
                      <Button type="button" variant="outline" onClick={addCustomLocation} className="mt-3 h-10 w-full rounded-lg border-dashed"><span className="mr-2 text-base">+</span> Add this location</Button>
                    </div>
                  </> : <p className="text-sm text-muted-foreground">You've added five locations. Remove one to add another.</p>}
                </div>
                <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mr-2 inline h-4 w-4 text-primary" />We'll prioritize your locations in the order shown. User-added locations remain usable immediately while being reviewed for the shared location database.</div>
              </section>
            )}

            {step === 3 && (
              <section className="animate-in fade-in duration-300">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Comfort within reach</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">What feels comfortable for your budget?</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Use monthly rent, not the deposit. You can share other move-in costs in your note.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div><label htmlFor="min-rent" className="mb-2 block text-sm font-medium">Minimum rent <span className="text-muted-foreground">(optional)</span></label><div className="relative"><Wallet className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="min-rent" type="number" min="0" value={form.minRent} onChange={(event) => update("minRent", event.target.value)} placeholder="5,000" className="h-12 rounded-xl pl-10" /></div></div>
                  <div><label htmlFor="max-rent" className="mb-2 block text-sm font-medium">Maximum monthly rent <span className="text-primary">*</span></label><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KSh</span><Input id="max-rent" type="number" min="1" value={form.maxRent} onChange={(event) => update("maxRent", event.target.value)} placeholder="15,000" className="h-12 rounded-xl pl-12" /></div></div>
                </div>
                <div className="mt-7"><p className="text-sm font-medium">When would you like to move?</p><div className="mt-3 flex flex-wrap gap-2">{moveInOptions.map((option) => <button key={option} type="button" onClick={() => update("moveIn", option)} className={"rounded-xl border px-3.5 py-2.5 text-sm transition-colors " + (form.moveIn === option ? "border-[#627957] bg-[#edf2e8] font-medium text-[#405638]" : "hover:bg-muted")}>{option}</button>)}</div></div>
                <div className="mt-7"><p className="text-sm font-medium">What matters most? <span className="font-normal text-muted-foreground">(choose any)</span></p><div className="mt-3 grid gap-2 sm:grid-cols-2">{featureOptions.map((feature) => <button key={feature} type="button" onClick={() => toggleFeature(feature)} className={"flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors " + (form.mustHaves.includes(feature) ? "border-[#8c9c82] bg-[#f3f6ef] text-[#405638]" : "hover:bg-muted")}><span className={"flex h-5 w-5 shrink-0 items-center justify-center rounded-md border " + (form.mustHaves.includes(feature) ? "border-[#627957] bg-[#627957] text-white" : "border-border")}>{form.mustHaves.includes(feature) && <Check className="h-3 w-3" />}</span>{feature}</button>)}</div></div>
                <div className="mt-7"><label htmlFor="extra-notes" className="mb-2 block text-sm font-medium">Anything else we should know? <span className="text-muted-foreground">(optional)</span></label><textarea id="extra-notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} maxLength={1000} rows={3} placeholder="For example, close to a particular workplace or a ground-floor home…" className="w-full resize-y rounded-xl border bg-background px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /><p className="mt-1 text-right text-xs text-muted-foreground">{form.notes.length}/1000</p></div>
              </section>
            )}

            {step === 4 && (
              <section className="animate-in fade-in duration-300">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Almost there</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">How can we reach you?</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">A representative will review your requirements and contact you about suitable homes. The House Hunt service costs KSh 2,500.</p>
                <div className="mt-5 rounded-2xl border border-[#dce4d5] bg-[#f5f6f0] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[#33432f]">House Hunt assistance</p><span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#405638]">KSh 2,500</span></div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#53634d]">
                    <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0" />Up to five WhatsApp video previews of suitable properties, subject to availability.</li>
                    <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0" />Property details and help coordinating viewings.</li>
                    <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0" />A representative will contact you to discuss next steps.</li>
                  </ul>
                  <p className="mt-3 text-xs leading-5 text-[#687164]">This form records your interest; it does not collect payment. Any premium viewing or transport arrangements are discussed separately.</p>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div><label htmlFor="renter-name" className="mb-2 block text-sm font-medium">Your name <span className="text-primary">*</span></label><Input id="renter-name" autoComplete="name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Name you'd like us to use" className="h-12 rounded-xl" /></div>
                  <div><label htmlFor="renter-phone" className="mb-2 block text-sm font-medium">Phone / WhatsApp <span className="text-primary">*</span></label><Input id="renter-phone" autoComplete="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+254 7XX XXX XXX" className="h-12 rounded-xl" /></div>
                </div>
                <div className="mt-4"><label htmlFor="renter-email" className="mb-2 block text-sm font-medium">Email address <span className="text-muted-foreground">(recommended for confirmation)</span></label><Input id="renter-email" type="email" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="you@example.com" className="h-12 rounded-xl" /></div>
                <div className="mt-6"><p className="text-sm font-medium">How would you prefer us to contact you?</p><div className="mt-3 grid gap-2 sm:grid-cols-3">{[{value:"WHATSAPP",label:"WhatsApp",icon:MessageCircle},{value:"PHONE",label:"Phone call",icon:Clock3},{value:"EMAIL",label:"Email",icon:Mail}].map((item) => { const Icon = item.icon; return <button key={item.value} type="button" onClick={() => update("contactPreference", item.value)} className={"flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm transition-colors " + (form.contactPreference === item.value ? "border-[#627957] bg-[#edf2e8] font-medium text-[#405638]" : "hover:bg-muted")}><Icon className="h-4 w-4" />{item.label}</button>; })}</div></div>
                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6"><input type="checkbox" checked={form.consent} onChange={(event) => update("consent", event.target.checked)} className="mt-1 h-4 w-4 accent-[#627957]" /><span>I agree that NyumbaFinder may use these details to respond to my house search and contact me about suitable listings. I also consent to sharing my contact details with approved, matching local agents so they can respond to my request. My details won't be displayed publicly on the website.</span></label>
                <div className="hidden" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} /></div>
              </section>
            )}

            {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
            <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
              {step > 1 ? <Button type="button" variant="outline" onClick={() => { setError(""); setStep((current) => current - 1); }} className="h-12 rounded-xl px-5"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button> : <span className="text-xs text-muted-foreground">No account needed</span>}
              {step < 4 ? <Button type="button" onClick={nextStep} className="h-12 rounded-xl bg-[#53694b] px-6 hover:bg-[#43563c]">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button type="submit" disabled={busy} className="h-12 rounded-xl bg-[#53694b] px-6 hover:bg-[#43563c]">{busy ? "Sending your request…" : "Request House Hunt"} {!busy && <ArrowRight className="ml-2 h-4 w-4" />}</Button>}
            </div>
          </form>
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-2xl border border-[#e0e4da] bg-[#f5f6f0] p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#53694b]"><Heart className="h-5 w-5" /></div>
            <h2 className="mt-5 text-lg font-semibold tracking-tight">A search built around you.</h2>
            <p className="mt-2 text-sm leading-6 text-[#626b5e]">Share your requirements. A representative can help narrow the options and arrange WhatsApp video previews of suitable homes.</p>
            <div className="mt-6 space-y-4">
              <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#53694b]"><Search className="h-4 w-4" /></span><div><p className="text-sm font-medium">Relevant homes first</p><p className="mt-1 text-xs leading-5 text-[#687164]">Recommendations use your location and rent range.</p></div></div>
              <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#53694b]"><MessageCircle className="h-4 w-4" /></span><div><p className="text-sm font-medium">Real human help</p><p className="mt-1 text-xs leading-5 text-[#687164]">Get help shortlisting homes and coordinating video previews.</p></div></div>
              <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#53694b]"><ShieldCheck className="h-4 w-4" /></span><div><p className="text-sm font-medium">Your details stay private</p><p className="mt-1 text-xs leading-5 text-[#687164]">Your contact details stay private and are used to respond to your request.</p></div></div>
            </div>
            <div className="mt-7 border-t border-[#dfe4d8] pt-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#65755c]">Your progress</p><p className="mt-2 text-sm font-medium text-[#303c2c]">{step} of 4 steps complete</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#718568] transition-all" style={{ width: (step / 4) * 100 + "%" }} /></div></div>
          </div>
        </aside>
      </div>
    </main>
  );
}
