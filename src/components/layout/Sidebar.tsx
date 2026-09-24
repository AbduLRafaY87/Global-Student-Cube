"use client";

import { NAV_ICONS, navIconSizeClass } from "@/components/layout/nav-icons";
import type { DashboardNavSection } from "@/domain/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  sections: DashboardNavSection[];
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  sections,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const iconOnly = collapsed && !mobileOpen;

  return (
    <aside
      className={
        mobileOpen
          ? "fixed top-0 left-0 z-40 flex h-full w-60 flex-shrink-0 flex-col overflow-y-auto border-r border-border bg-surface min-[900px]:static min-[900px]:z-0"
          : `fixed top-0 left-0 z-40 flex h-full w-60 flex-shrink-0 -translate-x-full flex-col overflow-y-auto border-r border-border bg-surface transition-[width,transform] duration-200 min-[900px]:static min-[900px]:z-0 min-[900px]:translate-x-0 ${collapsed ? "min-[900px]:w-20" : "min-[1200px]:w-60 min-[900px]:w-20"}`
      }
    >
      <div
        className={
          iconOnly
            ? "flex h-14 shrink-0 items-center justify-center border-b border-border px-4 min-[900px]:h-16"
            : "flex h-14 shrink-0 items-center border-b border-border px-4 min-[900px]:h-16"
        }
      >
        <Link
          href="/profile"
          className="truncate text-sm font-semibold tracking-tight text-text"
          onClick={onCloseMobile}
        >
          {iconOnly ? "GSC" : "Global Student Cube"}
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-4 p-2" aria-label="Dashboard">
        {sections.map((section) => (
          <div key={section.id}>
            <p
              className={
                iconOnly
                  ? "sr-only"
                  : "px-3 pb-1 text-xs font-medium tracking-wide text-text-muted uppercase"
              }
            >
              {section.label}
            </p>
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                const active = isActivePath(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      aria-current={active ? "page" : undefined}
                      onClick={onCloseMobile}
                      className={
                        active
                          ? `flex h-12 items-center rounded-[var(--radius-control)] text-sm font-medium text-surface ${iconOnly ? "justify-center bg-primary px-0" : "gap-2 bg-primary px-3"}`
                          : `flex h-12 items-center rounded-[var(--radius-control)] text-sm font-medium text-text hover:bg-neutral-100 ${iconOnly ? "justify-center px-0" : "gap-2 px-3"}`
                      }
                    >
                      <Icon
                        className={`${navIconSizeClass("standard")} shrink-0`}
                        aria-hidden
                      />
                      <span className={iconOnly ? "sr-only" : undefined}>
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="hidden border-t border-border p-2 min-[900px]:block">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={
            collapsed
              ? "flex h-12 w-full items-center justify-center rounded-[var(--radius-control)] text-sm font-medium text-text hover:bg-neutral-100"
              : "flex h-12 w-full items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm font-medium text-text hover:bg-neutral-100"
          }
          aria-pressed={collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-6 shrink-0" aria-hidden />
          ) : (
            <PanelLeftClose className="size-6 shrink-0" aria-hidden />
          )}
          {collapsed ? (
            <span className="sr-only">Expand</span>
          ) : (
            <span>Collapse</span>
          )}
        </button>
      </div>
    </aside>
  );
}
