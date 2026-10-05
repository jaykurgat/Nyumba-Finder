"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      listingType: params.get("listingType") || "FOR_RENT",
      listingType: params.get("listingType") || "FOR_RENT",
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

  const listingType = v.listingType || "FOR_RENT";
  const pricePeriodLabel = listingType === "FOR_SALE" ? "Sale price" : listingType === "SHORT_STAY" ? "Nightly price" : "Monthly rent";
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
    if (data.listingType && data.listingType !== "FOR_RENT") next.set("listingType", data.listingType);
    if (data.location?.trim()) next.set("location", data.location.trim());
    if (data.minPrice) next.set("minPrice", String(data.minPrice));
    if (data.maxPrice) next.set("maxPrice", String(data.maxPrice));
    if (data.minBedrooms && data.minBedrooms !== "all") next.set("minBedrooms", data.minBedrooms);
    if (data.minBathrooms && data.minBathrooms !== "all") next.set("minBathrooms", data.minBathrooms);
    (data.amenities || []).forEach(function (item) { next.append("amenities", item); });
    router.push(next.toString() ? "/properties?" + next.toString() : "/properties");
    setOpen(null);
    onFormSubmit?.();
  }

  function clear() {
    form.reset({ listingType: "FOR_RENT", location: "", minPrice: "", maxPrice: "", minBedrooms: "all", minBathrooms: "all", amenities: [] });
    router.push("/properties");
    setOpen(null);
    onFormSubmit?.();
  }

  if (isInSheet) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
          <ListingTypeField form={form} />
          <LocationField form={form} />
          <Panel title="Price range" description={pricePeriodLabel}>
            <PriceFields form={form} />
          </Panel>
          <Panel title="Bedrooms" description="Minimum bedrooms">
            <ChoiceGrid value={v.minBedrooms || "all"} options={["all","0","1","2","3","4"]} labels={["Any","Studio","1+","2+","3+","4+"]} onChange={function (x) { form.setValue("minBedrooms", x); }} />
          </Panel>
          <Panel title="Bathrooms" description="Minimum bathrooms">
            <ChoiceGrid value={v.minBathrooms || "all"} options={["all","1","2","3","4","5"]} labels={["Any","1+","2+","3+","4+","5+"]} onChange={function (x) { form.setValue("minBathrooms", x); }} />
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
          <LocationField form={form} compact />
          <div className="hidden h-8 w-px bg-border lg:block" />
          <FilterMenu name="price" label={priceLabel} active={priceActive} open={open === "price"} setOpen={setOpen} icon={null}>
            <PriceFields form={form} />
          </FilterMenu>
          <FilterMenu name="beds" label={bedsLabel} active={bedsActive} open={open === "beds"} setOpen={setOpen} icon={<BedDouble className="h-4 w-4" />}>
            <ChoiceGrid value={v.minBedrooms || "all"} options={["all","0","1","2","3","4"]} labels={["Any","Studio","1+","2+","3+","4+"]} onChange={function (x) { form.setValue("minBedrooms", x); }} />
          </FilterMenu>
          <FilterMenu name="baths" label={bathsLabel} active={bathsActive} open={open === "baths"} setOpen={setOpen} icon={<Bath className="h-4 w-4" />}>
            <ChoiceGrid value={v.minBathrooms || "all"} options={["all","1","2","3","4","5"]} labels={["Any","1+","2+","3+","4+","5+"]} onChange={function (x) { form.setValue("minBathrooms", x); }} />
          </FilterMenu>
          <FilterMenu name="more" label={amenityCount ? "More filters (" + amenityCount + ")" : "More filters"} active={amenityCount > 0} open={open === "more"} setOpen={setOpen} icon={<SlidersHorizontal className="h-4 w-4" />}>
            <AmenityPanel form={form} />
          </FilterMenu>
          <Button type="submit" className="h-11 gap-2 px-5 lg:ml-1"><Search className="h-4 w-4" /><span>Search</span></Button>
        </div>
      </form>
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
            <select {...field} className={compact ? "h-10 w-full border-0 bg-transparent px-0 text-sm font-medium outline-none" : "h-11 w-full rounded-xl border bg-background px-3 text-sm"}>
              <option value="FOR_RENT">For Rent</option>
              <option value="FOR_SALE">For Sale</option>
              <option value="SHORT_STAY">Short Stay</option>
            </select>
          </FormControl>
          {!compact && <FormMessage />}
        </FormItem>;
      }} />
    </div>
  );
}

function LocationField({ form, compact = false }: { form: any; compact?: boolean }) {
  return (
    <div className={compact ? "flex min-h-12 flex-1 items-center gap-3 px-3" : "space-y-2"}>
      {!compact && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</p>}
      <FormField control={form.control} name="location" render={function ({ field }: any) {
        return (
          <FormItem className="min-w-0 flex-1 space-y-0">
            <FormControl>
              <div className={compact ? "flex items-center gap-3" : "flex items-center gap-3 border bg-background px-3"}>
                {compact && <MapPin className="h-5 w-5 shrink-0 text-primary" />}
                {!compact && <MapPin className="h-4 w-4 text-primary" />}
                <Input {...field} value={field.value || ""} list="nyumba-locations" placeholder={compact ? "Search city, neighbourhood or estate" : "City, neighbourhood or estate"} className={compact ? "h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" : "h-12 border-0 px-0 shadow-none focus-visible:ring-0"} />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }} />
      <datalist id="nyumba-locations">{locations.map(function (x) { return <option key={x} value={x} />; })}</datalist>
    </div>
  );
}

function FilterMenu({ name, label, active, open, setOpen, icon, children }: { name: string; label: string; active: boolean; open: boolean; setOpen: (x: string | null) => void; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="relative">
      <Button type="button" variant="ghost" onClick={function () { setOpen(open ? null : name); }} className={"h-11 w-full justify-between gap-2 border px-3 lg:w-auto lg:justify-center " + (active || open ? "border-primary/30 bg-primary/5 text-primary" : "border-transparent")}>
        {icon}{label}<ChevronDown className={"h-4 w-4 " + (open ? "rotate-180" : "")} />
      </Button>
      {open && (
        <div className="absolute left-0 top-12 z-50 w-[330px] rounded-xl border bg-background p-5 shadow-xl">
          {children}
        </div>
      )}
    </div>
  );
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
