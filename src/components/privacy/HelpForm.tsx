"use client";

import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CATEGORIES = [
  { value: "account", label: "Account" },
  { value: "privacy", label: "Privacy" },
  { value: "technical", label: "Technical" },
  { value: "safety", label: "Protected safety" },
  { value: "other", label: "Other" },
];

interface HelpFormProps {
  signedIn: boolean;
}

export function HelpForm({ signedIn }: HelpFormProps) {
  const router = useRouter();
  const [category, setCategory] = useState("account");
  const [description, setDescription] = useState("");
  const [replyChannel, setReplyChannel] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void fetch("/api/v1/support", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({
            category,
            description,
            replyChannel: replyChannel || undefined,
            safety: category === "safety",
            subjectId: subjectId || undefined,
          }),
        })
          .then(async (response) => {
            const payload = (await response.json()) as {
              data?: { reference?: string };
              error?: { message?: string };
            };
            setBusy(false);
            if (!response.ok) {
              setMessage(payload.error?.message ?? "The request was not sent. Your text is still here.");
              return;
            }
            setDescription("");
            setMessage(
              payload.data?.reference
                ? `Received. Reference ${payload.data.reference}.`
                : "Received.",
            );
            router.refresh();
          })
          .catch(() => {
            setBusy(false);
            setMessage("You’re offline. Reconnect to continue. Your text is still here.");
          });
      }}
    >
      <SelectField
        id="help-category"
        label="Category"
        required
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        options={CATEGORIES}
      />
      <label className="block text-sm text-text" htmlFor="help-description">
        Description
        <textarea
          id="help-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
          rows={6}
          maxLength={4000}
          className="mt-2 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
        />
      </label>
      {!signedIn ? (
        <TextField
          id="help-reply"
          label="Reply channel"
          required
          value={replyChannel}
          onChange={(event) => setReplyChannel(event.target.value)}
          hint="Email or other reply address. Required when you are not signed in."
        />
      ) : null}
      {category === "safety" ? (
        <TextField
          id="help-subject"
          label="Reported participant UUID"
          optional
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          hint="The full complaint is never forwarded to a reported counselor."
        />
      ) : null}
      <p className="text-sm text-text-muted">
        Do not upload emergency information here. This form is not an emergency
        service and does not invent a support phone number.
      </p>
      <Button type="submit" loading={busy}>
        Send request
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
