"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface MentorRequestActionsProps {
  requestId: string;
  state: string;
  isMentor: boolean;
  conversationId: string | null;
}

export function MentorRequestActions({
  requestId,
  state,
  isMentor,
  conversationId,
}: MentorRequestActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [startsAt, setStartsAt] = useState("");

  async function post(path: string, body?: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      setBusy(false);
      if (!response.ok) {
        setMessage(payload.error?.message ?? "That change was not saved.");
        return;
      }
      router.refresh();
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  return (
    <div className="space-y-4">
      {isMentor && state === "requested" ? (
        <div className="flex flex-col gap-3 min-[600px]:flex-row">
          <Button loading={busy} onClick={() => void post(`/api/v1/mentor-requests/${requestId}/decision`, { decision: "accept" })}>
            Accept request
          </Button>
          <Button
            variant="secondary"
            loading={busy}
            onClick={() => void post(`/api/v1/mentor-requests/${requestId}/decision`, { decision: "decline" })}
          >
            Decline
          </Button>
        </div>
      ) : null}
      {!isMentor && state === "requested" ? (
        <Button
          variant="secondary"
          loading={busy}
          onClick={() => void post(`/api/v1/mentor-requests/${requestId}/withdraw`)}
        >
          Withdraw request
        </Button>
      ) : null}
      {state === "accepted" && conversationId ? (
        <a
          className="inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
          href={`/messages/${conversationId}`}
        >
          Open conversation
        </a>
      ) : null}
      {state === "accepted" ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!startsAt) {
              return;
            }
            void post("/api/v1/bookings", {
              kind: "mentoring",
              mentorRequestId: requestId,
              startsAt: new Date(startsAt).toISOString(),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
          }}
        >
          <label className="block space-y-2 text-sm" htmlFor="mentor-start">
            <span className="font-medium text-text">Book a 30-minute mentoring session</span>
            <input
              id="mentor-start"
              type="datetime-local"
              className="h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>
          <Button type="submit" loading={busy}>
            Book session
          </Button>
        </form>
      ) : null}
      {message ? (
        <p className="text-sm text-critical" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
