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
    <nav aria-label="Primary navigation" className="hidden items-center gap-1.5 rounded-full border border-[#23A455]/15 bg-[#F6FAF7] p-1.5 md:flex">
      {links.map(({ label, href, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:px-4 ${
              active
                ? "bg-[#23A455] text-white shadow-md shadow-[#23A455]/20"
                : "text-slate-600 hover:bg-white hover:text-[#176D38]"
            }`}
          >
            <Icon aria-hidden="true" className={`h-4 w-4 ${active ? "text-white" : "text-[#23A455]"}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
