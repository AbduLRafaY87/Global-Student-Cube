import { RewardsRulesOnly } from "@/components/rewards/RewardsRulesOnly";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { addCalendarMonths } from "@/domain/rewards/ledger";
import { loadRewardHome } from "@/server/modules/rewards/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Points and ledger" };

function asCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function RewardsHomePage() {
  const loaded = await loadRewardHome();
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {loaded.forbidden ? <RewardsRulesOnly /> : <ErrorState />}
      </div>
    );
  }
  const data = loaded.data;
  const projection =
    data.projection && typeof data.projection === "object"
      ? (data.projection as Record<string, unknown>)
      : {};
  const ledger = Array.isArray(data.ledger) ? data.ledger : [];
  const pending = Array.isArray(data.pending) ? data.pending : [];
  const invitation =
    data.goldInvitation && typeof data.goldInvitation === "object"
      ? (data.goldInvitation as Record<string, unknown>)
      : null;
  const lastActivity = asString(data.lastActivityAt);
  const lastDate = lastActivity ? new Date(lastActivity) : null;
  const expireAt = lastDate ? addCalendarMonths(lastDate, 6) : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Points, tiers and activity</h1>
        <p className="mt-2 text-sm text-text-muted">
          Verification badge is separate from tier. Ten sessions with one mentee cannot award
          Silver. Expiry never deletes historical ledger entries.
        </p>
      </header>
      <ul className="grid gap-3 min-[600px]:grid-cols-2">
        {(
          [
            { label: "Available", value: projection.available },
            { label: "Reserved", value: projection.reserved },
            { label: "Redeemed", value: projection.redeemed },
            { label: "Expired", value: projection.expired },
            { label: "Lifetime earned", value: projection.totalEarned },
          ] as const
        ).map((item) => (
          <li key={item.label} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <p className="text-sm text-text-muted">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold">{asCount(item.value)}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-text">
        Verified badge · Tier {asString(projection.tier) || "none"} · Unique mentees{" "}
        {asCount(projection.uniqueMentees)} / 5 / 10 / 15 / 25
      </p>
      {expireAt ? (
        <p className="text-sm text-text-muted">
          Inactivity expires remaining spendable points on {expireAt.toISOString().slice(0, 10)}.
        </p>
      ) : null}
      {invitation ? (
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">{asString(invitation.title)}</h2>
          <p className="mt-2 text-sm text-text">{asString(invitation.body)}</p>
          <p className="mt-2 text-sm text-text-muted">{asString(invitation.eventInformation)}</p>
        </section>
      ) : null}
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link className="text-primary underline-offset-2 hover:underline" href="/rewards/redeem">
          Redeem points
        </Link>
        <Link className="text-primary underline-offset-2 hover:underline" href="/rewards/referrals">
          Invite a student
        </Link>
        <Link className="text-primary underline-offset-2 hover:underline" href="/rewards/certificates">
          Certificates
        </Link>
      </nav>
      <section>
        <h2 className="text-lg font-semibold text-text">Pending verification</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No pending mentoring credits.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm text-text">
            {pending.map((row) => {
              const item = row as Record<string, unknown>;
              return (
                <li key={asString(item.id)}>
                  Session {asString(item.bookingId)} · {asString(item.state)}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-lg font-semibold text-text">Activity ledger</h2>
        {ledger.length === 0 ? (
          <EmptyState
            title="No activity yet"
            message="25 points are awarded once after an approved mentoring session or a qualified referred student who completed Modules 2 and 3."
          />
        ) : (
          <ol className="mt-2 space-y-2">
            {ledger.map((row) => {
              const item = row as Record<string, unknown>;
              return (
                <li key={asString(item.id)} className="rounded-[var(--radius-card)] border border-border bg-surface p-3">
                  <p className="text-sm font-medium text-text">{asString(item.eventType)}</p>
                  <p className="text-sm text-text-muted">{asCount(item.points)} points</p>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
