"use client";

import { createClient } from "@/lib/supabase/client";
import { ChevronRight, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function SettingsLogout() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="flex h-14 w-full items-center justify-between rounded-[var(--radius-card)] border border-border bg-surface px-4 text-sm text-text"
      onClick={() => {
        void createClient()
          .auth.signOut()
          .then(() => {
            router.push("/");
            router.refresh();
          });
      }}
    >
      <span className="inline-flex items-center gap-3">
        <LogOut className="size-5" aria-hidden />
        Log out
      </span>
      <ChevronRight className="size-5 text-text-muted" aria-hidden />
    </button>
  );
}
