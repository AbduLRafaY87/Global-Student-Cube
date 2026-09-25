import { SecurityForms } from "@/components/privacy/SecurityForms";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { PHONE_OTP_NOT_MFA } from "@/domain/privacy/otp";
import { loadSecurityWorkspace } from "@/server/modules/privacy/load";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Password, MFA and sessions" };

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function SecuritySettingsPage() {
  const result = await loadSecurityWorkspace();
  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const events = Array.isArray(result.data.items) ? result.data.items : [];

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <ShieldCheck className="size-8 text-primary" aria-hidden />
        <h1 className="mt-2 text-2xl font-semibold text-text">
          Password, MFA and active sessions
        </h1>
        <p className="mt-2 text-sm text-text-muted">{PHONE_OTP_NOT_MFA}</p>
      </header>
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Password</h2>
        <div className="mt-4">
          <SecurityForms />
        </div>
      </section>
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Authenticator MFA</h2>
        <p className="mt-2 text-sm text-text-muted">
          Staff and counselor accounts cannot disable required MFA. Phone OTP is
          not login MFA.
        </p>
        <Link
          className="mt-3 inline-flex h-12 items-center text-sm text-primary underline-offset-2 hover:underline"
          href="/mfa"
        >
          Set up authenticator
        </Link>
      </section>
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">This session</h2>
        <p className="mt-2 text-sm text-text">Current device · signed in now</p>
        <p className="mt-2 text-sm text-text-muted">
          A revoked session cannot keep fetching private case data.
        </p>
      </section>
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Security events</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No recent security events.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-text">
            {events.map((item) => {
              const row = item as Record<string, unknown>;
              return (
                <li key={asText(row.id)}>
                  {asText(row.action)} · {asText(row.occurredAt)}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
