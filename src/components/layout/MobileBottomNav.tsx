"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Heart, Home, Search, Sparkles, MapPin } from "lucide-react";

const items = [
  { label: "Home", href: "/", icon: Home, key: "home" },
  { label: "Properties", href: "/properties", icon: Search, key: "explore" },
  { label: "Locations", href: "/locations", icon: MapPin, key: "locations" },
  { label: "House Hunt", href: "/find-a-house", icon: Sparkles, key: "hunt" },
  { label: "Saved", href: "/saved", icon: Heart, key: "saved" },
];

function MobileBottomNavContent() {
  const pathname = usePathname();
  const savedView = pathname === "/saved";

  function isActive(key: string) {
    if (key === "home") return pathname === "/";
    if (key === "explore") return pathname === "/properties";
    if (key === "locations") return pathname === "/locations" || pathname.startsWith("/locations/");
    if (key === "hunt") return pathname === "/find-a-house";
    if (key === "saved") return savedView;
    return false;
  }

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-20px_rgba(24,35,24,0.45)] backdrop-blur supports-[backdrop-filter]:bg-background/90 md:hidden">
      <div className="mx-auto flex min-h-16 w-full max-w-xl items-stretch justify-around px-2 pt-1">
        {items.map(({ label, href, icon: Icon, key }) => {
          const active = isActive(key);
          return (
            <Link
              key={key}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors sm:text-xs ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`flex h-7 w-10 items-center justify-center rounded-full transition-colors ${
                active ? "bg-primary/10" : ""
              }`}>
                <Icon aria-hidden="true" className={`h-5 w-5 ${active ? "stroke-[2.2]" : "stroke-[1.8]"}`} />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileBottomNav() {
  return (
    <Suspense fallback={null}>
      <MobileBottomNavContent />
    </Suspense>
  );
}
