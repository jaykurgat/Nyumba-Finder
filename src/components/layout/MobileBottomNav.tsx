"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Building2, Heart, Home, House, UserRound } from "lucide-react";

const items = [
  { label: "Home", href: "/", icon: Home, key: "home" },
  { label: "Properties", href: "/properties", icon: Building2, key: "explore" },
  { label: "House Hunt", href: "/find-a-house", icon: House, key: "hunt" },
  { label: "Saved", href: "/saved", icon: Heart, key: "saved" },
  { label: "Account", href: "/account", icon: UserRound, key: "account" },
];

function MobileBottomNavContent() {
  const pathname = usePathname();

  function isActive(key: string) {
    if (key === "home") return pathname === "/";
    if (key === "explore") return pathname === "/properties" || pathname.startsWith("/properties/");
    if (key === "hunt") return pathname === "/find-a-house";
    if (key === "saved") return pathname === "/saved";
    if (key === "account") return pathname === "/account" || pathname.startsWith("/account/");
    return false;
  }

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d8ded3] bg-[#fbfaf6] pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex min-h-[62px] w-full max-w-xl items-stretch justify-around px-1 pt-1">
        {items.map(({ label, href, icon: Icon, key }) => {
          const active = isActive(key);
          return (
            <Link
              key={key}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-t-2 px-0.5 py-1.5 text-[10px] font-medium transition-colors sm:text-[11px] ${
                active ? "border-[#f28c28] text-[#244c2c]" : "border-transparent text-[#747c70] hover:text-[#244c2c]"
              }`}
            >
              <Icon aria-hidden="true" className={`h-[18px] w-[18px] ${active ? "stroke-[2.2]" : "stroke-[1.7]"}`} />
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
