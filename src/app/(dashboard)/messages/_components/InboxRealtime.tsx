"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function InboxRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channelName: string | null = null;

    void (async () => {
      const response = await fetch("/api/v1/messages/inbox/channel", { method: "POST" });
      if (!response.ok || cancelled) {
        return;
      }
      const envelope = (await response.json()) as {
        data?: { authorized?: boolean; channel?: string };
      };
      if (!envelope.data?.authorized || !envelope.data.channel) {
        return;
      }
      channelName = envelope.data.channel;
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          () => {
            router.refresh();
          },
        )
        .subscribe();

      if (cancelled) {
        void supabase.removeChannel(channel);
      }
    })();

    return () => {
      cancelled = true;
      for (const channel of supabase.getChannels()) {
        if (channelName && channel.topic.includes(channelName)) {
          void supabase.removeChannel(channel);
        }
      }
    };
  }, [router]);

  return null;
}
