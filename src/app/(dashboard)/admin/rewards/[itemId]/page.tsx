import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { AdminRewardActions } from "@/components/rewards/AdminRewardActions";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadAdminRewards } from "@/server/modules/rewards/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reward item" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export default async function AdminRewardItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const loaded = await loadAdminRewards();

  return (
    <AdminChrome
      title="Reward evidence"
      description="Logged duration, rating and prior awards stay read-only. Staff cannot overwrite balances."
    >
      {!loaded.ok ? (
        loaded.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState />
        )
      ) : (
        <ItemBody itemId={itemId} data={loaded.data} />
      )}
    </AdminChrome>
  );
}

function ItemBody({
  itemId,
  data,
}: {
  itemId: string;
  data: Record<string, unknown>;
}) {
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  const redemptions = Array.isArray(data.redemptions) ? data.redemptions : [];
  const session = sessions.find((row) => asString((row as Record<string, unknown>).id) === itemId) as
    | Record<string, unknown>
    | undefined;
  const redemption = redemptions.find(
    (row) => asString((row as Record<string, unknown>).id) === itemId,
  ) as Record<string, unknown> | undefined;

  if (!session && !redemption) {
    return (
      <EmptyState
        title="Item not in queue"
        message="This activity is not waiting for a rewards decision."
      />
    );
  }

  return (
    <div className="space-y-4">
      {session ? (
        <>
          <p className="text-sm text-text">
            {asString(session.mentorName)} · {asString(session.state)} · booking{" "}
            {asString(session.bookingId)}
          </p>
          <AdminRewardActions kind="activity" id={itemId} />
        </>
      ) : null}
      {redemption ? (
        <>
          <p className="text-sm text-text">
            {asString(redemption.title)} · {asString(redemption.state)} · {asCount(redemption.points)}{" "}
            points
          </p>
          <AdminRewardActions kind="redemption" id={itemId} />
        </>
      ) : null}
      <Link className="text-primary underline-offset-2 hover:underline" href="/admin/rewards">
        Back to queues
      </Link>
    </div>
  );
}
