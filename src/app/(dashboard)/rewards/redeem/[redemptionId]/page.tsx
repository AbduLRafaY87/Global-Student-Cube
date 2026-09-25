import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadRedemption } from "@/server/modules/rewards/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Redemption request" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export default async function RedemptionDetailPage({
  params,
}: {
  params: Promise<{ redemptionId: string }>;
}) {
  const { redemptionId } = await params;
  const loaded = await loadRedemption(redemptionId);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const data = loaded.data;
  if (!data.id) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <EmptyState title="Request not found" message="This redemption is not available." />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-text">{asString(data.title)}</h1>
      <p className="text-sm text-text">
        {asCount(data.points)} points · {asString(data.state)} · {asString(data.deliveryEstimate)}
      </p>
      <p className="text-sm text-text-muted">
        Timeline: reserved, processing, then fulfilled or failed. Failure releases through a ledger
        entry, not deletion.
      </p>
      {data.state === "fulfilled" ? (
        <Link className="text-primary underline-offset-2 hover:underline" href="/rewards/certificates">
          Download recognition
        </Link>
      ) : null}
      <Link className="text-primary underline-offset-2 hover:underline" href="/rewards/redeem">
        Back to catalog
      </Link>
    </div>
  );
}
