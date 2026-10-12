"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Search, Sparkles } from "lucide-react";

const links = [
  { label: "Find a House", href: "/find-a-house", icon: Sparkles, match: (path: string) => path === "/find-a-house" },
  { label: "Properties", href: "/properties", icon: Search, match: (path: string) => path === "/properties" || path.startsWith("/properties/") },
  { label: "Saved", href: "/properties?view=saved", icon: Heart, match: () => false },
];

export function PrimaryNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="hidden items-center gap-1 rounded-full border border-border/70 bg-muted/35 p-1 md:flex">
      {links.map(({ label, href, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:px-4 ${
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:bg-background/75 hover:text-foreground"
            }`}
          >
            <Icon aria-hidden="true" className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
