import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { TextField } from "@/components/ui/TextField";
import { INBOX_PAGE_SIZE } from "@/domain/messaging/messaging";
import { loadMessageInbox } from "@/server/modules/messaging/load";
import Link from "next/link";
import type { Metadata } from "next";
import { InboxRealtime } from "./_components/InboxRealtime";

export const metadata: Metadata = { title: "Messages" };

interface InboxItem {
  conversationId: string;
  caseId: string | null;
  kind: string;
  title: string;
  gscId: string | null;
  lastPreview: string;
  lastAt: string;
  unreadCount: number;
  canSend: boolean;
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function asInboxItems(value: unknown): InboxItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((row) => {
    if (typeof row !== "object" || row === null) {
      return [];
    }
    const item = row as Record<string, unknown>;
    if (typeof item.conversationId !== "string") {
      return [];
    }
    return [
      {
        conversationId: item.conversationId,
        caseId: typeof item.caseId === "string" ? item.caseId : null,
        kind: typeof item.kind === "string" ? item.kind : "counselor",
        title: typeof item.title === "string" ? item.title : "Conversation",
        gscId: typeof item.gscId === "string" ? item.gscId : null,
        lastPreview: typeof item.lastPreview === "string" ? item.lastPreview : "Not provided",
        lastAt: typeof item.lastAt === "string" ? item.lastAt : "",
        unreadCount: typeof item.unreadCount === "number" ? item.unreadCount : 0,
        canSend: item.canSend === true,
      },
    ];
  });
}

export default async function MessagesInboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = firstParam(params.q);
  const caseId = firstParam(params.caseId) || null;
  const unreadOnly = firstParam(params.unread) === "1";
  const cursor = firstParam(params.cursor) || null;
  const result = await loadMessageInbox({
    caseId,
    query,
    unreadOnly,
    cursor,
    limit: INBOX_PAGE_SIZE,
  });

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {result.forbidden ? (
          <ForbiddenState message="You can only open conversations you are permitted to read." />
        ) : (
          <ErrorState />
        )}
      </div>
    );
  }

  const items = asInboxItems(result.data.items);
  const lastAt = items[items.length - 1]?.lastAt ?? "";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <InboxRealtime />
      <header>
        <h1 className="text-2xl font-semibold text-text">Messages</h1>
        <p className="mt-2 text-sm text-text-muted">
          Conversations are scoped to a case. New counselor threads start from the caseload.
        </p>
      </header>

      <form className="grid gap-3 min-[640px]:grid-cols-[1fr_auto_auto]" method="get">
        <TextField
          id="q"
          name="q"
          label="Search"
          defaultValue={query}
          hint="Search only conversations you may read. An unrelated GSC ID returns nothing."
        />
        {caseId ? <input type="hidden" name="caseId" value={caseId} /> : null}
        <label className="flex h-12 items-end gap-2 text-sm text-text">
          <input type="checkbox" name="unread" value="1" defaultChecked={unreadOnly} />
          Unread only
        </label>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
        >
          Filter
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No conversations"
          message="You will see threads here after a counselor, parent, or mentor connection exists. Searching an unrelated GSC ID does not reveal whether that person exists."
        />
      ) : (
        <ul className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface">
          {items.map((item) => (
            <li key={item.conversationId}>
              <Link
                href={`/messages/${item.conversationId}`}
                className="flex min-h-[4.5rem] flex-col justify-center px-4 py-3 hover:bg-neutral-100"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium text-text">{item.title}</span>
                  {item.unreadCount > 0 ? (
                    <span className="text-sm text-primary">{item.unreadCount} unread</span>
                  ) : null}
                </span>
                <span className="truncate text-sm text-text-muted">{item.lastPreview}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {items.length >= INBOX_PAGE_SIZE && lastAt ? (
        <Link
          href={{
            pathname: "/messages",
            query: {
              ...(query ? { q: query } : {}),
              ...(caseId ? { caseId } : {}),
              ...(unreadOnly ? { unread: "1" } : {}),
              cursor: lastAt,
            },
          }}
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          Load more
        </Link>
      ) : null}
    </div>
  );
}
