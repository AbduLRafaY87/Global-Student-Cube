"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  markMessagesAsRead,
  sendMessage,
} from "@/app/(dashboard)/messages/actions";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

interface ChatWindowProps {
  currentUserId: string;
  counterpartId: string;
  counterpartName: string;
  initialMessages: Message[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toMessage(row: unknown): Message | null {
  if (!isRecord(row)) {
    return null;
  }

  if (
    typeof row.id !== "string" ||
    typeof row.sender_id !== "string" ||
    typeof row.receiver_id !== "string" ||
    typeof row.content !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    sender_id: row.sender_id,
    receiver_id: row.receiver_id,
    content: row.content,
    read: row.read === true,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

function isThreadMessage(
  message: Message,
  currentUserId: string,
  counterpartId: string,
): boolean {
  return (
    (message.sender_id === currentUserId &&
      message.receiver_id === counterpartId) ||
    (message.sender_id === counterpartId &&
      message.receiver_id === currentUserId)
  );
}

function upsertMessage(messages: Message[], incoming: Message): Message[] {
  const index = messages.findIndex((message) => message.id === incoming.id);

  if (index === -1) {
    return [...messages, incoming];
  }

  const next = [...messages];
  next[index] = incoming;
  return next;
}

function formatTimestamp(value: string): string {
  if (value.length >= 16) {
    return `${value.slice(0, 10)} ${value.slice(11, 16)}`;
  }

  return value;
}

export function ChatWindow({
  currentUserId,
  counterpartId,
  counterpartName,
  initialMessages,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [state, formAction, isPending] = useActionState(sendMessage, null);
  const listRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    void markMessagesAsRead(counterpartId);
  }, [counterpartId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${currentUserId}:${counterpartId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const message = toMessage(payload.new);

          if (!message || !isThreadMessage(message, currentUserId, counterpartId)) {
            return;
          }

          setMessages((current) => upsertMessage(current, message));

          if (message.receiver_id === currentUserId) {
            void markMessagesAsRead(counterpartId);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const message = toMessage(payload.new);

          if (!message || !isThreadMessage(message, currentUserId, counterpartId)) {
            return;
          }

          setMessages((current) => upsertMessage(current, message));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [counterpartId, currentUserId]);

  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <section className="flex min-h-[28rem] flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {counterpartName}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Messages update as they arrive. Unread incoming messages are marked
        read while this thread is open.
      </p>

      <div
        ref={listRef}
        className="mt-6 flex max-h-[24rem] min-h-[16rem] flex-1 flex-col gap-3 overflow-y-auto rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No messages yet. Send the first one.
          </p>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUserId;

            return (
              <article
                key={message.id}
                className={
                  isOwn
                    ? "ml-8 self-end rounded-2xl bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "mr-8 self-start rounded-2xl bg-white px-3 py-2 text-sm text-zinc-900 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-zinc-800"
                }
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p
                  className={
                    isOwn
                      ? "mt-1 text-xs text-zinc-300 dark:text-zinc-600"
                      : "mt-1 text-xs text-zinc-500"
                  }
                >
                  {formatTimestamp(message.created_at)}
                  {isOwn ? (message.read ? " · Read" : " · Sent") : null}
                </p>
              </article>
            );
          })
        )}
      </div>

      <form
        ref={formRef}
        className="mt-4 space-y-3"
        action={formAction}
        noValidate
      >
        <input type="hidden" name="receiver_id" value={counterpartId} />
        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Message
          </label>
          <textarea
            id="content"
            name="content"
            rows={3}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.content)}
            aria-describedby={
              state?.fieldErrors?.content ? "content-error" : undefined
            }
            className={`${inputClassName} resize-y`}
          />
          {state?.fieldErrors?.content ? (
            <p
              id="content-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.content}
            </p>
          ) : null}
        </div>
        {state?.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.fieldErrors?.receiver_id ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.fieldErrors.receiver_id}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
