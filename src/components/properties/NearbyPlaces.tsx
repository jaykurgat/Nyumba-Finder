"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Bus, GraduationCap, Hospital, MapPin, Trees, ShoppingBasket, LoaderCircle, ExternalLink, Home } from "lucide-react";
import { InteractiveLocationMap } from "@/components/properties/InteractiveLocationMap";

type Place = { id: string; name: string; category: string; distanceKm: number; lat: number; lng: number; source: string };
const filters = [
  { label: "All", icon: MapPin },
  { label: "Schools", icon: GraduationCap },
  { label: "Shopping", icon: ShoppingBasket },
  { label: "Healthcare", icon: Hospital },
  { label: "Fitness", icon: Activity },
  { label: "Parks", icon: Trees },
  { label: "Transport", icon: Bus },
];

function distanceLabel(km: number) {
  return km < 1 ? Math.round(km * 1000) + " m away" : km.toFixed(1) + " km away";
}

export function NearbyPlaces({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState("All");
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setUnavailable(false);
    fetch("/api/nearby-places?lat=" + encodeURIComponent(latitude) + "&lng=" + encodeURIComponent(longitude) + "&radius=5000", { cache: "force-cache", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Nearby places unavailable");
        const data = await response.json();
        if (!controller.signal.aborted) setPlaces(Array.isArray(data.places) ? data.places : []);
      })
      .catch(() => { if (!controller.signal.aborted) setUnavailable(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [latitude, longitude]);

  const visible = useMemo(() => places.filter((place) => selected === "All" || place.category === selected), [places, selected]);
  const counts = useMemo(() => places.reduce<Record<string, number>>((all, place) => { all[place.category] = (all[place.category] || 0) + 1; return all; }, {}), [places]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e1e6dc] bg-white shadow-[0_4px_22px_rgba(31,46,31,0.04)]">
      <div className="border-b border-[#edf0e9] px-4 py-4 sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#74856b]">The neighbourhood</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-lg font-semibold tracking-tight text-[#20271f]">What's nearby</h2></div>
          {!loading && !unavailable && <span className="rounded-full bg-[#edf2e9] px-2.5 py-1 text-xs font-semibold text-[#244c2c]">{places.length} places</span>}
        </div>
      </div>

      <div className="border-b border-[#edf0e9] px-3 py-3 sm:px-4">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {filters.map(({ label, icon: Icon }) => <button key={label} type="button" onClick={() => { setSelected(label); setShowAll(false); }} className={"inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors " + (selected === label ? "border-[#244c2c] bg-[#244c2c] text-white" : "border-[#e1e6dc] bg-white text-[#5d6957] hover:border-[#aab9a1]")}>
            <Icon className="h-3.5 w-3.5" />{label}{label !== "All" && counts[label] ? <span className={selected === label ? "text-white/80" : "text-[#889282]"}>{counts[label]}</span> : null}
          </button>)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="min-h-[320px] border-b border-[#edf0e9] lg:border-b-0 lg:border-r">
          <InteractiveLocationMap
            value={{ lat: latitude, lng: longitude }}
            interactive
            zoom={14}
            heightClassName="h-[320px] sm:h-[420px] lg:h-[520px]"
            className="h-full rounded-none border-0"
            markers={[
              { id: "property-home", kind: "property" as const, position: { lat: latitude, lng: longitude }, label: "Home", title: "Property location" },
              ...visible.slice(0, 80).map((place) => ({
                id: place.id,
                kind: "amenity" as const,
                position: { lat: place.lat, lng: place.lng },
                label: place.name,
                title: place.name + " · " + place.category + " · " + distanceLabel(place.distanceKm),
              })),
            ]}
            selectedMarkerId={selectedPlaceId}
            onMarkerSelect={(id) => { if (id !== "property-home") setSelectedPlaceId(id); }}
          />
          <div className="flex items-center gap-2 border-t border-[#edf0e9] bg-[#f8f9f5] px-4 py-3 text-[11px] text-[#788272]">
            <Home className="h-3.5 w-3.5 text-[#244c2c]" />
            <span>Property location is approximate. Nearby places are based on available OpenStreetMap data.</span>
          </div>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          {loading ? <div className="flex items-center gap-2 px-5 py-8 text-sm text-[#788272]"><LoaderCircle className="h-4 w-4 animate-spin" />Finding nearby places…</div> :
           unavailable ? null :
           visible.length === 0 ? <div className="px-5 py-8 text-sm leading-6 text-[#687066]">{places.length ? "No mapped places found in this category." : "No named places were returned by the map data source."}</div> :
           visible.slice(0, showAll ? visible.length : 18).map((place) => <button type="button" key={place.id} onClick={() => setSelectedPlaceId(place.id)} className={"flex w-full min-w-0 items-start gap-3 border-b border-[#edf0e9] px-4 py-3.5 text-left transition-colors sm:px-5 " + (selectedPlaceId === place.id ? "bg-[#f1f4ed]" : "bg-white hover:bg-[#fafbf8]")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f4ed] text-[#526b4c]"><MapPin className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#273126]">{place.name}</p>
              <p className="mt-0.5 text-xs text-[#788272]">{place.category} · {distanceLabel(place.distanceKm)}</p>
            </div>
            <a href={"https://www.openstreetmap.org/?mlat=" + place.lat + "&mlon=" + place.lng + "#map=17/" + place.lat + "/" + place.lng} target="_blank" rel="noreferrer" aria-label={"View " + place.name + " on OpenStreetMap"} onClick={(event) => event.stopPropagation()} className="mt-1 shrink-0 text-[#77836f] hover:text-[#244c2c]"><ExternalLink className="h-4 w-4" /></a>
          </button>)}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f8f9f5] px-4 py-3 text-[10px] leading-4 text-[#788272] sm:px-5">
        <span>Nearby-place data © OpenStreetMap contributors. Coverage varies by area.</span>
        {!loading && visible.length > 18 && <button type="button" onClick={() => setShowAll((current) => !current)} className="font-semibold text-[#244c2c] hover:underline">{showAll ? "Show fewer" : "Show all " + visible.length + " places"}</button>}
      </div>
    </section>
  );
}
