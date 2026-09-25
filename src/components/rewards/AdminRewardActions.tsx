"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdminRewardActionsProps {
  kind: "activity" | "redemption" | "catalog";
  id: string;
}

export function AdminRewardActions({ kind, id }: AdminRewardActionsProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      setBusy(false);
      if (!response.ok) {
        setMessage(payload.error?.message ?? "That decision was not saved.");
        return;
      }
      router.refresh();
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-2 text-sm" htmlFor={`reason-${id}`}>
        <span className="font-medium text-text">Audit reason</span>
        <textarea
          id={`reason-${id}`}
          required
          className="min-h-20 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      {kind === "activity" ? (
        <Button
          loading={busy}
          onClick={() => void post(`/api/v1/admin/rewards/activities/${id}/approve`, { reason })}
        >
          Approve qualifying activity
        </Button>
      ) : kind === "catalog" ? (
        <Button
          loading={busy}
          onClick={() => void post(`/api/v1/admin/rewards/catalog/${id}/publish`, { reason })}
        >
          Publish reward
        </Button>
      ) : (
        <div className="flex flex-col gap-3 min-[600px]:flex-row">
          <Button
            loading={busy}
            onClick={() =>
              void post(`/api/v1/admin/rewards/redemptions/${id}/decision`, {
                decision: "fulfill",
                reason,
              })
            }
          >
            Approve redemption fulfillment
          </Button>
          <Button
            variant="secondary"
            loading={busy}
            onClick={() =>
              void post(`/api/v1/admin/rewards/redemptions/${id}/decision`, {
                decision: "fail",
                reason,
              })
            }
          >
            Mark failed
          </Button>
        </div>
      )}
      {message ? (
        <p className="text-sm text-critical" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
