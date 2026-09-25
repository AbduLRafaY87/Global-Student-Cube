import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { THREAD_PAGE_SIZE } from "@/domain/messaging/messaging";
import { loadMessageThread } from "@/server/modules/messaging/load";
import Link from "next/link";
import type { Metadata } from "next";
import { ConversationThread } from "../_components/ConversationThread";

export const metadata: Metadata = { title: "Conversation" };

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

function asMessages(value: unknown): ThreadMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((row) => {
    if (typeof row !== "object" || row === null) {
      return [];
    }
    const item = row as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.senderId !== "string") {
      return [];
    }
    return [
      {
        id: item.id,
        senderId: item.senderId,
        body: typeof item.body === "string" ? item.body : null,
        fileId: typeof item.fileId === "string" ? item.fileId : null,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
        deliveryState: typeof item.deliveryState === "string" ? item.deliveryState : "sent",
        removedAt: typeof item.removedAt === "string" ? item.removedAt : null,
        mine: item.mine === true,
      },
    ];
  });
}

function asParents(value: unknown): InviteableParent[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((row) => {
    if (typeof row !== "object" || row === null) {
      return [];
    }
    const item = row as Record<string, unknown>;
    if (typeof item.accountId !== "string") {
      return [];
    }
    return [
      {
        accountId: item.accountId,
        kind: typeof item.kind === "string" ? item.kind : "adult_authorized",
      },
    ];
  });
}

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = await params;
  const result = await loadMessageThread(conversationId, null, THREAD_PAGE_SIZE);

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {result.forbidden ? (
          <ForbiddenState message="This conversation is not available." />
        ) : (
          <ErrorState />
        )}
      </div>
    );
  }

  const data = result.data;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <Link href="/messages" className="mb-3 text-sm text-primary underline-offset-2 hover:underline">
        Back to inbox
      </Link>
      <ConversationThread
        conversationId={conversationId}
        caseId={typeof data.caseId === "string" ? data.caseId : null}
        title={typeof data.title === "string" ? data.title : "Conversation"}
        canSend={data.canSend === true}
        permissionBanner={typeof data.permissionBanner === "string" ? data.permissionBanner : null}
        initialMessages={asMessages(data.messages)}
        inviteableParents={asParents(data.inviteableParents)}
        peerAccountId={typeof data.peerAccountId === "string" ? data.peerAccountId : null}
      />
    </div>
  );
}
