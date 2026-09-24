"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  CATALOG_PUBLICATION_STATES,
  canTransitionCatalogState,
  type CatalogEntityType,
  type CatalogPublicationState,
} from "@/domain/catalog/catalog";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface CatalogPublishFormProps {
  entityType: CatalogEntityType;
  entityId: string;
  currentState: string;
}

export function CatalogPublishForm({
  entityType,
  entityId,
  currentState,
}: CatalogPublishFormProps) {
  const router = useRouter();
  const [nextState, setNextState] = useState<CatalogPublicationState>("in_review");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const options = useMemo(
    () =>
      CATALOG_PUBLICATION_STATES.filter((state) =>
        canTransitionCatalogState(currentState as CatalogPublicationState, state),
      ).map((state) => ({ value: state, label: state })),
    [currentState],
  );

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void postAdmin("/api/v1/admin/catalog/publish", {
          entityType,
          entityId,
          nextState,
          reason,
        }).then((result) => {
          setBusy(false);
          setMessage(
            result.ok
              ? nextState === "published"
                ? "Published. Public views update only after provenance is complete."
                : nextState === "withdrawn"
                  ? "Withdrawn. History is kept; the row is hidden from public views."
                  : "Saved."
              : result.message,
          );
          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <h2 className="text-lg font-semibold text-text">Publication</h2>
      <p className="text-sm text-text-muted">
        Publish requires a reviewer on every field and a next-review date. Imports
        never auto-publish. Withdraw keeps history.
      </p>
      <p className="text-sm text-text">Current state: {currentState}</p>
      <SelectField
        id={`${entityType}-next-state`}
        label="Next state"
        required
        value={nextState}
        onChange={(event) =>
          setNextState(event.target.value as CatalogPublicationState)
        }
        options={options.length > 0 ? options : [{ value: nextState, label: nextState }]}
      />
      <TextField
        id={`${entityType}-publish-reason`}
        label="Reason"
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button type="submit" loading={busy} disabled={options.length === 0}>
        Apply publication state
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
