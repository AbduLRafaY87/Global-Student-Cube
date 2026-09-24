"use client";

import { NAV_ICONS, navIconSizeClass } from "@/components/layout/nav-icons";
import type { BottomNavEntry } from "@/domain/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavProps {
  items: BottomNavEntry[];
  onOpenMore: () => void;
}

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({ items, onOpenMore }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="flex h-16 shrink-0 items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] min-[900px]:hidden"
      aria-label="Primary"
    >
      {items.map((item) => {
        if (item.kind === "more") {
          const Icon = NAV_ICONS[item.icon];
          return (
            <button
              key="more"
              type="button"
              className="flex min-h-12 flex-1 flex-col items-center justify-center gap-1 text-xs text-text-muted"
              onClick={onOpenMore}
            >
              <Icon className={navIconSizeClass("standard")} aria-hidden />
              {item.label}
            </button>
          );
        }

        const Icon = NAV_ICONS[item.icon];
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-1 text-xs ${active ? "font-medium text-primary" : "text-text-muted"}`}
          >
            <Icon className={navIconSizeClass("standard")} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
