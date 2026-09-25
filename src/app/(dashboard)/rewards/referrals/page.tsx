import { ReferralShare } from "@/components/rewards/ReferralShare";
import { RewardsRulesOnly } from "@/components/rewards/RewardsRulesOnly";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { displayReferralStatus, isReferralState } from "@/domain/rewards/referrals";
import { referralQrSvg } from "@/domain/rewards/qr";
import { loadReferrals } from "@/server/modules/rewards/load";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = { title: "Referrals" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function ReferralsPage() {
  const loaded = await loadReferrals();
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {loaded.forbidden ? <RewardsRulesOnly /> : <ErrorState />}
      </div>
    );
  }
  const host = (await headers()).get("x-forwarded-host") ?? (await headers()).get("host") ?? "";
  const proto = (await headers()).get("x-forwarded-proto") ?? "https";
  const code = asString(loaded.data.code.code);
  const url = host && code ? `${proto}://${host}/r/${code}` : `/r/${code}`;
  const items = Array.isArray(loaded.data.items) ? loaded.data.items : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Referral sharing</h1>
        <p className="mt-2 text-sm text-text-muted">
          25 points require an approved referred student and completed Modules 2 and 3. Sharing,
          clicking or merely registering awards nothing.
        </p>
      </header>
      <p className="break-all text-sm text-text">{url}</p>
      <ReferralShare url={url} />
      <div
        className="h-48 w-48"
        aria-hidden={false}
        dangerouslySetInnerHTML={{ __html: referralQrSvg(url) }}
      />
      <label className="block space-y-2 text-sm" htmlFor="invite-preview">
        <span className="font-medium text-text">Invitation preview</span>
        <textarea
          id="invite-preview"
          className="min-h-24 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
          defaultValue={`Join Global Student Cube with my referral link: ${url}`}
        />
      </label>
      <Link className="text-primary underline-offset-2 hover:underline" href="/rewards">
        View points
      </Link>
      {items.length === 0 ? (
        <EmptyState title="No referrals yet" message="Share the link. Status never includes academic or financial details." />
      ) : (
        <ul className="space-y-2">
          {items.map((row) => {
            const item = row as Record<string, unknown>;
            const status = asString(item.status);
            return (
              <li key={asString(item.id)} className="rounded-[var(--radius-card)] border border-border bg-surface p-3 text-sm">
                {isReferralState(status) ? displayReferralStatus(status) : "invited"}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
