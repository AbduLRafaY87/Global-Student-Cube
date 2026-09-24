"use client";

import { Button } from "@/components/ui/Button";
import { PARENT_SCOPE_GROUPS } from "@/domain/parent/access";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FamilyLinkActionsProps {
  linkId: string;
  currentScopes: string[];
  canEditScopes: boolean;
  canRevoke: boolean;
}

export function FamilyLinkActions({
  linkId,
  currentScopes,
  canEditScopes,
  canRevoke,
}: FamilyLinkActionsProps) {
  const router = useRouter();
  const [scopes, setScopes] = useState(currentScopes);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      {canEditScopes ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-text">Replace permissions</legend>
          {PARENT_SCOPE_GROUPS.map((group) => (
            <div key={group.id} className="space-y-2">
              <p className="text-sm font-medium text-text">{group.label}</p>
              {group.scopes.map((scope) => (
                <label key={scope} className="flex min-h-12 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={() =>
                      setScopes((current) =>
                        current.includes(scope)
                          ? current.filter((item) => item !== scope)
                          : [...current, scope],
                      )
                    }
                  />
                  {scope}
                </label>
              ))}
            </div>
          ))}
          <Button
            type="button"
            loading={busy}
            disabled={scopes.length === 0}
            onClick={() => void post(`/api/v1/parent-links/${linkId}/scopes`, { scopes })}
          >
            Update permissions
          </Button>
        </fieldset>
      ) : null}
      {canRevoke ? (
        <Button
          type="button"
          variant="destructive"
          loading={busy}
          onClick={() => {
            if (window.confirm("Revoke this access immediately?")) {
              void post(`/api/v1/parent-links/${linkId}/revoke`);
            }
          }}
        >
          Revoke access
        </Button>
      ) : null}
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
