"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Building2,
  LayoutGrid,
  Radar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/ops",
    label: "HQ Overview",
    description: "Queues, launches, payments, and active pressure.",
    icon: LayoutGrid,
    match: (pathname: string) => pathname === "/ops",
  },
  {
    href: "/ops/platform",
    label: "Launch Studio",
    description: "Billing overrides, no-code agent launches, provisioning.",
    icon: Building2,
    match: (pathname: string) => pathname.startsWith("/ops/platform"),
  },
  {
    href: "/ops/telegram-inventory",
    label: "Bot Inventory",
    description: "Warm stock, packs, and transfer tracking.",
    icon: Boxes,
    match: (pathname: string) => pathname.startsWith("/ops/telegram-inventory"),
  },
  {
    href: "/ops/control-room",
    label: "Control Room",
    description: "Deep operational controls for runtime and support.",
    icon: Radar,
    match: (pathname: string) => pathname.startsWith("/ops/control-room"),
  },
] as const;

export function OpsSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {NAV_ITEMS.map((item) => {
        const isActive = item.match(pathname);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group block rounded-[1.5rem] border px-4 py-4 transition",
              isActive
                ? "border-amber-300/30 bg-amber-300/12 shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
                : "border-white/10 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "rounded-2xl border p-2.5 transition",
                  isActive
                    ? "border-amber-300/30 bg-amber-300/12 text-amber-100"
                    : "border-white/10 bg-white/[0.04] text-slate-300 group-hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div
                  className={cn(
                    "text-sm font-medium",
                    isActive ? "text-white" : "text-slate-200",
                  )}
                >
                  {item.label}
                </div>
                <div
                  className={cn(
                    "mt-1 text-xs leading-5",
                    isActive ? "text-amber-50/80" : "text-slate-400",
                  )}
                >
                  {item.description}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
