"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bath, BedDouble, ChevronDown, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const locations = ["Mombasa","Kwale","Kilifi","Hola","Lamu","Voi","Garissa","Wajir","Mandera","Marsabit","Isiolo","Meru","Kathwana","Embu","Kitui","Machakos","Wote","Ol Kalou","Nyeri","Kerugoya","Murang'a","Kiambu","Lodwar","Kapenguria","Maralal","Kitale","Eldoret","Iten","Kapsabet","Kabarnet","Nanyuki","Nakuru","Narok","Kajiado","Kericho","Bomet","Kakamega","Vihiga","Bungoma","Busia","Siaya","Kisumu","Homa Bay","Migori","Kisii","Nyamira","Nairobi"];
const amenities = ["Parking","Swimming Pool","Gym","Security","Balcony","Garden","Internet Ready","Servant Quarters","Lift","Water Included","Beach Access","Air Conditioning"];

const schema = z.object({
  listingType: z.string().optional(),
  location: z.string().optional(),
  minPrice: z.coerce.number().positive("Enter a valid minimum").optional().or(z.literal("")),
  maxPrice: z.coerce.number().positive("Enter a valid maximum").optional().or(z.literal("")),
  minBedrooms: z.string().optional(),
  minBathrooms: z.string().optional(),
  amenities: z.array(z.string()).optional(),
}).refine(function (data) {
  return !(data.minPrice && data.maxPrice && Number(data.minPrice) > Number(data.maxPrice));
}, { message: "Maximum price must be greater than minimum price", path: ["maxPrice"] });

type Values = z.infer<typeof schema>;

