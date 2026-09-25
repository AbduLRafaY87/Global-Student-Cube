"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, controlClassName } from "@/components/ui/Field";
import { MESSAGE_BODY_MAX } from "@/domain/messaging/messaging";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

interface ThreadMessage {
  id: string;
  senderId: string;
  body: string | null;
  fileId: string | null;
  createdAt: string;
  deliveryState: string;
  removedAt: string | null;
  mine: boolean;
}

interface InviteableParent {
  accountId: string;
  kind: string;
}

interface ConversationThreadProps {
  conversationId: string;
  caseId: string | null;
  title: string;
  canSend: boolean;
  permissionBanner: string | null;
  initialMessages: ThreadMessage[];
  inviteableParents: InviteableParent[];
  peerAccountId: string | null;
}

function dateKey(value: string): string {
  return value.slice(0, 10) || "Not provided";
}

function deliveryLabel(state: string): string {
  if (state === "delivered") {
    return "Delivered";
  }
  if (state === "failed") {
    return "Failed";
  }
  return "Sent";
}

export function ConversationThread({
  conversationId,
  caseId,
  title,
  canSend,
  permissionBanner,
  initialMessages,
  inviteableParents,
  peerAccountId,
}: ConversationThreadProps) {
  const router = useRouter();
  const [liveMessages, setLiveMessages] = useState<ThreadMessage[]>([]);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(true);
  const [composerOn, setComposerOn] = useState(canSend);
  const [reportOpen, setReportOpen] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [failed, setFailed] = useState<{ clientMessageId: string; body: string } | null>(
    null,
  );
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const messages = useMemo(() => {
    const byId = new Map<string, ThreadMessage>();
    for (const message of initialMessages) {
      byId.set(message.id, message);
    }
    for (const message of liveMessages) {
      if (!byId.has(message.id)) {
        byId.set(message.id, message);
      }
    }
    return [...byId.values()].sort(
      (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
    );
  }, [initialMessages, liveMessages]);

  useEffect(() => {
    void fetch(`/api/v1/messages/conversations/${conversationId}/read`, {
      method: "POST",
    });
  }, [conversationId]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    void (async () => {
      const response = await fetch(
        `/api/v1/messages/conversations/${conversationId}/channel`,
        { method: "POST" },
      );
      if (!response.ok || cancelled) {
        setAuthorized(false);
        setComposerOn(false);
        return;
      }
      const envelope = (await response.json()) as {
        data?: { authorized?: boolean; channel?: string };
      };
      if (!envelope.data?.authorized || !envelope.data.channel) {
        setAuthorized(false);
        setComposerOn(false);
        return;
      }
      setAuthorized(true);
      setComposerOn(canSend);
      const channel = supabase
        .channel(envelope.data.channel)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const incomingId = row.id;
            if (typeof incomingId !== "string") {
              return;
            }
            const incoming: ThreadMessage = {
              id: incomingId,
              senderId: typeof row.sender_id === "string" ? row.sender_id : "",
              body: typeof row.body === "string" ? row.body : null,
              fileId: typeof row.file_id === "string" ? row.file_id : null,
              createdAt: typeof row.created_at === "string" ? row.created_at : "",
              deliveryState:
                typeof row.delivery_state === "string" ? row.delivery_state : "sent",
              removedAt: typeof row.removed_at === "string" ? row.removed_at : null,
              mine: false,
            };
            setLiveMessages((current) => {
              if (current.some((item) => item.id === incoming.id)) {
                return current;
              }
              return [...current, incoming];
            });
            void fetch(`/api/v1/messages/conversations/${conversationId}/read`, {
              method: "POST",
            });
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
        if (channel.topic.includes(conversationId)) {
          void supabase.removeChannel(channel);
        }
      }
    };
  }, [canSend, conversationId]);

  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  const grouped = useMemo(() => {
    const groups: Array<{ day: string; items: ThreadMessage[] }> = [];
    for (const message of messages) {
      const day = dateKey(message.createdAt);
      const last = groups[groups.length - 1];
      if (!last || last.day !== day) {
        groups.push({ day, items: [message] });
      } else {
        last.items.push(message);
      }
    }
    return groups;
  }, [messages]);

  async function send(text: string, fileId: string | null, clientMessageId: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/messages/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            clientMessageId,
            body: text,
            fileId,
          }),
        },
      );
      if (!response.ok) {
        setFailed({ clientMessageId, body: text });
        setError("Message failed to send. Retry sends the same message once.");
        return;
      }
      setBody("");
      setFailed(null);
      router.refresh();
    } catch {
      setFailed({ clientMessageId, body: text });
      setError("Message failed to send. Retry sends the same message once.");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!composerOn) {
      return;
    }
    await send(body, null, crypto.randomUUID());
  }

  async function onRetry() {
    if (!failed) {
      return;
    }
    await send(failed.body, null, failed.clientMessageId);
  }

  async function onAttach(file: File) {
    if (!caseId || !composerOn) {
      setError("This conversation has no case, so a file cannot be attached.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const registered = await fetch(
        `/api/v1/messages/conversations/${conversationId}/files`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sizeBytes: file.size, mime: file.type }),
        },
      );
      if (!registered.ok) {
        setError("The file could not be prepared for upload.");
        return;
      }
      const envelope = (await registered.json()) as {
        data?: { id?: string; objectKey?: string; bucket?: string };
      };
      const fileId = envelope.data?.id;
      const objectKey = envelope.data?.objectKey;
      const bucket = envelope.data?.bucket ?? "student-documents";
      if (!fileId || !objectKey) {
        setError("The file could not be prepared for upload.");
        return;
      }
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectKey, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) {
        setError("The file could not be uploaded.");
        return;
      }
      const completed = await fetch(`/api/v1/messages/files/${fileId}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ detectedMime: file.type }),
      });
      if (!completed.ok) {
        setError("The file did not pass scan.");
        return;
      }
      await send("", fileId, crypto.randomUUID());
    } finally {
      setPending(false);
    }
  }

  async function onReport() {
    const response = await fetch(
      `/api/v1/messages/conversations/${conversationId}/report`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ evidence }),
      },
    );
    if (!response.ok) {
      setError("The report could not be submitted.");
      return;
    }
    setReportOpen(false);
    setEvidence("");
  }

  async function onBlock() {
    if (!peerAccountId) {
      return;
    }
    const response = await fetch("/api/v1/messages/blocks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId: peerAccountId }),
    });
    if (!response.ok) {
      setError("The account could not be blocked.");
      return;
    }
    router.refresh();
  }

  async function onInvite(parentId: string) {
    const response = await fetch(
      `/api/v1/messages/conversations/${conversationId}/invite`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parentId }),
      },
    );
    if (!response.ok) {
      setError("That parent cannot join this thread.");
      return;
    }
    router.refresh();
  }

  async function openAttachment(fileId: string) {
    const response = await fetch(`/api/v1/messages/files/${fileId}`);
    if (!response.ok) {
      setError("This attachment is not available.");
      return;
    }
    const envelope = (await response.json()) as { data?: { url?: string } };
    if (envelope.data?.url) {
      window.open(envelope.data.url, "_blank", "noopener,noreferrer");
    }
  }

  if (!authorized) {
    return (
      <p className="text-sm text-text-muted">
        You no longer have permission to read this conversation.
      </p>
    );
  }

  return (
    <section className="flex min-h-[32rem] flex-1 flex-col">
      <header className="flex h-14 items-center justify-between gap-3 border-b border-border">
        <h1 className="truncate text-lg font-semibold text-text">{title}</h1>
        <details className="relative">
          <summary className="cursor-pointer list-none text-sm text-primary underline-offset-2 hover:underline">
            More
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-56 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-sm">
            <Button variant="secondary" className="w-full min-w-0" onClick={() => setReportOpen(true)}>
              Report
            </Button>
            <Button
              variant="destructive"
              className="mt-2 w-full min-w-0"
              onClick={() => void onBlock()}
              disabled={!peerAccountId}
            >
              Block
            </Button>
          </div>
        </details>
      </header>

      {permissionBanner ? (
        <p className="mt-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 text-sm text-text" role="status">
          {permissionBanner}
        </p>
      ) : null}

      {inviteableParents.length > 0 && composerOn ? (
        <div className="mt-3 text-sm">
          <p className="text-text-muted">Invite a linked parent. Parents are not added automatically.</p>
          <ul className="mt-2 space-y-2">
            {inviteableParents.map((parent) => (
              <li key={parent.accountId}>
                <Button
                  variant="secondary"
                  className="min-w-0"
                  onClick={() => void onInvite(parent.accountId)}
                >
                  Invite {parent.kind.replace("_", " ")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div ref={listRef} className="mt-4 flex min-h-64 flex-1 flex-col gap-4 overflow-y-auto">
        {grouped.length === 0 ? (
          <p className="text-sm text-text-muted">No messages yet.</p>
        ) : (
          grouped.map((group) => (
            <div key={group.day}>
              <p className="mb-2 text-center text-xs text-text-muted">{group.day}</p>
              <ul className="space-y-2">
                {group.items.map((message) => (
                  <li
                    key={message.id}
                    className={
                      message.mine
                        ? "ml-8 rounded-2xl bg-primary px-3 py-2 text-sm text-surface"
                        : "mr-8 rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-text"
                    }
                  >
                    {message.removedAt ? (
                      <p>This message was removed.</p>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.body ?? "Attachment"}</p>
                    )}
                    {message.fileId && !message.removedAt ? (
                      <button
                        type="button"
                        className="mt-1 underline underline-offset-2"
                        onClick={() => void openAttachment(message.fileId as string)}
                      >
                        Open attachment
                      </button>
                    ) : null}
                    <p className={message.mine ? "mt-1 text-xs text-surface/80" : "mt-1 text-xs text-text-muted"}>
                      {message.createdAt.slice(11, 16)}
                      {message.mine ? ` · ${deliveryLabel(message.deliveryState)}` : null}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {failed ? (
        <div className="mt-3">
          <Button variant="secondary" onClick={() => void onRetry()} disabled={pending}>
            Retry
          </Button>
        </div>
      ) : null}

      <form
        className="sticky bottom-0 mt-4 space-y-3 border-t border-border bg-surface pt-3"
        onSubmit={(event) => void onSubmit(event)}
      >
        <Field id="message-body" label="Message">
          <textarea
            id="message-body"
            name="body"
            rows={3}
            maxLength={MESSAGE_BODY_MAX}
            disabled={!composerOn || pending}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className={`${controlClassName(false)} resize-y`}
          />
        </Field>
        {error ? (
          <p className="text-sm text-critical" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!composerOn || pending}>
            {pending ? "Sending..." : "Send"}
          </Button>
          <Button
            variant="secondary"
            disabled={!composerOn || pending || !caseId}
            onClick={() => fileRef.current?.click()}
          >
            Attach file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void onAttach(file);
              }
              event.target.value = "";
            }}
          />
        </div>
      </form>

      <Dialog open={reportOpen} title="Report this conversation" onClose={() => setReportOpen(false)}>
        <Field id="report-evidence" label="What happened">
          <textarea
            id="report-evidence"
            rows={4}
            value={evidence}
            onChange={(event) => setEvidence(event.target.value)}
            className={`${controlClassName(false)} resize-y`}
          />
        </Field>
        <div className="mt-4">
          <Button onClick={() => void onReport()}>Submit report</Button>
        </div>
      </Dialog>
    </section>
  );
}
