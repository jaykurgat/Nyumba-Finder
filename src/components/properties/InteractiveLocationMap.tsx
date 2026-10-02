"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Minus, Plus } from "lucide-react";

export type MapPosition = { lat: number; lng: number };

type InteractiveLocationMapProps = {
  value: MapPosition | null;
  onChange?: (position: MapPosition) => void;
  interactive?: boolean;
  className?: string;
  heightClassName?: string;
  zoom?: number;
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
}: InteractiveLocationMapProps) {
  const [center, setCenter] = useState<MapPosition>(value ?? KENYA_CENTER);
  const [zoom, setZoom] = useState(value ? initialZoom : 6);
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

  function finishPointer() {
    markerDragRef.current = false;
    dragRef.current = null;
    setDraggingMarker(false);
    setDraggingMap(false);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    movedRef.current = false;

    const rect = event.currentTarget.getBoundingClientRect();
    const point = pointFromEvent(event);
    const markerScreenX = rect.width / 2 + markerOffset.x;
    const markerScreenY = rect.height / 2 + markerOffset.y;

    if (Math.hypot(point.x - markerScreenX, point.y - markerScreenY) < 30) {
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
  }

  return (
    <div className={"relative overflow-hidden rounded-xl border bg-muted " + heightClassName + " " + className}>
      <div
        className={"absolute inset-0 select-none " + (interactive ? (draggingMarker || draggingMap ? "cursor-grabbing" : "cursor-grab") : "")}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
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

        <div
          className="pointer-events-none absolute left-1/2 top-1/2"
          style={{ transform: "translate(calc(-50% + " + markerOffset.x + "px), calc(-100% + " + markerOffset.y + "px))" }}
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <MapPin className="h-8 w-8 fill-primary text-primary drop-shadow-md" />
          </div>
        </div>

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
