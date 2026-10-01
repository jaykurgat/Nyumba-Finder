"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type LocationResult = {
  id: string;
  name: string;
  type: string;
  parent: string | null;
  county: string | null;
};

export function LocationPicker({
  value,
  locationId,
  onChange,
  onLocationIdChange,
}: {
  value: string;
  locationId?: string;
  onChange: (value: string) => void;
  onLocationIdChange: (id: string | undefined) => void;
}) {
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2 || locationId) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/locations/search?q=" + encodeURIComponent(q));
        const data = await response.json();
        setResults(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [value, locationId]);

  function selectLocation(location: LocationResult) {
    onChange(location.name);
    onLocationIdChange(location.id);
    setResults([]);
    setShowSubmit(false);
  }

  async function submitMissingLocation() {
    if (value.trim().length < 2) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/locations/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedName: value.trim(), context }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to submit location.");
      setMessage("Thanks. We have sent this location for review.");
      setShowSubmit(false);
      setContext("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit location.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative space-y-2">
      <div className="flex items-center gap-2 border bg-background px-3">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <Input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            onLocationIdChange(undefined);
            setMessage("");
          }}
          placeholder="Search city, neighbourhood or estate"
          className="h-11 border-0 px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-12 z-50 border bg-background shadow-lg">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => selectLocation(result)}
              className="flex w-full items-start gap-3 border-b px-3 py-3 text-left hover:bg-muted"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block font-medium">{result.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {[result.parent, result.county].filter(Boolean).join(" · ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {value.trim().length >= 2 && !locationId && !loading && (
        <Button
          type="button"
          variant="ghost"
          className="h-auto px-0 text-xs font-medium text-primary"
          onClick={() => setShowSubmit((open) => !open)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Can't find this location? Add it for review
        </Button>
      )}

      {showSubmit && (
        <div className="border bg-muted/20 p-3">
          <p className="text-sm font-medium">Suggest “{value.trim()}”</p>
          <p className="mt-1 text-xs text-muted-foreground">
            We will review it and map it to the correct geographic location before adding it to NyumbaFinder.
          </p>
          <Input
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="Optional: nearby estate, town, landmark or other context"
            className="mt-3"
          />
          <Button type="button" className="mt-3" onClick={submitMissingLocation} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit location"}
          </Button>
        </div>
      )}

      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
