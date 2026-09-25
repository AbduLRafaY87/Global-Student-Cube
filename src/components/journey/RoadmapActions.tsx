"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RoadmapActionsProps {
  caseId: string;
  programId: string;
}

export function RoadmapActions({ caseId, programId }: RoadmapActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        loading={busy}
        onClick={() => {
          setBusy(true);
          void postAdmin(`/api/v1/cases/${caseId}/roadmap`, { programId }).then((result) => {
            setBusy(false);
            setMessage(
              result.ok
                ? "Target confirmed. Draft roadmap rebuilt. Previous tasks are kept."
                : result.message,
            );
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        Choose this target
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
