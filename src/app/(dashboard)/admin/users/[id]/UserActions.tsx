"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { ACCOUNT_ROLES } from "@/domain/identity/home-role";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UserActionsProps {
  accountId: string;
  version: number;
  status: string;
}

export function UserActions({ accountId, version, status }: UserActionsProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [role, setRole] = useState<(typeof ACCOUNT_ROLES)[number]>("student");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(path: string, body: Record<string, unknown>) {
    setBusy(true);
    const result = await postAdmin(path, body, version);
    setBusy(false);
    setMessage(result.ok ? "Saved." : result.message);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <TextField
        id="user-reason"
        label="Reason"
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />

      {status === "suspended" ? (
        <Button
          loading={busy}
          onClick={() =>
            void run(`/api/v1/admin/users/${accountId}/restore`, {
              reason,
              version,
            })
          }
        >
          Restore account
        </Button>
      ) : (
        <Button
          variant="destructive"
          loading={busy}
          onClick={() =>
            void run(`/api/v1/admin/users/${accountId}/suspend`, {
              reason,
              version,
            })
          }
        >
          Suspend account
        </Button>
      )}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(`/api/v1/admin/users/${accountId}/role`, {
            role,
            reason,
            version,
          });
        }}
      >
        <SelectField
          id="user-role"
          label="Set role"
          required
          value={role}
          onChange={(event) =>
            setRole(event.target.value as (typeof ACCOUNT_ROLES)[number])
          }
          options={ACCOUNT_ROLES.map((value) => ({ value, label: value }))}
        />
        <Button type="submit" variant="secondary" loading={busy}>
          Change role
        </Button>
      </form>

      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
