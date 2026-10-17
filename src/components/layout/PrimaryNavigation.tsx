"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Heart, House } from "lucide-react";

const links = [
  { label: "Find a House", href: "/find-a-house", icon: House, match: (path: string) => path === "/find-a-house" },
  { label: "Properties", href: "/properties", icon: Building2, match: (path: string) => path === "/properties" || path.startsWith("/properties/") },
  { label: "Saved", href: "/saved", icon: Heart, match: (path: string) => path === "/saved" },
];

export function PrimaryNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="flex items-center gap-1">
      {links.map(({ label, href, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex min-h-10 items-center gap-2 border-b-2 px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f28c28] focus-visible:ring-offset-2 lg:px-4 ${
              active
                ? "border-[#f28c28] text-[#244c2c]"
                : "border-transparent text-[#626b60] hover:border-[#c7d0c1] hover:text-[#244c2c]"
            }`}
          >
            <Icon aria-hidden="true" className={`h-4 w-4 ${active ? "text-[#23a455]" : ""}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
