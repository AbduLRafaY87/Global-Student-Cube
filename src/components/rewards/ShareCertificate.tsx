"use client";

import { Button } from "@/components/ui/Button";
import { useState } from "react";

interface ShareCertificateProps {
  issueId: string;
}

export function ShareCertificate({ issueId }: ShareCertificateProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function share() {
    const text = `Recognition document ${issueId}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Certificate", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setMessage("Issue ID copied. Sharing is deliberate and does not expose private details.");
    } catch {
      setMessage("Share was cancelled.");
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" onClick={() => void share()}>
        Share certificate
      </Button>
      {message ? <p className="text-sm text-text-muted">{message}</p> : null}
    </div>
  );
}
