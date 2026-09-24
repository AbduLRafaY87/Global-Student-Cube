"use client";

import { Button } from "@/components/ui/Button";
import { recordingStatusLabel } from "@/domain/sessions/display";
import type { RecordingState } from "@/domain/sessions/consent";
import {
  LogOut,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Users,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface LiveSessionProps {
  sessionId: string;
  title: string;
  startsAt: string;
  recordingState: RecordingState;
  isHost: boolean;
}

export function LiveSession({
  sessionId,
  title,
  startsAt,
  recordingState,
  isHost,
}: LiveSessionProps) {
  const router = useRouter();
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const join = await fetch(`/api/v1/sessions/${sessionId}/join`, {
        method: "POST",
      });
      if (!join.ok) {
        setMessage("Reconnect to keep this session identity. Attendance is not reset.");
      }
      const tokenResponse = await fetch(`/api/v1/sessions/${sessionId}/join-token`, {
        method: "POST",
      });
      const body = (await tokenResponse.json()) as {
        data?: { roomUrl?: string; token?: string; provider?: string };
        error?: { message?: string };
      };
      if (!tokenResponse.ok) {
        setMessage(
          body.error?.message ??
            "The meeting is confirmed. The video link is still being prepared.",
        );
        return;
      }
      setRoomUrl(body.data?.roomUrl ?? null);
      setToken(body.data?.token ?? null);
    })();
  }, [sessionId]);

  async function leave() {
    setBusy(true);
    await fetch(`/api/v1/sessions/${sessionId}/leave`, { method: "POST" });
    router.push(`/sessions/${sessionId}`);
  }

  async function endForEveryone() {
    setBusy(true);
    await fetch(`/api/v1/sessions/${sessionId}/end`, { method: "POST" });
    router.push(`/sessions/${sessionId}`);
  }

  const frameSrc =
    roomUrl && token && !roomUrl.includes("sandbox.invalid")
      ? `${roomUrl}${roomUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(token)}`
      : null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">{title}</p>
          <p className="text-xs text-text-muted">
            {new Date(startsAt).toLocaleString()}
          </p>
        </div>
        <p className="text-xs text-text-muted">
          {recordingStatusLabel(recordingState)}
        </p>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {frameSrc ? (
            <iframe
              title="Live session"
              src={frameSrc}
              className="h-full w-full border-0"
              allow="camera; microphone; autoplay; display-capture"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center bg-neutral-900 p-6 text-center text-sm text-neutral-100">
              {message ??
                "Sandbox meeting stage. Real Daily rooms need an owner API key and a two-device test."}
            </div>
          )}
        </div>
        {chatOpen ? (
          <aside className="hidden w-80 border-l border-border bg-surface p-4 min-[900px]:block">
            <h2 className="text-sm font-semibold text-text">Chat and agenda</h2>
            <p className="mt-2 text-sm text-text-muted">
              Session chat stays on this meeting. It is not a case message thread.
            </p>
          </aside>
        ) : null}
      </div>
      <footer className="grid grid-cols-3 gap-2 border-t border-border p-3 min-[600px]:flex min-[600px]:flex-wrap min-[600px]:justify-center">
        <Button
          variant="secondary"
          className="min-w-0"
          onClick={() => setMicOn((current) => !current)}
          icon={<Mic className="size-5" aria-hidden />}
        >
          Mic {micOn ? "on" : "off"}
        </Button>
        <Button
          variant="secondary"
          className="min-w-0"
          onClick={() => setCameraOn((current) => !current)}
          icon={<Video className="size-5" aria-hidden />}
        >
          Camera {cameraOn ? "on" : "off"}
        </Button>
        <Button variant="secondary" className="min-w-0" icon={<Users className="size-5" aria-hidden />}>
          Participants
        </Button>
        <Button
          variant="secondary"
          className="min-w-0"
          onClick={() => setChatOpen((current) => !current)}
          icon={<MessageSquare className="size-5" aria-hidden />}
        >
          Chat
        </Button>
        <Button
          variant="secondary"
          className="min-w-0"
          onClick={() => setMoreOpen((current) => !current)}
          icon={<MoreHorizontal className="size-5" aria-hidden />}
        >
          More
        </Button>
        <Button
          variant="destructive"
          className="min-w-0"
          loading={busy}
          onClick={() => void leave()}
          icon={<LogOut className="size-5" aria-hidden />}
        >
          Leave
        </Button>
      </footer>
      {moreOpen ? (
        <div className="border-t border-border bg-surface p-4">
          <Button
            variant="secondary"
            onClick={() => router.push(`/sessions/${sessionId}/consent?from=live`)}
          >
            Recording request
          </Button>
          {isHost ? (
            <div className="mt-3">
              <Button
                variant="destructive"
                loading={busy}
                onClick={() => void endForEveryone()}
              >
                End for everyone
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
