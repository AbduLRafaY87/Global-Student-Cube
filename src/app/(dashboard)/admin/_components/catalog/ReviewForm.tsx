"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { asJsonText } from "@/app/(dashboard)/admin/_components/catalog/display";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { CatalogIngestionDetail } from "@/server/modules/catalog/commands";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ReviewFormProps {
  jobId: string;
  fields: CatalogIngestionDetail["fields"];
  entityType: string;
  entityId: string | null;
}

export function ReviewForm({ jobId, fields, entityType, entityId }: ReviewFormProps) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, "accepted" | "rejected">>(
    Object.fromEntries(
      fields
        .filter((field) => field.decision === "pending")
        .map((field) => [field.field_path, "accepted" as const]),
    ),
  );
  const [nextReviewAt, setNextReviewAt] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setDecision(path: string, decision: "accepted" | "rejected") {
    setDecisions((current) => ({ ...current, [path]: decision }));
  }

  return (
    <div className="space-y-6">
      <ul className="grid gap-4">
        {fields.map((field) => (
          <li
            key={field.id}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
          >
            <p className="text-sm font-medium text-text">{field.field_path}</p>
            <div className="mt-3 grid gap-3 min-[900px]:grid-cols-[1fr_1fr_minmax(12rem,auto)]">
              <div>
                <p className="text-xs text-text-muted">Current</p>
                <p className="mt-1 text-sm text-text">{asJsonText(field.current_value)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Proposed</p>
                <p className="mt-1 text-sm text-text">{asJsonText(field.proposed_value)}</p>
              </div>
              {field.decision === "pending" ? (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant={decisions[field.field_path] === "accepted" ? "primary" : "secondary"}
                    aria-label={`Accept ${field.field_path}`}
                    onClick={() => setDecision(field.field_path, "accepted")}
                  >
                    Accept {field.field_path}
                  </Button>
                  <Button
                    type="button"
                    variant={decisions[field.field_path] === "rejected" ? "destructive" : "secondary"}
                    aria-label={`Reject ${field.field_path}`}
                    onClick={() => setDecision(field.field_path, "rejected")}
                  >
                    Reject {field.field_path}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-text-muted">Already {field.decision}</p>
              )}
            </div>
            <p className="mt-3 text-xs text-text-muted">
              Excerpt: {field.excerpt ?? "Not provided"}
            </p>
          </li>
        ))}
      </ul>

      <form
        className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          void postAdmin(`/api/v1/admin/catalog/ingestion/${jobId}/review`, {
            decisions: Object.entries(decisions).map(([fieldPath, decision]) => ({
              fieldPath,
              decision,
            })),
            nextReviewAt: nextReviewAt || undefined,
            reason,
          }).then((result) => {
            setBusy(false);
            setMessage(
              result.ok
                ? "Review saved as draft. Extraction never auto-publishes."
                : result.message,
            );
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        <TextField
          id="review-next"
          label="Next review date"
          type="date"
          required
          value={nextReviewAt}
          onChange={(event) => setNextReviewAt(event.target.value)}
        />
        <TextField
          id="review-reason"
          label="Reason"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="flex flex-col gap-3 min-[720px]:flex-row">
          <Button type="submit" loading={busy}>
            Approve selected changes
          </Button>
          <Button
            type="button"
            variant="destructive"
            loading={busy}
            onClick={() => {
              setBusy(true);
              void postAdmin(`/api/v1/admin/catalog/ingestion/${jobId}/reject`, {
                reason,
              }).then((result) => {
                setBusy(false);
                setMessage(result.ok ? "Extraction rejected. Live values unchanged." : result.message);
                if (result.ok) {
                  router.refresh();
                }
              });
            }}
          >
            Reject extraction
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (entityType === "program" && entityId) {
                router.push(`/admin/programs/${entityId}`);
                return;
              }
              if (entityType === "scholarship" && entityId) {
                router.push(`/admin/scholarships/${entityId}`);
                return;
              }
              router.push(entityId ? `/admin/universities/${entityId}` : "/admin/universities/new");
            }}
          >
            Edit manually
          </Button>
        </div>
      </form>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
