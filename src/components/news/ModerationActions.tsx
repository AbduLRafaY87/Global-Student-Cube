"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { MODERATION_DECISIONS } from "@/domain/news/news";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ModerationActions({
  id,
  canEscalate,
}: {
  id: string;
  canEscalate: boolean;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState("publish");
  const [reason, setReason] = useState("");
  const [response, setResponse] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const options = MODERATION_DECISIONS.filter(
    (item) => canEscalate || item !== "escalate",
  ).map((item) => ({ value: item, label: item.replaceAll("_", " ") }));

  async function submit() {
    setBusy(true);
    const result = await postAdmin(`/api/v1/admin/moderation/${id}/decision`, {
      decision,
      reason,
      response,
      notes,
    });
    setBusy(false);
    setMessage(result.ok ? "Decision recorded." : result.message);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <SelectField
        id="moderation-decision"
        label="Decision"
        value={decision}
        onChange={(event) => setDecision(event.target.value)}
        options={options}
      />
      <label className="block text-sm text-text" htmlFor="moderation-reason">
        Reason
        <textarea
          id="moderation-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          rows={3}
          className="mt-2 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm text-text" htmlFor="moderation-response">
        Participant-facing response
        <textarea
          id="moderation-response"
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm text-text" htmlFor="moderation-notes">
        Private notes
        <textarea
          id="moderation-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
        />
      </label>
      <Button type="submit" loading={busy}>
        Resolve with action
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
