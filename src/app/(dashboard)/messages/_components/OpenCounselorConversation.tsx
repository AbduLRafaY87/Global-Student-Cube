"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OpenCounselorConversation({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openThread() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/messages/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      if (!response.ok) {
        setError("The conversation could not be opened.");
        return;
      }
      const envelope = (await response.json()) as {
        data?: { conversationId?: string };
      };
      if (!envelope.data?.conversationId) {
        setError("The conversation could not be opened.");
        return;
      }
      router.push(`/messages/${envelope.data.conversationId}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button variant="secondary" disabled={pending} onClick={() => void openThread()}>
        Message student
      </Button>
      {error ? (
        <p className="mt-2 text-sm text-critical" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
