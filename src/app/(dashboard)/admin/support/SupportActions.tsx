"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useState } from "react";

export function SupportActions() {
  const [accountId, setAccountId] = useState("");
  const [reason, setReason] = useState("");
  const [reviewAt, setReviewAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(path: string) {
    setBusy(true);
    const result = await postAdmin(path, { accountId, reason });
    setBusy(false);
    setMessage(
      result.ok
        ? path.includes("hold")
          ? "Legal hold recorded. Deletion stays restricted until release."
          : path.includes("export")
            ? "Export package is ready for 24 hours."
            : "Deletion started. Access is suspended."
        : result.message,
    );
  }

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <p className="text-sm text-text-muted">
        Export excludes other participants’ private notes and protected safety
        evidence. Deletion keeps minimized ledger, audit and consent records.
      </p>
      <TextField
        id="support-account"
        label="Account UUID"
        required
        value={accountId}
        onChange={(event) => setAccountId(event.target.value)}
      />
      <TextField
        id="support-reason"
        label="Reason"
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-col gap-3 min-[600px]:flex-row">
        <Button
          loading={busy}
          onClick={() => void run("/api/v1/admin/support/export")}
        >
          Queue export request
        </Button>
        <Button
          variant="destructive"
          loading={busy}
          onClick={() => void run("/api/v1/admin/support/deletion")}
        >
          Start deletion request
        </Button>
      </div>
      <TextField
        id="support-review"
        label="Hold review date"
        type="date"
        value={reviewAt}
        onChange={(event) => setReviewAt(event.target.value)}
      />
      <Button
        type="button"
        variant="secondary"
        loading={busy}
        onClick={() =>
          void postAdmin("/api/v1/admin/support/holds", {
            accountId,
            reason,
            reviewAt,
          }).then((result) => {
            setMessage(
              result.ok
                ? "Legal hold recorded. Deletion stays restricted until release."
                : result.message,
            );
          })
        }
      >
        Place legal hold
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
