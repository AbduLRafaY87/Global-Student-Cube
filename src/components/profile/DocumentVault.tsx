"use client";

import { Button } from "@/components/ui/Button";
import { canPreviewFile, vaultGroup } from "@/domain/profile/files";
import { useState } from "react";

interface VaultFile {
  id: string;
  purpose: string;
  originalName: string | null;
  state: string;
  sizeBytes: number;
}

interface DocumentVaultProps {
  files: VaultFile[];
  canReadFinance: boolean;
}

const GROUPS = ["academics", "tests", "funding"] as const;

export function DocumentVault({ files, canReadFinance }: DocumentVaultProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function openFile(id: string) {
    const response = await fetch(`/api/v1/files/${id}`);
    const payload = (await response.json()) as { data?: { url?: string }; error?: { message?: string } };
    if (!response.ok || !payload.data?.url) {
      setMessage(payload.error?.message ?? "This document is not available.");
      return;
    }
    window.open(payload.data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => {
        const rows = files.filter((file) => vaultGroup(file.purpose) === group);
        return (
          <section key={group}>
            <h3 className="text-lg font-semibold text-text">
              {group === "academics" ? "Academics" : group === "tests" ? "Tests" : "Funding"}
            </h3>
            {group === "funding" && !canReadFinance ? (
              <p className="mt-2 text-sm text-text-muted">Not shared</p>
            ) : rows.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">Not provided</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {rows.map((file) => (
                  <li
                    key={file.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-text">
                        {file.originalName ?? file.purpose}
                      </p>
                      <p className="text-sm text-text-muted">
                        {file.state === "pending"
                          ? "Pending scan"
                          : file.state === "quarantined"
                            ? "Quarantined"
                            : file.state}
                      </p>
                    </div>
                    {canPreviewFile(file.state) ? (
                      <Button type="button" variant="secondary" onClick={() => void openFile(file.id)}>
                        View document
                      </Button>
                    ) : (
                      <p className="text-sm text-text-muted">Preview unavailable</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {message ? <p className="text-sm text-critical">{message}</p> : null}
    </div>
  );
}
