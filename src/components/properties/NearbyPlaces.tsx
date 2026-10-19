"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Bus, GraduationCap, Hospital, MapPin, Trees, ShoppingBasket, LoaderCircle, ExternalLink } from "lucide-react";

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

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setUnavailable(false);
    fetch("/api/nearby-places?lat=" + encodeURIComponent(latitude) + "&lng=" + encodeURIComponent(longitude) + "&radius=2000", { cache: "force-cache", signal: controller.signal })
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
          <div><h2 className="text-lg font-semibold tracking-tight text-[#20271f]">What's nearby</h2><p className="mt-1 text-xs text-[#788272]">Places mapped within 2 km of this property</p></div>
          {!loading && !unavailable && <span className="rounded-full bg-[#edf2e9] px-2.5 py-1 text-xs font-semibold text-[#244c2c]">{places.length} places</span>}
        </div>
      </div>

      <div className="border-b border-[#edf0e9] px-3 py-3 sm:px-4">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {filters.map(({ label, icon: Icon }) => <button key={label} type="button" onClick={() => setSelected(label)} className={"inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors " + (selected === label ? "border-[#244c2c] bg-[#244c2c] text-white" : "border-[#e1e6dc] bg-white text-[#5d6957] hover:border-[#aab9a1]")}>
            <Icon className="h-3.5 w-3.5" />{label}{label !== "All" && counts[label] ? <span className={selected === label ? "text-white/80" : "text-[#889282]"}>{counts[label]}</span> : null}
          </button>)}
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-[#788272]"><LoaderCircle className="h-4 w-4 animate-spin" />Finding nearby places…</div> :
      unavailable ? <div className="px-5 py-8 text-sm leading-6 text-[#687066]">Nearby place information is temporarily unavailable. The property's map location is still available above.</div> :
      visible.length === 0 ? <div className="px-5 py-8 text-sm leading-6 text-[#687066]">{places.length ? "No mapped places in this category were found within 2 km." : "No named nearby places were found in the available map data. This does not necessarily mean there are no amenities nearby."}</div> :
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {visible.slice(0, 18).map((place, index) => <div key={place.id} className={"flex min-w-0 items-start gap-3 px-4 py-3.5 sm:px-5 " + (index % 2 === 0 ? "sm:border-r sm:border-[#edf0e9]" : "") + " border-b border-[#edf0e9]"}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f4ed] text-[#526b4c]"><MapPin className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#273126]">{place.name}</p>
            <p className="mt-0.5 text-xs text-[#788272]">{place.category} · {distanceLabel(place.distanceKm)}</p>
          </div>
          <a href={"https://www.openstreetmap.org/?mlat=" + place.lat + "&mlon=" + place.lng + "#map=17/" + place.lat + "/" + place.lng} target="_blank" rel="noreferrer" aria-label={"View " + place.name + " on OpenStreetMap"} className="mt-1 shrink-0 text-[#77836f] hover:text-[#244c2c]"><ExternalLink className="h-4 w-4" /></a>
        </div>)}
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f8f9f5] px-4 py-3 text-[10px] leading-4 text-[#788272] sm:px-5">
        <span>Nearby-place data © OpenStreetMap contributors. Coverage varies by area.</span>
        {!loading && visible.length > 18 && <span>Showing 18 of {visible.length} places in this category</span>}
      </div>
    </section>
  );
}
