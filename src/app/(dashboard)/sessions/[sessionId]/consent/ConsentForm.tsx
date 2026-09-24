"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ConsentFormProps {
  sessionId: string;
  returnTo: string;
  asGuardian: boolean;
  isMinor: boolean;
}

export function ConsentForm({
  sessionId,
  returnTo,
  asGuardian,
  isMinor,
}: ConsentFormProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(decision: boolean) {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/v1/sessions/${sessionId}/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, asGuardian }),
    });
    const body = (await response.json()) as { error?: { message?: string } };
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error?.message ?? "Your choice was not saved.");
      return;
    }
    router.push(returnTo);
    router.refresh();
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save(checked);
      }}
    >
      <label className="flex items-start gap-3 text-sm text-text">
        <input
          type="checkbox"
          className="mt-1 size-5"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        <span>
          I consent to recording this session only. Account privacy consent does
          not pre-select this box.
          {isMinor
            ? " A verified guardian must also consent before recording can start."
            : null}
        </span>
      </label>
      {message ? <p className="text-sm text-critical">{message}</p> : null}
      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={!checked} loading={busy}>
          Save my choice
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={busy}
          onClick={() => void save(false)}
        >
          Continue without recording
        </Button>
      </div>
    </form>
  );
}
