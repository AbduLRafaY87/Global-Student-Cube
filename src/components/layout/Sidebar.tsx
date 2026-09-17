"use client";

import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bell,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  CreditCard,
  FileText,
  FolderOpen,
  Gauge,
  GraduationCap,
  HeartHandshake,
  Home,
  MessageCircle,
  MessageSquareQuote,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Plane,
  Scale,
  Shield,
  Trophy,
  User,
  Users,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/universities", label: "Universities", icon: GraduationCap },
  { href: "/applications", label: "Applications", icon: FileText },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/essays", label: "Essays", icon: PenLine },
  { href: "/recommendations", label: "Recommendations", icon: MessageSquareQuote },
  { href: "/scholarships", label: "Scholarships", icon: Award },
  { href: "/test-prep", label: "Test Prep", icon: ClipboardCheck },
  { href: "/counselor", label: "Counselor", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/interviews", label: "Interviews", icon: CalendarDays },
  { href: "/admission-odds", label: "Odds", icon: Gauge },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/parent-portal", label: "Parent Portal", icon: HeartHandshake },
  { href: "/activities", label: "Activities", icon: Trophy },
  { href: "/visa", label: "Visa", icon: Plane },
  { href: "/housing", label: "Housing", icon: Home },
  { href: "/alumni", label: "Alumni", icon: Waypoints },
  { href: "/offers", label: "Offers", icon: Scale },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export function dashboardPageTitle(pathname: string): string {
  const match = DASHBOARD_NAV.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  if (match) {
    return match.label;
  }

  if (pathname.startsWith("/onboarding")) {
    return "Onboarding";
  }

  return "Dashboard";
}

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
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
          ? "fixed top-0 left-0 z-40 flex h-full w-64 flex-shrink-0 flex-col overflow-y-auto border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:static md:z-0"
          : `fixed top-0 left-0 z-40 flex h-full w-64 flex-shrink-0 -translate-x-full flex-col overflow-y-auto border-r border-zinc-200 bg-white transition-[width,transform] duration-200 dark:border-zinc-800 dark:bg-zinc-950 md:static md:z-0 md:translate-x-0 ${collapsed ? "md:w-16" : "md:w-64"
          }`
      }
    >
      <div
        className={
          iconOnly
            ? "flex h-16 shrink-0 items-center justify-center border-b border-zinc-200 px-4 dark:border-zinc-800"
            : "flex h-16 shrink-0 items-center border-b border-zinc-200 px-4 dark:border-zinc-800"
        }
      >
        <Link
          href="/profile"
          className="truncate text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
          onClick={onCloseMobile}
        >
          {iconOnly ? "GSC" : "Global Student Cube"}
        </Link>
      </div>

      <nav className="flex flex-col gap-1 p-2" aria-label="Dashboard">
        {DASHBOARD_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              onClick={onCloseMobile}
              className={
                active
                  ? `flex items-center rounded-lg py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900 ${iconOnly
                    ? "justify-center bg-zinc-900 px-0"
                    : "gap-3 bg-zinc-900 px-3"
                  }`
                  : `flex items-center rounded-lg py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 ${iconOnly ? "justify-center px-0" : "gap-3 px-3"
                  }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className={iconOnly ? "sr-only" : undefined}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-zinc-200 p-2 md:block dark:border-zinc-800">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={
            collapsed
              ? "flex w-full items-center justify-center rounded-lg px-0 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              : "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          }
          aria-pressed={collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {collapsed ? <span className="sr-only">Expand</span> : <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
