"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ADVISORY_DISCLAIMER, FIT_LABELS } from "@/domain/counseling/advisory";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ReportEditorProps {
  sessionId: string;
  status: string;
  initialGuidance: string;
  initialNotes: string;
  dueLabel: string;
}

export function ReportEditor({
  sessionId,
  status,
  initialGuidance,
  initialNotes,
  dueLabel,
}: ReportEditorProps) {
  const router = useRouter();
  const [guidance, setGuidance] = useState(initialGuidance);
  const [notes, setNotes] = useState(initialNotes);
  const [fit, setFit] = useState("3");
  const [rationale, setRationale] = useState("");
  const [programId, setProgramId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(event: string) {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/v1/sessions/${sessionId}/advisory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        shareableBody: {
          guidance,
          disclaimer: ADVISORY_DISCLAIMER,
          fits: rationale
            ? [
                {
                  programId,
                  score: Number(fit),
                  rationale,
                  label: FIT_LABELS[Number(fit) as 1 | 2 | 3 | 4 | 5],
                },
              ]
            : [],
        },
        privateNotes: notes,
      }),
    });
    const body = (await response.json()) as { error?: { message?: string } };
    setBusy(false);
    setMessage(body.error?.message ?? (response.ok ? "Saved." : "Not saved."));
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-muted">Report due {dueLabel}. Status: {status}.</p>
      <p className="text-sm text-text">
        Recording and AI are off. Write the summary yourself. Fit scores are not
        an admission probability.
      </p>
      <label className="flex flex-col text-sm">
        Shareable guidance
        <textarea
          className="mt-2 min-h-40 rounded-[var(--radius-control)] border border-control-border p-3"
          value={guidance}
          maxLength={8000}
          onChange={(event) => setGuidance(event.target.value)}
        />
      </label>
      <TextField
        id="program"
        label="Program reference for fit score"
        value={programId}
        onChange={(event) => setProgramId(event.target.value)}
      />
      <label className="flex flex-col text-sm">
        University fit
        <select
          className="mt-2 h-12 rounded-[var(--radius-control)] border border-control-border px-3"
          value={fit}
          onChange={(event) => setFit(event.target.value)}
        >
          {([1, 2, 3, 4, 5] as const).map((value) => (
            <option key={value} value={value}>
              {value} · {FIT_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-sm">
        Fit rationale
        <textarea
          className="mt-2 min-h-24 rounded-[var(--radius-control)] border border-control-border p-3"
          maxLength={2000}
          value={rationale}
          onChange={(event) => setRationale(event.target.value)}
        />
      </label>
      <label className="flex flex-col text-sm">
        Private notes (never shown on SES-09)
        <textarea
          className="mt-2 min-h-24 rounded-[var(--radius-control)] border border-control-border p-3"
          maxLength={4000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      {message ? <p className="text-sm text-text">{message}</p> : null}
      <div className="flex flex-col gap-3">
        <Button loading={busy} onClick={() => void send("save")}>
          Save draft
        </Button>
        <Button variant="secondary" loading={busy} onClick={() => void send("submit_review")}>
          Submit for review
        </Button>
        <Button
          variant="secondary"
          loading={busy}
          onClick={() => {
            void (async () => {
              await send("save");
              await send("submit_review");
              await send("approve");
              await send("deliver");
            })();
          }}
        >
          Approve and deliver advisory
        </Button>
        <Button variant="ghost" loading={busy} onClick={() => void send("supersede")}>
          Start a correction version
        </Button>
      </div>
    </div>
  );
}
