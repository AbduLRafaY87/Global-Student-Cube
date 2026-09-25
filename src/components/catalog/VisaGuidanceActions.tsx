"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { CHECKLIST_STATUSES, VISA_DOCUMENT_LABELS, type VisaDocument } from "@/domain/catalog/guidance";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface VisaGuidanceActionsProps {
  caseId: string;
  country: string;
  documentKey: VisaDocument;
  status: string;
}

export function VisaGuidanceActions({
  caseId,
  country,
  documentKey,
  status,
}: VisaGuidanceActionsProps) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(status);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const label = VISA_DOCUMENT_LABELS[documentKey];

  return (
    <div className="space-y-3">
      <SelectField
        id={`visa-status-${documentKey}`}
        label={`${label} status`}
        value={nextStatus}
        onChange={(event) => setNextStatus(event.target.value)}
        options={CHECKLIST_STATUSES.map((value) => ({ value, label: value.replaceAll("_", " ") }))}
      />
      <div className="flex flex-col gap-2 min-[600px]:flex-row">
        <Button
          type="button"
          loading={busy}
          onClick={() => {
            setBusy(true);
            void postAdmin(`/api/v1/cases/${caseId}/visa`, {
              country,
              documentKey,
              status: nextStatus,
            }).then((result) => {
              setBusy(false);
              setMessage(result.ok ? "Checklist saved." : result.message);
              if (result.ok) {
                router.refresh();
              }
            });
          }}
        >
          Save status
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={busy}
          onClick={() => {
            setBusy(true);
            void postAdmin(`/api/v1/cases/${caseId}/visa`, {
              action: "roadmap",
              title: `Visa: ${label}`,
            }).then((result) => {
              setBusy(false);
              setMessage(
                result.ok ? "Added to the follow-up roadmap without duplicating." : result.message,
              );
              if (result.ok) {
                router.refresh();
              }
            });
          }}
        >
          Add requirement to roadmap
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
