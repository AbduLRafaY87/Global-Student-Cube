"use client";

import { Button } from "@/components/ui/Button";
import { PLAYER_CONTROLS } from "@/domain/learning/learning";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface LessonPlayerProps {
  courseId: string;
  lessonId: string;
  title: string;
  body: string;
  format: string;
  mediaUrl: string;
  mediaState: string;
  captions: string;
  transcript: string;
  resumeSeconds: number;
  nextHref: string | null;
  locked: boolean;
}

export function LessonPlayer({
  courseId,
  lessonId,
  title,
  body,
  format,
  mediaUrl,
  mediaState,
  captions,
  transcript,
  resumeSeconds,
  nextHref,
  locked,
}: LessonPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mediaFailed = format === "video" && (mediaState !== "ready" || !mediaUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || resumeSeconds <= 0) {
      return;
    }
    const onLoaded = () => {
      video.currentTime = resumeSeconds;
    };
    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, [resumeSeconds, lessonId]);

  async function persist(complete: boolean, reset = false) {
    setBusy(true);
    setMessage(null);
    try {
      const position = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
      const response = await fetch("/api/v1/learning/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          position,
          complete,
          reset,
        }),
      });
      setBusy(false);
      if (!response.ok) {
        setMessage("Progress was not saved. Reconnect and try again.");
        return;
      }
      if (complete && nextHref) {
        router.push(nextHref);
        return;
      }
      router.refresh();
    } catch {
      setBusy(false);
      setMessage("You’re offline. Progress is pending sync.");
    }
  }

  if (locked) {
    return (
      <p className="text-sm text-text-muted">
        This lesson stays locked until the authored prerequisite is complete.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <span className="sr-only">Keyboard controls: {PLAYER_CONTROLS.join(", ")}</span>
      {format === "video" && !mediaFailed ? (
        <div className="aspect-video overflow-hidden rounded-[var(--radius-card)] border border-border bg-neutral-900">
          <video
            ref={videoRef}
            className="h-full w-full"
            controls
            onPause={() => void persist(false)}
          >
            <source src={mediaUrl} />
            {captions.startsWith("http") || captions.endsWith(".vtt") ? (
              <track kind="captions" srcLang="en" label="Captions" default src={captions} />
            ) : null}
          </video>
        </div>
      ) : format === "video" ? (
        <p className="text-sm text-text-muted" role="status">
          Video is unavailable. Use the transcript and retry later. Watching a video never awards
          points or a professional qualification.
        </p>
      ) : null}
      <div className="space-y-2 text-sm text-text">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p>{body}</p>
      </div>
      {transcript ? (
        <section aria-labelledby="lesson-transcript">
          <h3 id="lesson-transcript" className="text-sm font-medium text-text">
            Transcript
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-text">{transcript}</p>
        </section>
      ) : null}
      <div className="flex flex-col gap-3 min-[600px]:flex-row">
        <Button loading={busy} onClick={() => void persist(true)}>
          Mark lesson complete
        </Button>
        {nextHref ? (
          <Button variant="secondary" onClick={() => router.push(nextHref)}>
            Next
          </Button>
        ) : null}
      </div>
      {message ? (
        <p className="text-sm text-critical" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
