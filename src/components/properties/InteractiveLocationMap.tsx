"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Minus, Plus } from "lucide-react";

export type MapPosition = { lat: number; lng: number };

export type PropertyMapMarker = {
  id: string;
  position: MapPosition;
  label: string;
  title: string;
};

type InteractiveLocationMapProps = {
  value: MapPosition | null;
  onChange?: (position: MapPosition) => void;
  interactive?: boolean;
  className?: string;
  heightClassName?: string;
  zoom?: number;
  markers?: PropertyMapMarker[];
  onMarkerSelect?: (id: string) => void;
  onViewportChange?: (viewport: { north: number; south: number; east: number; west: number; center: MapPosition; zoom: number }) => void;
};

const KENYA_CENTER: MapPosition = { lat: -0.0236, lng: 37.9062 };
const MIN_ZOOM = 5;
const MAX_ZOOM = 19;

function clampLatitude(lat: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function normalizeLongitude(lng: number) {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}

function project(position: MapPosition, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const sin = Math.sin((clampLatitude(position.lat) * Math.PI) / 180);
  return {
    x: ((position.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function unproject(point: { x: number; y: number }, zoom: number): MapPosition {
  const scale = 256 * Math.pow(2, zoom);
  const lng = (point.x / scale) * 360 - 180;
  const y = 0.5 - point.y / scale;
  const lat = (360 / Math.PI) * Math.atan(Math.exp(y * 2 * Math.PI)) - 90;
  return { lat: clampLatitude(lat), lng: normalizeLongitude(lng) };
}

function tileUrl(x: number, y: number, z: number) {
  const count = Math.pow(2, z);
  const wrappedX = ((x % count) + count) % count;
  if (y < 0 || y >= count) return null;
  return "https://tile.openstreetmap.org/" + z + "/" + wrappedX + "/" + y + ".png";
}

export function InteractiveLocationMap({
  value,
  onChange,
  interactive = true,
  className = "",
  heightClassName = "h-64",
  zoom: initialZoom = 15,
  markers,
  onMarkerSelect,
  onViewportChange,
}: InteractiveLocationMapProps) {
  const [center, setCenter] = useState<MapPosition>(value ?? markers?.[0]?.position ?? KENYA_CENTER);
  const [zoom, setZoom] = useState(value ? initialZoom : markers?.length ? 11 : 6);
  const [draggingMarker, setDraggingMarker] = useState(false);
  const [draggingMap, setDraggingMap] = useState(false);
  const dragRef = useRef<{ pointerX: number; pointerY: number; centerPoint: { x: number; y: number } } | null>(null);
  const markerDragRef = useRef(false);
  const movedRef = useRef(false);

  useEffect(() => {
    if (value && !markerDragRef.current) {
      setCenter(value);
      setZoom((current) => Math.max(current, initialZoom));
    }
  }, [value?.lat, value?.lng, initialZoom]);

  useEffect(() => {
    if (value || !markers?.length) return;
    const latitudes = markers.map((marker) => marker.position.lat);
    const longitudes = markers.map((marker) => marker.position.lng);
    const latSpan = Math.max(...latitudes) - Math.min(...latitudes);
    const lngSpan = Math.max(...longitudes) - Math.min(...longitudes);
    setCenter({
      lat: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      lng: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    });
    const spread = Math.max(latSpan, lngSpan);
    setZoom(spread > 4 ? 6 : spread > 1 ? 8 : spread > 0.25 ? 10 : 12);
  }, [value?.lat, value?.lng, markers]);

  const centerPoint = useMemo(() => project(center, zoom), [center, zoom]);
  const markerPosition = value ?? center;
  const markerPoint = project(markerPosition, zoom);
  const markerOffset = {
    x: markerPoint.x - centerPoint.x,
    y: markerPoint.y - centerPoint.y,
  };

  const tiles = useMemo(() => {
    const centerTileX = Math.floor(centerPoint.x / 256);
    const centerTileY = Math.floor(centerPoint.y / 256);
    const items: { key: string; x: number; y: number; url: string }[] = [];

    for (let y = centerTileY - 2; y <= centerTileY + 2; y += 1) {
      for (let x = centerTileX - 2; x <= centerTileX + 2; x += 1) {
        const url = tileUrl(x, y, zoom);
        if (url) items.push({ key: x + ":" + y, x, y, url });
      }
    }

    return items;
  }, [centerPoint.x, centerPoint.y, zoom]);

  function pointFromEvent(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function reportViewport(element: HTMLDivElement, nextZoom = zoom, nextCenter = center) {
    if (!onViewportChange) return;
    const rect = element.getBoundingClientRect();
    const world = project(nextCenter, nextZoom);
    const northWest = unproject({ x: world.x - rect.width / 2, y: world.y - rect.height / 2 }, nextZoom);
    const southEast = unproject({ x: world.x + rect.width / 2, y: world.y + rect.height / 2 }, nextZoom);
    onViewportChange({ north: northWest.lat, south: southEast.lat, west: northWest.lng, east: southEast.lng, center: nextCenter, zoom: nextZoom });
  }

  function finishPointer(event?: React.PointerEvent<HTMLDivElement>) {
    if (event && dragRef.current && movedRef.current) reportViewport(event.currentTarget);
    markerDragRef.current = false;
    dragRef.current = null;
    setDraggingMarker(false);
    setDraggingMap(false);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    if ((event.target as HTMLElement).closest("button, a")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    movedRef.current = false;

    const rect = event.currentTarget.getBoundingClientRect();
    const point = pointFromEvent(event);
    const markerScreenX = rect.width / 2 + markerOffset.x;
    const markerScreenY = rect.height / 2 + markerOffset.y;

    if (!markers?.length && onChange && Math.hypot(point.x - markerScreenX, point.y - markerScreenY) < 30) {
      markerDragRef.current = true;
      setDraggingMarker(true);
      return;
    }

    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      centerPoint,
    };
    setDraggingMap(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!interactive) return;

    const rect = event.currentTarget.getBoundingClientRect();

    if (markerDragRef.current && onChange) {
      movedRef.current = true;
      const point = pointFromEvent(event);
      const worldPoint = {
        x: centerPoint.x + point.x - rect.width / 2,
        y: centerPoint.y + point.y - rect.height / 2,
      };
      onChange(unproject(worldPoint, zoom));
      return;
    }

    if (dragRef.current) {
      const dx = event.clientX - dragRef.current.pointerX;
      const dy = event.clientY - dragRef.current.pointerY;
      if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true;
      setCenter(unproject({
        x: dragRef.current.centerPoint.x - dx,
        y: dragRef.current.centerPoint.y - dy,
      }, zoom));
    }
  }

  function handleMapClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!interactive || !onChange || movedRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    onChange(unproject({
      x: centerPoint.x + point.x - rect.width / 2,
      y: centerPoint.y + point.y - rect.height / 2,
    }, zoom));
  }

  function changeZoom(delta: number) {
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    if (nextZoom === zoom) return;
    setZoom(nextZoom);
    reportViewport(document.getElementById("nyumba-map-viewport") as HTMLDivElement, nextZoom);
  }

  return (
    <div className={"relative overflow-hidden rounded-xl border bg-muted " + heightClassName + " " + className}>
      <div
        id="nyumba-map-viewport"
        className={"absolute inset-0 touch-none select-none " + (interactive ? (draggingMarker || draggingMap ? "cursor-grabbing" : "cursor-grab") : "")}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={() => finishPointer() }
        onClick={handleMapClick}
        role={interactive ? "application" : undefined}
        aria-label={interactive ? "Interactive property location map" : "Property location map"}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute h-64 w-64 max-w-none"
            style={{
              left: "calc(50% + " + (tile.x * 256 - centerPoint.x) + "px)",
              top: "calc(50% + " + (tile.y * 256 - centerPoint.y) + "px)",
            }}
          />
        ))}

        {!markers?.length && (
          <div className="pointer-events-none absolute left-1/2 top-1/2" style={{ transform: "translate(calc(-50% + " + markerOffset.x + "px), calc(-100% + " + markerOffset.y + "px))" }}>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/15"><MapPin className="h-8 w-8 fill-primary text-primary drop-shadow-md" /></div>
          </div>
        )}

        {markers?.map((marker) => {
          const point = project(marker.position, zoom);
          const offsetX = point.x - centerPoint.x;
          const offsetY = point.y - centerPoint.y;
          return <button key={marker.id} type="button" title={marker.title} aria-label={marker.title + ", " + marker.label}
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border border-white/90 bg-[#244c2c] px-2.5 py-1 text-[11px] font-semibold leading-none tracking-tight text-white shadow-[0_2px_6px_rgba(20,45,28,0.22)] ring-1 ring-[#244c2c]/10 transition-transform hover:z-20 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f28c28]"
            style={{ transform: "translate(calc(-50% + " + offsetX + "px), calc(-100% + " + offsetY + "px))" }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); onMarkerSelect?.(marker.id); }}>
            {marker.label}
          </button>;
        })}

        {interactive && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-background/95 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur">
            {value ? "Drag the pin to adjust the location" : "Drag the pin or tap the map to place it"}
          </div>
        )}

        <div className="absolute bottom-2 right-2 flex overflow-hidden rounded-lg border bg-background/95 shadow-sm backdrop-blur">
          <button type="button" aria-label="Zoom in" className="flex h-9 w-9 items-center justify-center hover:bg-muted" onClick={(event) => { event.stopPropagation(); changeZoom(1); }}>
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Zoom out" className="flex h-9 w-9 items-center justify-center border-l hover:bg-muted" onClick={(event) => { event.stopPropagation(); changeZoom(-1); }}>
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[9px] text-muted-foreground">
          © OpenStreetMap contributors
        </div>
      </div>
    </div>
  );
}
