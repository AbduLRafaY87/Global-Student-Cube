"use client";

import { createClient } from "@/lib/supabase/client";
import { navTitleForPath } from "@/domain/navigation";
import type { UserRole } from "@/types";
import { IconButton } from "@/components/ui/IconButton";
import { Bell, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
  const role = user?.role ?? "student";
  const title = navTitleForPath(pathname, role);
  const unreadLabel =
    unreadCount > 99 ? "99+" : String(unreadCount);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 flex-shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4 min-[900px]:h-16">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton
          label="Open navigation"
          className="min-[900px]:hidden"
          onClick={onOpenMobile}
        >
          <Menu className="size-6" aria-hidden />
        </IconButton>
        <h1 className="truncate text-title-phone font-semibold tracking-tight text-text min-[900px]:text-title-desktop">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          href="/notifications"
          className="relative inline-flex size-12 items-center justify-center rounded-[var(--radius-control)] text-text hover:bg-neutral-100"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadLabel} unread`
              : "Notifications"
          }
        >
          <Bell className="size-6" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute top-2 right-2 min-w-4 rounded-full bg-critical px-1 text-center text-[10px] leading-4 font-medium text-surface">
              {unreadLabel}
            </span>
          ) : null}
        </Link>

        {user ? (
          <div className="flex items-center gap-1">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 hover:bg-neutral-100"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-surface">
                {initials(user)}
              </span>
              <span className="hidden min-w-0 sm:flex sm:flex-col">
                <span className="truncate text-sm font-medium text-text">
                  {displayName(user)}
                </span>
                {user.role ? (
                  <span className="truncate text-xs text-text-muted capitalize">
                    {user.role}
                  </span>
                ) : null}
              </span>
            </Link>
            <IconButton
              label="Log out"
              onClick={() => {
                void handleLogout();
              }}
            >
              <LogOut className="size-6" aria-hidden />
            </IconButton>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-text underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
