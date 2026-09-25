import { SettingsLogout } from "@/components/privacy/SettingsLogout";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadAccountSettings } from "@/server/modules/privacy/load";
import {
  ChevronRight,
  FileText,
  GraduationCap,
  Bell,
  HelpCircle,
  Shield,
  ShieldCheck,
  Trophy,
  User,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account settings" };

function asText(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "Not provided";
}

export default async function SettingsPage() {
  const result = await loadAccountSettings();
  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }

  const data = result.data;
  const name = [asText(data.firstName), asText(data.lastName)]
    .filter((value) => value !== "Not provided")
    .join(" ") || "Not provided";
  const roles = Array.isArray(data.roles)
    ? data.roles.filter((value): value is string => typeof value === "string")
    : [];

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-start gap-3">
        <User className="size-8 text-primary" aria-hidden />
        <div>
          <h1 className="text-2xl font-semibold text-text">Account settings</h1>
          <p className="mt-1 text-sm text-text-muted">
            {name} · GSC ID {asText(data.gscId)} · {asText(data.role)}
          </p>
        </div>
      </header>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Identity</h2>
        <dl className="mt-3 grid gap-3 text-sm text-text">
          <div>
            <dt className="text-text-muted">Account UUID</dt>
            <dd>{asText(data.accountId)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Status</dt>
            <dd>{asText(data.status)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Language and timezone</dt>
            <dd>Not provided</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-text-muted">
          Changing login email never changes this UUID or GSC ID.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Link
            className="inline-flex h-12 items-center text-sm text-primary underline-offset-2 hover:underline"
            href="/verify-email"
          >
            Edit email
          </Link>
          <Link
            className="inline-flex h-12 items-center text-sm text-primary underline-offset-2 hover:underline"
            href="/verify-phone"
          >
            Verify phone
          </Link>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Approved roles</h2>
        {roles.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">
            Only approved entitlements can be used. None are listed yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-text">
            {roles.map((role) => (
              <li key={role}>{role}</li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-text-muted">
          Unavailable roles cannot be selected here.
        </p>
      </section>

      <nav className="space-y-2" aria-label="Settings">
        {[
          { href: "/learning", label: "Learning", icon: GraduationCap },
          { href: "/news", label: "News", icon: FileText },
          { href: "/rewards", label: "Rewards", icon: Trophy },
          { href: "/journey", label: "Journey", icon: Waypoints },
          { href: "/notifications", label: "Notifications", icon: Bell },
          { href: "/settings/security", label: "Security", icon: ShieldCheck },
          { href: "/privacy?document=data-use", label: "Privacy", icon: Shield },
          { href: "/help", label: "Help", icon: HelpCircle },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex h-14 items-center justify-between rounded-[var(--radius-card)] border border-border bg-surface px-4 text-sm text-text"
          >
            <span className="inline-flex items-center gap-3">
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </span>
            <ChevronRight className="size-5 text-text-muted" aria-hidden />
          </Link>
        ))}
        <SettingsLogout />
      </nav>
    </div>
  );
}
