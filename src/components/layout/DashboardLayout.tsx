"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { Header, type DashboardHeaderUser } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SkipLink } from "@/components/ui/SkipLink";
import { ToastProvider } from "@/components/ui/Toast";
import type { BottomNavEntry, DashboardNavSection } from "@/domain/navigation";
import { useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: DashboardHeaderUser;
  unreadCount: number;
  sections: DashboardNavSection[];
  bottomNav: BottomNavEntry[];
}

export function DashboardLayout({
  children,
  user,
  unreadCount,
  sections,
  bottomNav,
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider>
      <SkipLink />
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-[var(--gsc-backdrop)] min-[900px]:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <Sidebar
          sections={sections}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={() => setCollapsed((current) => !current)}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            user={user}
            unreadCount={unreadCount}
            onOpenMobile={() => setMobileOpen(true)}
          />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto bg-background px-4 py-4 pb-8 min-[900px]:px-6 min-[1200px]:px-8"
          >
            <div className="mx-auto max-w-[1440px]">{children}</div>
          </main>
          <BottomNav
            items={bottomNav}
            onOpenMore={() => setMobileOpen(true)}
          />
        </div>
      </div>
    </ToastProvider>
  );
}
