"use client";

import { Button } from "@/components/ui/Button";
import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BookmarkScholarshipButtonProps {
  caseId: string | null;
  scholarshipId: string;
  canWrite: boolean;
  alreadyBookmarked: boolean;
}

export function BookmarkScholarshipButton({
  caseId,
  scholarshipId,
  canWrite,
  alreadyBookmarked,
}: BookmarkScholarshipButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function bookmark() {
    if (!caseId || !canWrite || alreadyBookmarked) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/cases/${caseId}/scholarships/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scholarshipId }),
      });
      const payload = (await response.json()) as {
        data?: { addedFunding?: boolean };
        error?: { message?: string };
      };
      setBusy(false);
      if (!response.ok) {
        setMessage(payload.error?.message ?? "Could not save this scholarship.");
        return;
      }
      if (payload.data?.addedFunding) {
        setMessage("Bookmark saved. Funding was not added to savings.");
      }
      router.refresh();
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  if (!caseId) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={!canWrite || alreadyBookmarked}
        loading={busy}
        icon={<Bookmark className="size-4" aria-hidden />}
        onClick={() => void bookmark()}
      >
        {alreadyBookmarked ? "Saved for guidance" : "Save for guidance"}
      </Button>
      <p className="text-sm text-text-muted">
        Saving does not add funding to savings or a budget.
      </p>
      {message ? <p className="text-sm text-text-muted">{message}</p> : null}
    </div>
  );
}
