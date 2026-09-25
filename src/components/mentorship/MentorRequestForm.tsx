"use client";

import { Button } from "@/components/ui/Button";
import { labelForTaxonomy } from "@/domain/mentorship/taxonomy";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface MentorRequestFormProps {
  mentorId: string;
  topics: string[];
  hours: number | null;
}

export function MentorRequestForm({ mentorId, topics, hours }: MentorRequestFormProps) {
  const router = useRouter();
  const [topic, setTopic] = useState(topics[0] ?? "");
  const [purpose, setPurpose] = useState("");
  const [preference, setPreference] = useState("either");
  const [consented, setConsented] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (hours !== null && hours < 2) {
    return (
      <p className="text-sm text-text-muted">
        This mentor has no available hours. Request limits apply until availability is updated.
      </p>
    );
  }

  async function send() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/mentor-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          mentorId,
          topics: topic ? [topic] : topics.slice(0, 1),
          purpose,
          preference,
          consented,
        }),
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
        data?: { id?: string; state?: string };
      };
      setBusy(false);
      if (!response.ok) {
        setMessage(payload.error?.message ?? "That request was not sent.");
        return;
      }
      router.push(`/mentoring/requests/${payload.data?.id ?? ""}`);
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <label className="block space-y-2 text-sm" htmlFor="request-topic">
        <span className="font-medium text-text">Topic</span>
        <select
          id="request-topic"
          className="h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        >
          {topics.map((id) => (
            <option key={id} value={id}>
              {labelForTaxonomy(id)}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm" htmlFor="request-purpose">
        <span className="font-medium text-text">Short question</span>
        <textarea
          id="request-purpose"
          required
          maxLength={600}
          className="min-h-24 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
        />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Preference</legend>
        {[
          ["chat", "Chat"],
          ["session", "Session"],
          ["either", "Either"],
        ].map(([id, label]) => (
          <label key={id} className="flex min-h-12 items-center gap-2 text-sm">
            <input
              type="radio"
              name="preference"
              checked={preference === id}
              onChange={() => setPreference(id)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="flex min-h-12 items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={consented}
          onChange={(event) => setConsented(event.target.checked)}
        />
        I consent to share this brief with the mentor. Sending a request does not grant finance
        or transcript access.
      </label>
      {message ? (
        <p className="text-sm text-critical" role="alert">
          {message}
        </p>
      ) : null}
      <Button type="submit" loading={busy} disabled={!consented}>
        Send request
      </Button>
    </form>
  );
}
