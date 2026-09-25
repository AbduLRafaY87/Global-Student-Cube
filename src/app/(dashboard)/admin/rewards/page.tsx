import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { AdminRewardActions } from "@/components/rewards/AdminRewardActions";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { GIFT_CARD_DELIVERY } from "@/domain/rewards/ledger";
import { loadAdminRewards } from "@/server/modules/rewards/load";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Rewards verification" };

const TABS = ["sessions", "referrals", "catalog", "redemptions"] as const;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export default async function AdminRewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const filters = await searchParams;
  const tab = TABS.includes(filters.tab as (typeof TABS)[number])
    ? (filters.tab as (typeof TABS)[number])
    : "sessions";
  const loaded = await loadAdminRewards();

  return (
    <AdminChrome
      title="Rewards verification and fulfillment"
      description="Staff approve qualifying activity and fulfillment. Balances cannot be overwritten. Gift-card estimates stay 10–12 working days, never instant."
    >
      {!loaded.ok ? (
        loaded.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState />
        )
      ) : (
        <AdminRewardsBody tab={tab} data={loaded.data} />
      )}
    </AdminChrome>
  );
}

function AdminRewardsBody({
  tab,
  data,
}: {
  tab: (typeof TABS)[number];
  data: Record<string, unknown>;
}) {
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  const referrals = Array.isArray(data.referrals) ? data.referrals : [];
  const redemptions = Array.isArray(data.redemptions) ? data.redemptions : [];
  const catalog = Array.isArray(data.catalog) ? data.catalog : [];
  const analytics =
    data.analytics && typeof data.analytics === "object"
      ? (data.analytics as Record<string, unknown>)
      : {};
  const topReferrers = Array.isArray(analytics.topReferrers) ? analytics.topReferrers : [];

  return (
    <div className="space-y-6">
      <nav aria-label="Rewards queues" className="flex flex-wrap gap-3 text-sm">
        {TABS.map((item) => (
          <Link
            key={item}
            className="text-primary underline-offset-2 hover:underline"
            href={`/admin/rewards?tab=${item}`}
          >
            {item}
          </Link>
        ))}
      </nav>
      <section className="grid gap-3 min-[600px]:grid-cols-3">
        <p className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm">
          Points issued {asCount(analytics.pointsIssued)}
        </p>
        <p className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm">
          Redemptions reserved {asCount(analytics.redemptionsReserved)}
        </p>
        <p className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm">
          Fulfilled {asCount(analytics.redemptionsFulfilled)}
        </p>
      </section>
      {topReferrers.length > 0 ? (
        <p className="text-sm text-text-muted">
          Top referrers {topReferrers.length} (credits only, no profile details).
        </p>
      ) : null}
      {tab === "sessions" ? (
        <QueueList
          empty="No sessions waiting for rewards verification."
          items={sessions}
          render={(item) => (
            <>
              <p className="text-sm text-text">
                {asString(item.mentorName)} · {asString(item.state)}
              </p>
              <AdminRewardActions kind="activity" id={asString(item.id)} />
            </>
          )}
        />
      ) : null}
      {tab === "referrals" ? (
        <QueueList
          empty="No referrals in review or onboarding."
          items={referrals}
          render={(item) => (
            <p className="text-sm text-text">
              {asString(item.referrerName)} · {asString(item.status)}
            </p>
          )}
        />
      ) : null}
      {tab === "redemptions" ? (
        <QueueList
          empty="No reserved or failed redemptions."
          items={redemptions}
          render={(item) => (
            <>
              <p className="text-sm text-text">
                {asString(item.title)} · {asString(item.state)} · {asCount(item.points)} points
              </p>
              <AdminRewardActions kind="redemption" id={asString(item.id)} />
            </>
          )}
        />
      ) : null}
      {tab === "catalog" ? (
        <ul className="grid gap-3">
          {catalog.map((row) => {
            const item = row as Record<string, unknown>;
            const gift = item.kind === "gift_card";
            return (
              <li key={asString(item.id)} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <p className="text-sm font-medium text-text">{asString(item.title)}</p>
                <p className="mt-1 text-sm text-text-muted">
                  {asString(item.code)} · {item.enabled === true ? "enabled" : "disabled"} · inventory{" "}
                  {item.inventoryCount == null ? "unlimited" : asCount(item.inventoryCount)}
                </p>
                {gift ? (
                  <p className="mt-2 text-sm text-text-muted">
                    GiftCard controls stay disabled until funded inventory exists. Delivery{" "}
                    {GIFT_CARD_DELIVERY}, never instant.
                  </p>
                ) : (
                  <div className="mt-3">
                    <AdminRewardActions kind="catalog" id={asString(item.id)} />
                  </div>
                )}
                {gift ? (
                  <button
                    type="button"
                    disabled
                    className="mt-3 h-12 rounded-[var(--radius-control)] border border-control-border px-4 text-sm text-text-muted"
                  >
                    GiftCard
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function QueueList({
  empty,
  items,
  render,
}: {
  empty: string;
  items: unknown[];
  render: (item: Record<string, unknown>) => ReactNode;
}) {
  if (items.length === 0) {
    return <EmptyState title="Nothing in this queue" message={empty} />;
  }
  return (
    <ul className="grid gap-3">
      {items.map((row) => {
        const item = row as Record<string, unknown>;
        return (
          <li key={asString(item.id)} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            {render(item)}
          </li>
        );
      })}
    </ul>
  );
}
