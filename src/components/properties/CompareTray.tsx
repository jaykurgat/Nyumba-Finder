"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "nyumba-compare-ids";

export function CompareTray() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
        setIds(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, 4) : []);
      } catch { setIds([]); }
    };
    sync();
    window.addEventListener("nyumba:compare-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("nyumba:compare-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!ids.length) return null;

  function remove(id: string) {
    const next = ids.filter((item) => item !== id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setIds(next);
    window.dispatchEvent(new Event("nyumba:compare-change"));
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-2xl border border-[#dce3d6] bg-white/95 p-3 shadow-[0_18px_60px_rgba(26,42,25,0.20)] backdrop-blur-xl sm:inset-x-6 sm:bottom-5 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf2e9] text-[#244c2c]"><GitCompare className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#20271f]">Compare properties <span className="ml-1 rounded-full bg-[#edf2e9] px-2 py-0.5 text-xs">{ids.length}/4</span></p>
          <p className="text-xs text-[#687066]">{ids.length < 2 ? "Select at least one more home to compare features side by side." : "Review price, space, amenities and location side by side."}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ids.map((id) => <button key={id} type="button" onClick={() => remove(id)} className="inline-flex max-w-36 items-center gap-1 rounded-full border border-[#e2e6dd] px-2 py-1 text-[10px] text-[#687066] hover:border-[#b5c4ad]" title="Remove from comparison"><span className="truncate">{id.slice(0, 8)}…</span><X className="h-3 w-3 shrink-0" /></button>)}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button asChild disabled={ids.length < 2} className="rounded-xl bg-[#244c2c] px-3 text-white hover:bg-[#193b21]">
            <Link href="/compare">Compare now</Link>
          </Button>
          <button type="button" onClick={() => { window.localStorage.removeItem(STORAGE_KEY); setIds([]); window.dispatchEvent(new Event("nyumba:compare-change")); }} className="text-xs text-[#687066] hover:text-[#244c2c]">Clear selection</button>
        </div>
      </div>
    </div>
  );
}