export function PropertySearchForm({ onFormSubmit, isInSheet = false }: { onFormSubmit?: () => void; isInSheet?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      listingType: params.get("listingType") || "ALL",
      location: params.get("location") || "",
      minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : "",
      maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : "",
      minBedrooms: params.get("minBedrooms") || "all",
      minBathrooms: params.get("minBathrooms") || "all",
      amenities: params.getAll("amenities"),
    },
  });

  useEffect(function () {
    form.reset({
      listingType: params.get("listingType") || "ALL",
      location: params.get("location") || "",
      minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : "",
      maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : "",
      minBedrooms: params.get("minBedrooms") || "all",
      minBathrooms: params.get("minBathrooms") || "all",
      amenities: params.getAll("amenities"),
    });
  }, [params, form]);

  const v = form.watch();
  const amenityCount = v.amenities?.length || 0;
  const priceActive = Boolean(v.minPrice || v.maxPrice);
  const bedsActive = Boolean(v.minBedrooms && v.minBedrooms !== "all");
  const bathsActive = Boolean(v.minBathrooms && v.minBathrooms !== "all");

  const listingType = v.listingType || "ALL";
  const locationValue = String(v.location || "").trim();
  const pricePeriodLabel = listingType === "FOR_SALE" ? "Sale price" : listingType === "SHORT_STAY" ? "Nightly price" : listingType === "FOR_RENT" ? "Monthly rent" : "Price";
  const priceLabel = useMemo(function () {
    if (v.minPrice && v.maxPrice) return "KSh " + Number(v.minPrice).toLocaleString() + " – " + Number(v.maxPrice).toLocaleString();
    if (v.minPrice) return "KSh " + Number(v.minPrice).toLocaleString() + "+";
    if (v.maxPrice) return "Up to KSh " + Number(v.maxPrice).toLocaleString();
    return pricePeriodLabel;
  }, [v.minPrice, v.maxPrice, pricePeriodLabel]);

  const bedsLabel = v.minBedrooms === "0" ? "Studio" : v.minBedrooms && v.minBedrooms !== "all" ? v.minBedrooms + "+ beds" : "Beds";
  const bathsLabel = v.minBathrooms && v.minBathrooms !== "all" ? v.minBathrooms + "+ baths" : "Baths";

  function submit(data: Values) {
    const next = new URLSearchParams();
    if (data.listingType && data.listingType !== "ALL") next.set("listingType", data.listingType);
    if (data.location?.trim()) next.set("location", data.location.trim());
    if (data.minPrice) next.set("minPrice", String(data.minPrice));
    if (data.maxPrice) next.set("maxPrice", String(data.maxPrice));
    if (data.minBedrooms && data.minBedrooms !== "all") next.set("minBedrooms", data.minBedrooms);
    if (data.minBathrooms && data.minBathrooms !== "all") next.set("minBathrooms", data.minBathrooms);
    (data.amenities || []).forEach(function (item) { next.append("amenities", item); });
    router.push(next.toString() ? "/properties?" + next.toString() : "/properties");
    setOpen(null);
    setLocationOpen(false);
    onFormSubmit?.();
  }

  function removeFilter(name: keyof Values, value?: string) {
    const next = { ...v };
    if (name === "amenities") next.amenities = (next.amenities || []).filter(function (item) { return item !== value; });
    else if (name === "minPrice" || name === "maxPrice") next[name] = "";
    else if (name === "minBedrooms" || name === "minBathrooms") next[name] = "all";
    else if (name === "listingType") next.listingType = "ALL";
    else if (name === "location") next.location = "";
    submit(next);
  }

  function clear() {
    form.reset({ listingType: "ALL", location: "", minPrice: "", maxPrice: "", minBedrooms: "all", minBathrooms: "all", amenities: [] });
    router.push("/properties");
    setOpen(null);
    setLocationOpen(false);
    onFormSubmit?.();
  }

  if (isInSheet) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
          <ListingTypeField form={form} />
          <LocationField form={form} locationOpen={locationOpen} setLocationOpen={setLocationOpen} />
          <Panel title="Price range" description={pricePeriodLabel}>
            <PriceFields form={form} />
          </Panel>
          <Panel title="Bedrooms" description="Minimum bedrooms">
            <ChoiceGrid value={v.minBedrooms || "all"} options={["all","0","1","2","3","4"]} labels={["Any","Studio","1+","2+","3+","4+"]} onChange={function (x) { form.setValue("minBedrooms", x); setOpen(null); }} />
          </Panel>
          <Panel title="Bathrooms" description="Minimum bathrooms">
            <ChoiceGrid value={v.minBathrooms || "all"} options={["all","1","2","3","4","5"]} labels={["Any","1+","2+","3+","4+","5+"]} onChange={function (x) { form.setValue("minBathrooms", x); setOpen(null); }} />
          </Panel>
          <AmenityPanel form={form} />
          <div className="sticky bottom-0 -mx-4 flex gap-2 border-t bg-background px-4 py-4">
            <Button type="button" variant="ghost" onClick={clear} className="flex-1">Clear all</Button>
            <Button type="submit" className="flex-[2]">Show results</Button>
          </div>
        </form>
      </Form>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="relative rounded-2xl border bg-background p-2 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center">
          <ListingTypeField form={form} compact />
          <LocationField form={form} compact locationOpen={locationOpen} setLocationOpen={setLocationOpen} />
          <div className="hidden h-8 w-px bg-border lg:block" />
          <FilterMenu name="price" label={priceLabel} active={priceActive} open={open === "price"} setOpen={setOpen} icon={null}>
            <PriceFields form={form} />
          </FilterMenu>
          <FilterMenu name="beds" label={bedsLabel} active={bedsActive} open={open === "beds"} setOpen={setOpen} icon={<BedDouble className="h-4 w-4" />}>
            <ChoiceGrid value={v.minBedrooms || "all"} options={["all","0","1","2","3","4"]} labels={["Any","Studio","1+","2+","3+","4+"]} onChange={function (x) { form.setValue("minBedrooms", x); setOpen(null); }} />
          </FilterMenu>
          <FilterMenu name="baths" label={bathsLabel} active={bathsActive} open={open === "baths"} setOpen={setOpen} icon={<Bath className="h-4 w-4" />}>
            <ChoiceGrid value={v.minBathrooms || "all"} options={["all","1","2","3","4","5"]} labels={["Any","1+","2+","3+","4+","5+"]} onChange={function (x) { form.setValue("minBathrooms", x); setOpen(null); }} />
          </FilterMenu>
          <FilterMenu name="more" label={amenityCount ? "More filters (" + amenityCount + ")" : "More filters"} active={amenityCount > 0} open={open === "more"} setOpen={setOpen} icon={<SlidersHorizontal className="h-4 w-4" />}>
            <AmenityPanel form={form} />
          </FilterMenu>
          <Button type="submit" className="h-11 gap-2 px-5 lg:ml-1"><Search className="h-4 w-4" /><span>Search</span></Button>
        </div>
      </form>
      {(locationValue || listingType !== "ALL" || priceActive || bedsActive || bathsActive || amenityCount > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {locationValue && <FilterChip label={locationValue} onRemove={function () { removeFilter("location"); }} />}
          {listingType !== "ALL" && <FilterChip label={listingType === "FOR_RENT" ? "For Rent" : listingType === "FOR_SALE" ? "For Sale" : "Short Stay"} onRemove={function () { removeFilter("listingType"); }} />}
          {priceActive && <FilterChip label={priceLabel} onRemove={function () { const next = { ...v, minPrice: "", maxPrice: "" }; submit(next); }} />}
          {bedsActive && <FilterChip label={bedsLabel} onRemove={function () { removeFilter("minBedrooms"); }} />}
          {bathsActive && <FilterChip label={bathsLabel} onRemove={function () { removeFilter("minBathrooms"); }} />}
          {(v.amenities || []).map(function (item) { return <FilterChip key={item} label={item} onRemove={function () { removeFilter("amenities", item); }} />; })}
          <button type="button" onClick={clear} className="ml-1 inline-flex h-8 items-center px-2 text-sm font-medium text-primary hover:underline">Clear all</button>
        </div>
      )}
    </Form>
  );
}

