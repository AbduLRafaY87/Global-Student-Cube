"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useState } from "react";

export function SupportActions() {
  const [accountId, setAccountId] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(path: string) {
    setBusy(true);
    const result = await postAdmin(path, { accountId, reason });
    setBusy(false);
    setMessage(
      result.ok
        ? "Queued as a Prompt 30 stub. The export or deletion workflow is not complete."
        : result.message,
    );
  }

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <p className="text-sm text-text-muted">
        These commands write audit and outbox rows only. Prompt 30 completes the
        export package and the 30-day deletion workflow.
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
          Queue deletion request
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
