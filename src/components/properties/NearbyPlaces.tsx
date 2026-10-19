"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Bus, GraduationCap, Hospital, MapPin, Trees, ShoppingBasket, LoaderCircle, Coffee, BriefcaseBusiness, X, ExternalLink } from "lucide-react";
import { InteractiveLocationMap } from "@/components/properties/InteractiveLocationMap";

type Place = { id: string; name: string; category: string; distanceKm: number; lat: number; lng: number; source: string };
const filters = [
  { label: "All", icon: MapPin },
  { label: "Shopping", icon: ShoppingBasket },
  { label: "Schools", icon: GraduationCap },
  { label: "Healthcare", icon: Hospital },
  { label: "Fitness", icon: Activity },
  { label: "Parks", icon: Trees },
  { label: "Transport", icon: Bus },
  { label: "Food & drink", icon: Coffee },
  { label: "Services", icon: BriefcaseBusiness },
];

function distanceLabel(km: number) {
  return km < 1 ? Math.round(km * 1000) + " m away" : km.toFixed(1) + " km away";
}

export function NearbyPlaces({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState("All");
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setUnavailable(false);
    fetch("/api/nearby-places?lat=" + encodeURIComponent(latitude) + "&lng=" + encodeURIComponent(longitude) + "&radius=5000", { cache: "no-store", signal: controller.signal })
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
  const selectedPlace = visible.find((place) => place.id === selectedPlaceId) ?? null;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e1e6dc] bg-white shadow-[0_4px_22px_rgba(31,46,31,0.05)]">
      <div className="border-b border-[#edf0e9] px-4 py-4 sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#74856b]">The neighbourhood</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[#20271f]">Explore what's nearby</h2>
            <p className="mt-1 text-sm text-[#788272]">Discover useful places around this property</p>
          </div>
          {!loading && !unavailable && <span className="rounded-full bg-[#edf2e9] px-3 py-1.5 text-xs font-semibold text-[#244c2c]">{visible.length} {selected === "All" ? "places" : selected.toLowerCase()}</span>}
        </div>
      </div>

      <div className="border-b border-[#edf0e9] px-3 py-3 sm:px-4">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {filters.map(({ label, icon: Icon }) => (
            <button key={label} type="button" onClick={() => { setSelected(label); setSelectedPlaceId(null); }}
              className={"inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-sm font-medium transition-colors " + (selected === label ? "border-[#244c2c] bg-[#244c2c] text-white shadow-sm" : "border-[#e1e6dc] bg-white text-[#5d6957] hover:border-[#aab9a1] hover:bg-[#f8faf6]")}>
              <Icon className="h-4 w-4" />{label}
              {label !== "All" && <span className={selected === label ? "text-white/80" : "text-[#889282]"}>{counts[label] ?? 0}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <InteractiveLocationMap
          value={{ lat: latitude, lng: longitude }}
          interactive
          zoom={15}
          heightClassName="h-[420px] sm:h-[540px] lg:h-[600px]"
          className="h-full rounded-none border-0"
          markers={[
            { id: "property-home", kind: "property" as const, position: { lat: latitude, lng: longitude }, label: "Property", title: "Property location" },
            ...visible.map((place) => ({
              id: place.id,
              kind: "amenity" as const,
              position: { lat: place.lat, lng: place.lng },
              label: place.name,
              title: place.name + " · " + place.category + " · " + distanceLabel(place.distanceKm),
            })),
          ]}
          selectedMarkerId={selectedPlaceId}
          onMarkerSelect={(id) => setSelectedPlaceId(id === "property-home" ? null : id)}
          showPinInstructions={false}
        />

        {loading && <div className="absolute left-4 top-4 flex items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-3.5 py-2.5 text-sm text-[#52614d] shadow-md backdrop-blur"><LoaderCircle className="h-4 w-4 animate-spin" />Finding nearby places…</div>}
        {!loading && unavailable && <div className="absolute left-4 top-4 rounded-xl border border-white/80 bg-white/95 px-3.5 py-2.5 text-sm text-[#52614d] shadow-md">Nearby places are unavailable right now.</div>}
        {!loading && !unavailable && visible.length === 0 && <div className="absolute left-4 top-4 rounded-xl border border-white/80 bg-white/95 px-3.5 py-2.5 text-sm text-[#52614d] shadow-md">No places found in this category nearby.</div>}

        {selectedPlace && (
          <div className="absolute bottom-4 left-4 right-4 z-20 sm:bottom-5 sm:left-5 sm:right-auto sm:w-[340px]">
            <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_8px_32px_rgba(23,39,22,0.18)] backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf2e9] text-[#244c2c]"><MapPin className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#74856b]">{selectedPlace.category}</p>
                  <h3 className="mt-1 text-sm font-semibold leading-snug text-[#20271f]">{selectedPlace.name}</h3>
                  <p className="mt-1 text-xs text-[#788272]">{distanceLabel(selectedPlace.distanceKm)} from this property</p>
                </div>
                <button type="button" onClick={() => setSelectedPlaceId(null)} aria-label="Close place details" className="rounded-lg p-1.5 text-[#788272] hover:bg-[#f1f4ed]"><X className="h-4 w-4" /></button>
              </div>
              <a href={"https://www.openstreetmap.org/?mlat=" + selectedPlace.lat + "&mlon=" + selectedPlace.lng + "#map=17/" + selectedPlace.lat + "/" + selectedPlace.lng} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#244c2c] hover:underline">View place details <ExternalLink className="h-3.5 w-3.5" /></a>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0e9] bg-[#fafbf8] px-4 py-3 text-xs text-[#788272] sm:px-5">
        <span>{selected === "All" ? "Showing places within 5 km" : "Showing " + selected.toLowerCase() + " within 5 km"}</span>
        <span>Select a map marker to see its name and distance</span>
      </div>
    </section>
  );
}