function ListingTypeField({ form, compact = false }: { form: any; compact?: boolean }) {
  return (
    <div className={compact ? "flex min-h-12 items-center px-3 lg:min-w-[145px]" : "space-y-2"}>
      {!compact && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Listing type</p>}
      <FormField control={form.control} name="listingType" render={function ({ field }: any) {
        return <FormItem className={compact ? "w-full space-y-0" : ""}>
          <FormControl>
            <div className="relative w-full">
              <select {...field} className={(compact ? "h-10 w-full rounded-lg border border-border/70 bg-background px-3 pr-9 text-sm font-medium shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 " : "h-11 w-full appearance-none rounded-xl border bg-background px-3 pr-10 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 ") + "appearance-none"}>
                <option value="ALL">All listings</option>
                <option value="FOR_RENT">For Rent</option>
                <option value="FOR_SALE">For Sale</option>
                <option value="SHORT_STAY">Short Stay</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </FormControl>
          {!compact && <FormMessage />}
        </FormItem>;
      }} />
    </div>
  );
}

function LocationField({ form, compact = false, locationOpen = false, setLocationOpen }: { form: any; compact?: boolean; locationOpen?: boolean; setLocationOpen?: (x: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const value = String(form.watch("location") || "");
  const matches = locations.filter(function (item) { return !value.trim() || item.toLowerCase().includes(value.trim().toLowerCase()); }).slice(0, 8);

  useEffect(function () {
    function handlePointer(event: MouseEvent) { if (ref.current && !ref.current.contains(event.target as Node)) setLocationOpen?.(false); }
    function handleKey(event: KeyboardEvent) { if (event.key === "Escape") setLocationOpen?.(false); }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return function () { document.removeEventListener("mousedown", handlePointer); document.removeEventListener("keydown", handleKey); };
  }, [setLocationOpen]);

  return (
    <div ref={ref} className={(compact ? "flex min-h-12 flex-1 items-center gap-3 px-3" : "space-y-2") + " relative"}>
      {!compact && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</p>}
      <FormField control={form.control} name="location" render={function ({ field }: any) {
        return (
          <FormItem className="min-w-0 flex-1 space-y-0">
            <FormControl>
              <div className={compact ? "flex items-center gap-3" : "flex items-center gap-3 border bg-background px-3"}>
                {compact && <MapPin className="h-5 w-5 shrink-0 text-primary" />}
                {!compact && <MapPin className="h-4 w-4 text-primary" />}
                <Input {...field} value={field.value || ""} onFocus={function () { setLocationOpen?.(true); }} onChange={function (event) { field.onChange(event); setLocationOpen?.(true); }} placeholder={compact ? "Search city, neighbourhood or estate" : "City, neighbourhood or estate"} className={compact ? "h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" : "h-12 border-0 px-0 shadow-none focus-visible:ring-0"} />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }} />
      {locationOpen && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-14 z-50 overflow-hidden rounded-xl border bg-background shadow-xl">
          <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Location suggestions</div>
          {matches.map(function (item) {
            return <button key={item} type="button" onMouseDown={function (event) { event.preventDefault(); form.setValue("location", item, { shouldDirty: true }); setLocationOpen?.(false); }} className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"><MapPin className="h-4 w-4 shrink-0 text-primary" /><span>{item}</span></button>;
          })}
        </div>
      )}
    </div>
  );
}

function FilterMenu({ name, label, active, open, setOpen, icon, children }: { name: string; label: string; active: boolean; open: boolean; setOpen: (x: string | null) => void; icon: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(function () {
    if (!open) return;
    function handlePointer(event: MouseEvent) { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(null); }
    function handleKey(event: KeyboardEvent) { if (event.key === "Escape") setOpen(null); }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return function () { document.removeEventListener("mousedown", handlePointer); document.removeEventListener("keydown", handleKey); };
  }, [open, setOpen]);

  return (
    <div ref={ref} className="relative">
      <Button type="button" variant="ghost" onClick={function () { setOpen(open ? null : name); }} aria-expanded={open} className={"h-11 w-full justify-between gap-2 border px-3 lg:w-auto lg:justify-center " + (active || open ? "border-primary/30 bg-primary/5 text-primary" : "border-transparent")}>
        {icon}{label}<ChevronDown className={"h-4 w-4 transition-transform " + (open ? "rotate-180" : "")} />
      </Button>
      {open && <div className="absolute left-0 top-12 z-50 w-[330px] max-w-[calc(100vw-2rem)] rounded-xl border bg-background p-5 shadow-xl">{children}</div>}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <span className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-background px-3 text-sm text-foreground shadow-sm"><span className="max-w-[220px] truncate">{label}</span><button type="button" onClick={onRemove} aria-label={"Remove " + label} className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-3.5 w-3.5" /></button></span>;
}
function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="space-y-3"><div><h3 className="font-semibold">{title}</h3><p className="text-sm text-muted-foreground">{description}</p></div>{children}</section>;
}

function PriceFields({ form }: { form: any }) {
  return <div className="grid grid-cols-2 gap-3">
    <FormField control={form.control} name="minPrice" render={function ({ field }: any) { return <FormItem><label className="mb-1 block text-xs font-medium text-muted-foreground">Minimum</label><FormControl><Input type="number" inputMode="numeric" placeholder="Any" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>; }} />
    <FormField control={form.control} name="maxPrice" render={function ({ field }: any) { return <FormItem><label className="mb-1 block text-xs font-medium text-muted-foreground">Maximum</label><FormControl><Input type="number" inputMode="numeric" placeholder="Any" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>; }} />
  </div>;
}

function ChoiceGrid({ value, options, labels, onChange }: { value: string; options: string[]; labels: string[]; onChange: (x: string) => void }) {
  return <div className="grid grid-cols-3 overflow-hidden">{options.map(function (x, i) {
    return <button type="button" key={x} onClick={function () { onChange(x); }} className={"min-h-11 border px-2 text-sm " + (value === x ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted")}>{labels[i]}</button>;
  })}</div>;
}

function AmenityPanel({ form }: { form: any }) {
  const selected = form.watch("amenities") || [];
  return <Panel title="Amenities" description="Choose the features you care about">
    <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto">
      {amenities.map(function (item) {
        const checked = selected.includes(item);
        return <label key={item} className={"flex cursor-pointer items-center gap-2 px-2 py-2.5 text-sm hover:bg-muted " + (checked ? "text-primary" : "")}>
          <Checkbox checked={checked} onCheckedChange={function (next) {
            form.setValue("amenities", next ? selected.concat(item) : selected.filter(function (x: string) { return x !== item; }));
          }} />
          <span>{item}</span>
        </label>;
      })}
    </div>
    {selected.length > 0 && <button type="button" onClick={function () { form.setValue("amenities", []); }} className="mt-2 flex items-center gap-1 text-sm font-medium text-primary"><X className="h-3.5 w-3.5" /> Clear amenities</button>}
  </Panel>;
}
