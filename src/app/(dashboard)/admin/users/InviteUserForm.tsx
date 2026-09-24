"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { INVITABLE_ROLES } from "@/domain/identity/invitations";
import { useState } from "react";

export function InviteUserForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof INVITABLE_ROLES)[number]>("counselor");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void postAdmin("/api/v1/invitations", { email, role, scopes: [] }).then(
          (result) => {
            setBusy(false);
            setMessage(result.ok ? "Invitation sent." : result.message);
          },
        );
      }}
    >
      <h2 className="text-lg font-semibold text-text">Invite staff or parent</h2>
      <TextField
        id="invite-email"
        label="Email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <SelectField
        id="invite-role"
        label="Role"
        required
        value={role}
        onChange={(event) =>
          setRole(event.target.value as (typeof INVITABLE_ROLES)[number])
        }
        options={INVITABLE_ROLES.map((value) => ({ value, label: value }))}
      />
      <Button type="submit" loading={busy}>
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
