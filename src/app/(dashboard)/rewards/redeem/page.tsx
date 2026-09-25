import { RedeemButton } from "@/components/rewards/RedeemButton";
import { RewardsRulesOnly } from "@/components/rewards/RewardsRulesOnly";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { GIFT_CARD_DELIVERY, isGiftCardFulfillmentEnabled, REDEMPTION_MINIMUM } from "@/domain/rewards/ledger";
import { loadRewardCatalog } from "@/server/modules/rewards/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Redeem rewards" };

function asCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function RedeemPage() {
  const giftCards = isGiftCardFulfillmentEnabled(process.env.GSC_FEATURE_GIFT_CARDS);
  const loaded = await loadRewardCatalog(giftCards);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        {loaded.forbidden ? <RewardsRulesOnly /> : <ErrorState />}
      </div>
    );
  }
  const projection =
    loaded.data.home.projection && typeof loaded.data.home.projection === "object"
      ? (loaded.data.home.projection as Record<string, unknown>)
      : {};
  const available = asCount(projection.available);
  const catalog = Array.isArray(loaded.data.catalog) ? loaded.data.catalog : [];
  const redemptions = Array.isArray(loaded.data.redemptions) ? loaded.data.redemptions : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Reward catalog</h1>
        <p className="mt-2 text-sm text-text-muted">
          Spendable balance {available}. Minimum redemption {REDEMPTION_MINIMUM}. Confirmation never
          claims gift-card fulfillment happened instantly.
        </p>
      </header>
      {available < REDEMPTION_MINIMUM ? (
        <p className="text-sm text-text-muted">
          You need {REDEMPTION_MINIMUM - available} more spendable points.
        </p>
      ) : null}
      <ul className="space-y-4">
        {catalog.map((row) => {
          const item = row as Record<string, unknown>;
          const enabled = item.enabled === true && item.kind !== "gift_card";
          return (
            <li key={asString(item.id)} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
              <h2 className="text-lg font-semibold text-text">{asString(item.title)}</h2>
              <p className="mt-2 text-sm text-text">{asString(item.description)}</p>
              <p className="mt-2 text-sm text-text-muted">
                {asCount(item.pointsCost)} points · {asString(item.deliveryEstimate)}
              </p>
              {item.kind === "gift_card" ? (
                <p className="mt-2 text-sm text-text-muted">
                  Gift cards stay disabled until funded fulfillment exists. When enabled, delivery is{" "}
                  {GIFT_CARD_DELIVERY}.
                </p>
              ) : (
                <div className="mt-3">
                  <RedeemButton
                    catalogCode={asString(item.code)}
                    disabled={!enabled || available < asCount(item.pointsCost)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <section>
        <h2 className="text-lg font-semibold text-text">Requests</h2>
        {redemptions.length === 0 ? (
          <EmptyState title="No redemptions" message="Reserved requests appear here after confirmation." />
        ) : (
          <ul className="mt-2 space-y-2">
            {redemptions.map((row) => {
              const item = row as Record<string, unknown>;
              return (
                <li key={asString(item.id)}>
                  <Link className="text-primary underline-offset-2 hover:underline" href={`/rewards/redeem/${asString(item.id)}`}>
                    {asString(item.title)} · {asString(item.state)}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
