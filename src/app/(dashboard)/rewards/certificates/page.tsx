import { RewardsRulesOnly } from "@/components/rewards/RewardsRulesOnly";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { loadCertificates } from "@/server/modules/rewards/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Certificates" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export default async function CertificatesPage() {
  const loaded = await loadCertificates(null);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {loaded.forbidden ? <RewardsRulesOnly /> : <ErrorState />}
      </div>
    );
  }
  const items = Array.isArray(loaded.data.items) ? loaded.data.items : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Certificates and letters</h1>
        <p className="mt-2 text-sm text-text-muted">
          Documents state actual verified minutes and hours, never a fixed 20-hour claim.
        </p>
      </header>
      {items.length === 0 ? (
        <EmptyState
          title="No eligible document"
          message="A recognition pack must be fulfilled before a certificate is issued."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((row) => {
            const item = row as Record<string, unknown>;
            return (
              <li key={asString(item.id)} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <p className="text-sm font-medium text-text">
                  {asString(item.kind)} · {asString(item.issueId)}
                </p>
                <p className="text-sm text-text-muted">
                  {asString(item.hoursLabel)} ({asCount(item.minutes)} minutes)
                </p>
                <Link
                  className="mt-3 inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
                  href={`/rewards/certificates/${asString(item.id)}`}
                >
                  Open document
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
