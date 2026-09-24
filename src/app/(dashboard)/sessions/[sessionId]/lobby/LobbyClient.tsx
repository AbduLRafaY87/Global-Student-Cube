"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface LobbyClientProps {
  sessionId: string;
  joinOpensAt: string;
  joinAllowed: boolean;
  countdownLabel: string;
}

export function LobbyClient({
  sessionId,
  joinOpensAt,
  joinAllowed,
  countdownLabel,
}: LobbyClientProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stream: MediaStream | undefined;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: cameraOn,
          audio: micOn,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (cameraOn) {
          setCameraDenied(true);
          setCameraOn(false);
        } else if (micOn) {
          setMicDenied(true);
          setMicOn(false);
        }
      }
    })();
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOn, micOn]);

  async function join() {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/v1/sessions/${sessionId}/join-token`, {
      method: "POST",
    });
    const body = (await response.json()) as {
      data?: { token?: string };
      error?: { message?: string };
    };
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error?.message ?? "The meeting is not ready. Retry or get help.");
      return;
    }
    router.push(`/sessions/${sessionId}/live`);
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-neutral-900">
        <video
          ref={videoRef}
          className="aspect-video h-[240px] w-full object-cover min-[900px]:h-[360px]"
          muted
          autoPlay
          playsInline
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => setMicOn((current) => !current)}
          aria-pressed={micOn}
        >
          Microphone {micOn ? "on" : "off"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setCameraOn((current) => !current)}
          aria-pressed={cameraOn}
        >
          Camera {cameraOn ? "on" : "off"}
        </Button>
      </div>
      {cameraDenied ? (
        <p className="text-sm text-text-muted">
          Camera access is denied. You can continue with audio only. Open device
          settings if you want to enable it.
        </p>
      ) : null}
      {micDenied ? (
        <p className="text-sm text-text-muted">
          Microphone access is denied. You can listen and use chat. Open device
          settings if you want to enable it.
        </p>
      ) : null}
      {!joinAllowed ? (
        <p className="text-sm text-text">
          Join opens at {new Date(joinOpensAt).toLocaleString()}. {countdownLabel}
        </p>
      ) : null}
      {message ? <p className="text-sm text-critical">{message}</p> : null}
      <Button onClick={() => void join()} disabled={!joinAllowed} loading={busy}>
        Join session
      </Button>
    </div>
  );
}
