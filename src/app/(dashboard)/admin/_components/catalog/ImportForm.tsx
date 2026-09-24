"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { IMPORT_REQUIRED_COLUMNS } from "@/domain/catalog/ingestion";
import { useState } from "react";

interface ImportPreviewRow {
  index: number;
  accepted: boolean;
  reason: string | null;
}

interface ImportResult {
  dryRun: boolean;
  accepted: number;
  rejected: number;
  published: boolean;
  preview: ImportPreviewRow[];
}

export function ImportForm() {
  const [kind, setKind] = useState<"csv" | "json">("csv");
  const [payload, setPayload] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        const body: Record<string, unknown> = { kind, dryRun, reason };
        if (kind === "csv") {
          body.csv = payload;
        } else {
          try {
            body.rows = JSON.parse(payload) as unknown[];
          } catch {
            setBusy(false);
            setMessage("JSON is not valid.");
            return;
          }
        }
        void postAdmin<ImportResult>("/api/v1/admin/catalog/import", body).then((response) => {
          setBusy(false);
          setMessage(response.ok ? "Dry-run or apply finished. Nothing was auto-published." : response.message);
          setResult(response.data ?? null);
        });
      }}
    >
      <h2 className="text-lg font-semibold text-text">CSV / JSON import</h2>
      <p className="text-sm text-text-muted">
        Required provenance columns: {IMPORT_REQUIRED_COLUMNS.join(", ")}. Rows
        missing a source are rejected, not guessed. Default is dry-run.
      </p>
      <SelectField
        id="import-kind"
        label="Format"
        required
        value={kind}
        onChange={(event) => setKind(event.target.value as "csv" | "json")}
        options={[
          { value: "csv", label: "CSV" },
          { value: "json", label: "JSON" },
        ]}
      />
      <label className="flex flex-col text-sm text-text" htmlFor="import-payload">
        File contents
        <textarea
          id="import-payload"
          required
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          className="mt-2 min-h-40 w-full rounded-[var(--radius-control)] border border-control-border bg-surface p-3"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={dryRun}
          onChange={(event) => setDryRun(event.target.checked)}
        />
        Dry-run (recommended)
      </label>
      <TextField
        id="import-reason"
        label="Reason"
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button type="submit" loading={busy}>
        {dryRun ? "Run dry-run report" : "Apply sourced rows"}
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
      {result ? (
        <div className="space-y-2 text-sm text-text">
          <p>
            Accepted {result.accepted}, rejected {result.rejected}. Published:{" "}
            {result.published ? "yes" : "no"}.
          </p>
          <ul className="grid gap-2">
            {result.preview.map((row) => (
              <li key={row.index}>
                Row {row.index + 1}: {row.accepted ? "accepted" : row.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
