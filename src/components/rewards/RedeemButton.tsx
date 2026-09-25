"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RedeemButtonProps {
  catalogCode: string;
  disabled: boolean;
}

export function RedeemButton({ catalogCode, disabled }: RedeemButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/rewards/redemptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ catalogCode }),
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
        data?: { id?: string };
      };
      setBusy(false);
      if (!response.ok) {
        setMessage(payload.error?.message ?? "That redemption was not reserved.");
        router.refresh();
        return;
      }
      router.push(`/rewards/redeem/${payload.data?.id ?? ""}`);
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  return (
    <div className="space-y-2">
      <Button disabled={disabled} loading={busy} onClick={() => void confirm()}>
        Confirm redemption
      </Button>
      {message ? (
        <p className="text-sm text-critical" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
