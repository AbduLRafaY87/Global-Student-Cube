"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SaveResourceButton({ id }: { id: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/learning/library/${id}/save`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      setBusy(false);
      if (!response.ok) {
        setMessage("That resource was not saved.");
        return;
      }
      router.refresh();
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" loading={busy} onClick={() => void save()}>
        Save to my library
      </Button>
      {message ? (
        <p className="text-sm text-critical" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
