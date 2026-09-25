"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CoachingActionsProps {
  sessionId: string;
  aiEnabled: boolean;
  initialResponse: string;
}

export function CoachingActions({
  sessionId,
  aiEnabled,
  initialResponse,
}: CoachingActionsProps) {
  const router = useRouter();
  const [response, setResponse] = useState(initialResponse);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(action: string) {
    setBusy(true);
    setMessage(null);
    const result = await fetch(`/api/v1/sessions/${sessionId}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, response }),
    });
    const body = (await result.json()) as { error?: { message?: string } };
    setBusy(false);
    setMessage(body.error?.message ?? (result.ok ? "Saved." : "Not saved."));
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-col text-sm">
        Counselor response
        <textarea
          className="mt-2 min-h-28 rounded-[var(--radius-control)] border border-control-border p-3"
          value={response}
          maxLength={2000}
          onChange={(event) => setResponse(event.target.value)}
        />
      </label>
      {message ? <p className="text-sm text-text">{message}</p> : null}
      <div className="flex flex-col gap-3">
        {aiEnabled ? (
          <Button variant="secondary" loading={busy} onClick={() => void send("generate")}>
            Generate private coaching
          </Button>
        ) : null}
        <Button loading={busy} onClick={() => void send("acknowledge")}>
          Acknowledge and plan improvement
        </Button>
        <Button variant="secondary" loading={busy} onClick={() => void send("flag")}>
          Flag inaccurate feedback
        </Button>
      </div>
    </div>
  );
}
