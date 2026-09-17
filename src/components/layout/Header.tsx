"use client";

import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";
import { Bell, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { dashboardPageTitle } from "@/components/layout/Sidebar";

export interface DashboardHeaderUser {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole | null;
}

interface HeaderProps {
  user: DashboardHeaderUser | null;
  unreadCount: number;
  onOpenMobile: () => void;
}

function displayName(user: DashboardHeaderUser): string {
  const name = `${user.first_name} ${user.last_name}`.trim();
  return name === "" ? user.email || "Account" : name;
}

function initials(user: DashboardHeaderUser): string {
  const first = user.first_name.trim().charAt(0);
  const last = user.last_name.trim().charAt(0);

  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }

  return (user.email.charAt(0) || "U").toUpperCase();
}

export function Header({ user, unreadCount, onOpenMobile }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const title = dashboardPageTitle(pathname);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-900"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/notifications"
          className="relative rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <Bell className="h-5 w-5" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600" />
          ) : null}
        </Link>

        {user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                {initials(user)}
              </span>
              <span className="hidden min-w-0 sm:flex sm:flex-col">
                <span className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                  {displayName(user)}
                </span>
                {user.role ? (
                  <span className="truncate text-xs text-zinc-500 capitalize">
                    {user.role}
                  </span>
                ) : null}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" aria-hidden />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
