"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PARENT_SCOPE_GROUPS } from "@/domain/parent/access";
import { useState } from "react";

interface InviteParentFormProps {
  caseId: string;
}

export function InviteParentForm({ caseId }: InviteParentFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [scopes, setScopes] = useState<string[]>(["profile.read"]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(scope: string) {
    setScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope],
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setMessage(null);
        void fetch(`/api/v1/cases/${caseId}/parent-links`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({ identifier, scopes }),
        })
          .then(async (response) => {
            const payload = (await response.json()) as { error?: { message?: string } };
            setBusy(false);
            setMessage(
              response.ok
                ? "Invitation sent. Matching is never automatic from a surname."
                : (payload.error?.message ?? "Invitation was not sent."),
            );
            if (response.ok) {
              setIdentifier("");
            }
          })
          .catch(() => {
            setBusy(false);
            setMessage("You’re offline. Reconnect to continue.");
          });
      }}
    >
      <TextField
        id="parent-identifier"
        label="Email or GSC ID"
        hint="Invite a verified account by email or GSC ID. This does not search by name."
        required
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
      />
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text">Permissions</legend>
        {PARENT_SCOPE_GROUPS.map((group) => (
          <div key={group.id} className="space-y-2">
            <p className="text-sm font-medium text-text">{group.label}</p>
            {group.scopes.map((scope) => (
              <label key={scope} className="flex min-h-12 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={scopes.includes(scope)}
                  onChange={() => toggle(scope)}
                />
                {scope}
              </label>
            ))}
          </div>
        ))}
      </fieldset>
      <Button type="submit" loading={busy} disabled={scopes.length === 0}>
        Send invitation
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
