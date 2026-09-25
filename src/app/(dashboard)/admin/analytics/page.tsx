import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import {
  ATTRIBUTION_CAUTION,
  MIN_REPORTING_COHORT,
  publishMetric,
} from "@/domain/privacy/analytics";
import { loadAdminAnalytics } from "@/server/modules/privacy/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Operational analytics" };

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const filters = await searchParams;
  const loaded = await loadAdminAnalytics(filters.from ?? null, filters.to ?? null);

  return (
    <AdminChrome
      title="Operational and outcome analytics"
      description={ATTRIBUTION_CAUTION}
    >
      {!loaded.ok ? (
        loaded.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState />
        )
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-text-muted">
            Refreshed {asText(loaded.data.refreshedAt) || "Not provided"}. Cohorts
            under {MIN_REPORTING_COHORT} are suppressed. Unreported alumni are not
            counted as failures.
          </p>
          <form className="grid gap-3 min-[600px]:grid-cols-3" method="get">
            <label className="text-sm text-text">
              From
              <input
                type="date"
                name="from"
                defaultValue={filters.from}
                className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
              />
            </label>
            <label className="text-sm text-text">
              To
              <input
                type="date"
                name="to"
                defaultValue={filters.to}
                className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
              />
            </label>
            <button
              type="submit"
              className="mt-7 h-12 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-surface"
            >
              Apply filters
            </button>
          </form>
          <div className="grid gap-4 min-[900px]:grid-cols-2">
            {(Array.isArray(loaded.data.metrics) ? loaded.data.metrics : []).map(
              (item) => {
                const row = item as Record<string, unknown>;
                const published = publishMetric(asText(row.label) || "Metric", {
                  numerator: asNumber(row.numerator),
                  denominator: asNumber(row.denominator),
                  unknown: asNumber(row.unknown),
                  cohortSize: asNumber(row.cohortSize),
                  selfReported: asNumber(row.selfReported),
                  verified: asNumber(row.verified),
                });
                return (
                  <article
                    key={asText(row.id) || published.label}
                    className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
                  >
                    <h2 className="text-lg font-semibold text-text">{published.label}</h2>
                    {published.suppressed ? (
                      <p className="mt-2 text-sm text-text-muted">
                        Suppressed. Cohort {published.cohortSize} is below the
                        minimum of {MIN_REPORTING_COHORT}.
                      </p>
                    ) : (
                      <dl className="mt-3 grid gap-2 text-sm text-text">
                        <div>
                          <dt className="text-text-muted">Numerator / denominator</dt>
                          <dd>
                            {published.numerator} / {published.denominator}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">Unknown</dt>
                          <dd>{published.unknown}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">Self-reported / verified</dt>
                          <dd>
                            {published.selfReported} / {published.verified}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </article>
                );
              },
            )}
          </div>
          <Link
            className="inline-flex text-sm text-primary underline-offset-2 hover:underline"
            href="/admin/support"
          >
            Inspect jobs and support actions
          </Link>
        </div>
      )}
    </AdminChrome>
  );
}
