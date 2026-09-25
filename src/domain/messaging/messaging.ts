export const MESSAGE_BODY_MAX = 4000;
export const SENDS_PER_MINUTE = 30;
export const INBOX_PAGE_SIZE = 20;
export const THREAD_PAGE_SIZE = 50;

export const CONVERSATION_KINDS = ["counselor", "parent", "mentor"] as const;
export type ConversationKind = (typeof CONVERSATION_KINDS)[number];

export const DELIVERY_STATES = ["sent", "delivered", "failed"] as const;
export type DeliveryState = (typeof DELIVERY_STATES)[number];

export const GSC_ID_QUERY = /^GSC-[A-Z0-9]+$/i;

export interface RealtimeChannelDecision {
  authorized: boolean;
  channel: string;
}

export interface LeftoverMessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface MigratedMessageDraft {
  id: string;
  senderId: string;
  counterpartId: string;
  body: string;
  clientMessageId: string;
  createdAt: string;
  wasRead: boolean;
}

export interface HomeMessageItem {
  conversationId: string;
  preview: string;
  href: string;
}

export function conversationChannelName(conversationId: string): string {
  return `conversation:${conversationId}`;
}

export function inboxChannelName(accountId: string): string {
  return `inbox:${accountId}`;
}

export function authorizeRealtimeChannel(input: {
  accountId: string;
  conversationId: string;
  memberAccountId: string | null;
  leftAt: string | null;
  relationshipValid: boolean;
  grantRevoked: boolean;
  blocked: boolean;
}): RealtimeChannelDecision {
  const channel = conversationChannelName(input.conversationId);
  const authorized =
    input.memberAccountId === input.accountId &&
    input.leftAt === null &&
    input.relationshipValid &&
    !input.grantRevoked &&
    !input.blocked;
  return { authorized, channel };
}

export function authorizeInboxChannel(input: {
  accountId: string;
  requesterId: string;
}): RealtimeChannelDecision {
  return {
    authorized: input.accountId === input.requesterId && input.accountId !== "",
    channel: inboxChannelName(input.accountId),
  };
}

export function canReadConversation(input: {
  memberAccountId: string | null;
  leftAt: string | null;
  relationshipValid: boolean;
  grantRevoked: boolean;
}): boolean {
  return (
    input.memberAccountId !== null &&
    input.leftAt === null &&
    input.relationshipValid &&
    !input.grantRevoked
  );
}

export function canSendMessage(input: {
  canRead: boolean;
  canSendFlag: boolean;
  closedAt: string | null;
  blocked: boolean;
  senderApproved: boolean;
}): boolean {
  return (
    input.canRead &&
    input.canSendFlag &&
    input.closedAt === null &&
    !input.blocked &&
    input.senderApproved
  );
}

export function canDeliverToMember(input: {
  leftAt: string | null;
  grantRevoked: boolean;
  blocked: boolean;
  relationshipValid: boolean;
}): boolean {
  return (
    input.leftAt === null &&
    input.relationshipValid &&
    !input.grantRevoked &&
    !input.blocked
  );
}

export function parentMayJoinThread(input: {
  invited: boolean;
  parentLinkActive: boolean;
  parentLinkKind: string;
  studentAgeYears: number | null;
}): boolean {
  if (!input.invited || !input.parentLinkActive) {
    return false;
  }
  if (input.studentAgeYears !== null && input.studentAgeYears < 18) {
    return input.parentLinkKind === "verified_guardian";
  }
  return (
    input.parentLinkKind === "adult_authorized" ||
    input.parentLinkKind === "verified_guardian"
  );
}

export function validateMessageBody(
  body: string,
  fileId: string | null,
): { ok: true } | { ok: false; code: "EMPTY" | "TOO_LONG" } {
  const trimmed = body.trim();
  if (trimmed.length > MESSAGE_BODY_MAX) {
    return { ok: false, code: "TOO_LONG" };
  }
  if (trimmed.length === 0 && !fileId) {
    return { ok: false, code: "EMPTY" };
  }
  return { ok: true };
}

export function rateLimitExceeded(sendsInLastMinute: number): boolean {
  return sendsInLastMinute >= SENDS_PER_MINUTE;
}

export function unreadCount(
  messages: ReadonlyArray<{
    senderId: string;
    createdAt: string;
    removedAt: string | null;
  }>,
  accountId: string,
  lastReadAt: string | null,
): number {
  return messages.filter((message) => {
    if (message.removedAt !== null || message.senderId === accountId) {
      return false;
    }
    if (lastReadAt === null) {
      return true;
    }
    return Date.parse(message.createdAt) > Date.parse(lastReadAt);
  }).length;
}

export function shouldNotifyNewMessage(preferences: {
  inApp?: boolean | null;
  email?: boolean | null;
} | null): { inApp: boolean; email: boolean } {
  return {
    inApp: preferences?.inApp !== false,
    email: preferences?.email === true,
  };
}

export function mapLeftoverMessage(row: LeftoverMessageRow): MigratedMessageDraft {
  return {
    id: row.id,
    senderId: row.sender_id,
    counterpartId: row.receiver_id,
    body: row.content,
    clientMessageId: row.id,
    createdAt: row.created_at,
    wasRead: row.read === true,
  };
}

export function leftoverPairKey(senderId: string, receiverId: string): string {
  return senderId < receiverId ? `${senderId}:${receiverId}` : `${receiverId}:${senderId}`;
}

export function isGscIdQuery(query: string): boolean {
  return GSC_ID_QUERY.test(query.trim());
}

export function permittedSearchHits<T>(
  query: string,
  permitted: readonly T[],
): readonly T[] {
  return permitted;
}

export function searchHidesUnrelatedIdentity(
  query: string,
  permittedHitCount: number,
): boolean {
  return isGscIdQuery(query) && permittedHitCount === 0;
}

export function financialAttachmentAllowed(input: {
  filePurpose: string | null;
  hasFinanceScope: boolean;
}): boolean {
  if (input.filePurpose !== "financial_proof" && input.filePurpose !== "award_evidence") {
    return true;
  }
  return input.hasFinanceScope;
}

export function composerEnabled(canSend: boolean): boolean {
  return canSend;
}

export function unansweredCounselorPreview(
  items: readonly HomeMessageItem[],
): { empty: boolean; items: HomeMessageItem[]; emptyMessage: string } {
  return {
    empty: items.length === 0,
    items: [...items],
    emptyMessage: "No unanswered counselor messages.",
  };
}
