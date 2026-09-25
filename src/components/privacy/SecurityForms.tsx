"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useState } from "react";

export function SecurityForms() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          void postAdmin("/api/v1/me/password", { currentPassword, newPassword }).then(
            (result) => {
              setBusy(false);
              setMessage(result.ok ? "Password updated." : result.message);
            },
          );
        }}
      >
        <TextField
          id="current-password"
          label="Current password"
          type="password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <TextField
          id="new-password"
          label="New password"
          type="password"
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <Button type="submit" loading={busy}>
          Change password
        </Button>
      </form>
      <Button
        type="button"
        variant="secondary"
        loading={busy}
        onClick={() => {
          setBusy(true);
          void postAdmin("/api/v1/me/sessions/revoke", { scope: "others" }).then(
            (result) => {
              setBusy(false);
              setMessage(
                result.ok
                  ? "Other sessions were revoked. This device stays signed in."
                  : result.message,
              );
            },
          );
        }}
      >
        Sign out other sessions
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
