"use client";

import { Header, type DashboardHeaderUser } from "@/components/layout/Header";
import { Sidebar, type DashboardNavItem } from "@/components/layout/Sidebar";
import { useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: DashboardHeaderUser;
  unreadCount: number;
  navItems: DashboardNavItem[];
}

export function DashboardLayout({
  children,
  user,
  unreadCount,
  navItems,
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-zinc-950/40 md:hidden"
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <Sidebar
        items={navItems}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          unreadCount={unreadCount}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
