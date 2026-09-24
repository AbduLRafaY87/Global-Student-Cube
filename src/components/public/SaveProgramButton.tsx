"use client";

import { Button } from "@/components/ui/Button";
import { saveControlState } from "@/domain/shortlist/shortlist";
import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SaveProgramButtonProps {
  universityId?: string;
  programId?: string;
  caseId?: string | null;
  module3Completed?: boolean;
  alreadySaved?: boolean;
  savedCount?: number;
  canWrite?: boolean;
}

export function SaveProgramButton({
  universityId,
  programId,
  caseId = null,
  module3Completed = false,
  alreadySaved = false,
  savedCount = 0,
  canWrite = false,
}: SaveProgramButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const control = saveControlState({
    signedIn: Boolean(caseId),
    module3Completed,
    canWrite,
    savedCount,
    alreadySaved,
  });

  async function save() {
    if (!caseId || !universityId || !programId || !control.enabled) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/cases/${caseId}/shortlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universityId, programId }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      setBusy(false);
      if (response.ok) {
        router.refresh();
        router.push(`/cases/${caseId}/shortlist`);
        return;
      }
      setMessage(payload.error?.message ?? "Remove a saved program first.");
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={!control.enabled || !universityId || !programId}
        loading={busy}
        icon={<Bookmark className="size-4" aria-hidden />}
        onClick={() => void save()}
      >
        {alreadySaved ? "Saved combination" : "Save combination"}
      </Button>
      {control.reason ? <span className="sr-only">{control.reason}</span> : null}
      {message || (!control.enabled && control.reason) ? (
        <p className="text-sm text-text-muted">{message ?? control.reason}</p>
      ) : null}
    </div>
  );
}
