"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveProfileSection } from "./profile-api";

interface CompleteProfileActionsProps {
  caseId: string;
  complete: boolean;
  firstHref: string;
  canWrite: boolean;
}

export function CompleteProfileActions({
  caseId,
  complete,
  firstHref,
  canWrite,
}: CompleteProfileActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (complete) {
    return (
      <Button onClick={() => router.push("/explore/universities?view=recommendations")}>
        Explore personalized matches
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {canWrite ? (
        <Button
          loading={busy}
          onClick={() => {
            setBusy(true);
            void saveProfileSection(
              `/api/v1/cases/${caseId}/profile/complete`,
              {},
              "POST",
            ).then((result) => {
              setBusy(false);
              setMessage(result.ok ? "Profile marked complete." : result.message);
              if (result.ok) {
                router.refresh();
              }
            });
          }}
        >
          Mark academic profile complete
        </Button>
      ) : null}
      <Button variant="secondary" onClick={() => router.push(firstHref)}>
        Finish required details
      </Button>
      {message ? <p className="text-sm text-text-muted">{message}</p> : null}
    </div>
  );
}
