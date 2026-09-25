"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NewsActionsProps {
  id: string;
  topic: string;
  shareUrl: string;
  saved: boolean;
  liked: boolean;
  following: boolean;
  signedIn: boolean;
}

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
  return response.ok;
}

export function NewsActions({
  id,
  topic,
  shareUrl,
  saved,
  liked,
  following,
  signedIn,
}: NewsActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<boolean>, offline: string) {
    if (!signedIn) {
      setMessage("Sign in to save, like, or follow.");
      return;
    }
    setBusy(true);
    try {
      const ok = await action();
      setBusy(false);
      setMessage(ok ? null : "That action could not be saved.");
      if (ok) {
        router.refresh();
      }
    } catch {
      setBusy(false);
      setMessage(offline);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        loading={busy}
        onClick={() =>
          void run(
            () => postJson("/api/v1/news/engagement", { id, kind: "save", enabled: !saved }),
            "You’re offline. Reconnect to continue.",
          )
        }
      >
        {saved ? "Saved" : "Save"}
      </Button>
      <Button
        variant="secondary"
        loading={busy}
        onClick={() =>
          void run(
            () => postJson("/api/v1/news/engagement", { id, kind: "like", enabled: !liked }),
            "You’re offline. Reconnect to continue.",
          )
        }
      >
        {liked ? "Liked" : "Like"}
      </Button>
      <Button
        variant="secondary"
        loading={busy}
        onClick={() =>
          void run(
            () => postJson("/api/v1/news/follow", { topic, enabled: !following }),
            "You’re offline. Reconnect to continue.",
          )
        }
      >
        {following ? "Following topic" : "Follow topic"}
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          const url = `${window.location.origin}${shareUrl}`;
          void navigator.clipboard.writeText(url).then(
            () => setMessage("Published URL copied. Sharing grants no extra case access."),
            () => setMessage(url),
          );
        }}
      >
        Share
      </Button>
      {message ? (
        <p className="w-full text-sm text-text-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
