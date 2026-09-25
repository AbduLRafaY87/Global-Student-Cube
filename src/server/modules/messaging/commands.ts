import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

interface PayloadRow<T> {
  payload: T;
}

export async function messageInboxSql(
  context: RequestContext,
  input: {
    caseId: string | null;
    query: string;
    unreadOnly: boolean;
    cursor: string | null;
    limit: number;
  },
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.message_inbox($1::uuid, $2, $3, $4::timestamptz, $5) AS payload`,
    [input.caseId, input.query, input.unreadOnly, input.cursor, input.limit],
  );
  return row.payload;
}

export async function messageThreadSql(
  context: RequestContext,
  conversationId: string,
  before: string | null,
  limit: number,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.message_thread($1::uuid, $2::timestamptz, $3) AS payload`,
    [conversationId, before, limit],
  );
  return row.payload;
}

export async function openCounselorConversationSql(
  context: RequestContext,
  caseId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.open_counselor_conversation($1::uuid) AS payload`,
    [caseId],
  );
  return row.payload;
}

export async function sendMessageSql(
  context: RequestContext,
  input: {
    conversationId: string;
    clientMessageId: string;
    body: string;
    fileId: string | null;
  },
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.send_message($1::uuid, $2::uuid, $3, $4::uuid) AS payload`,
    [input.conversationId, input.clientMessageId, input.body, input.fileId],
  );
  return row.payload;
}

export async function markConversationReadSql(
  context: RequestContext,
  conversationId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.mark_conversation_read($1::uuid) AS payload`,
    [conversationId],
  );
  return row.payload;
}

export async function authorizeMessageChannelSql(
  context: RequestContext,
  conversationId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.authorize_message_channel($1::uuid) AS payload`,
    [conversationId],
  );
  return row.payload;
}

export async function authorizeInboxChannelSql(
  context: RequestContext,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.authorize_inbox_channel() AS payload`,
  );
  return row.payload;
}

export async function reportConversationSql(
  context: RequestContext,
  input: { conversationId: string; messageId: string | null; evidence: string },
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.report_conversation($1::uuid, $2::uuid, $3) AS payload`,
    [input.conversationId, input.messageId, input.evidence],
  );
  return row.payload;
}

export async function blockAccountSql(
  context: RequestContext,
  blockedId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.block_account($1::uuid) AS payload`,
    [blockedId],
  );
  return row.payload;
}

export async function inviteParentToConversationSql(
  context: RequestContext,
  conversationId: string,
  parentId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.invite_parent_to_conversation($1::uuid, $2::uuid) AS payload`,
    [conversationId, parentId],
  );
  return row.payload;
}

export async function unansweredCounselorMessagesSql(
  context: RequestContext,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.unanswered_counselor_messages() AS payload`,
  );
  return row.payload;
}

export async function registerConversationFileUploadSql(
  context: RequestContext,
  conversationId: string,
  sizeBytes: number,
  mime: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.register_conversation_file_upload($1::uuid, $2, $3) AS payload`,
    [conversationId, sizeBytes, mime],
  );
  return row.payload;
}

export async function completeConversationFileUploadSql(
  context: RequestContext,
  fileId: string,
  detectedMime: string | null,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.complete_conversation_file_upload($1::uuid, $2) AS payload`,
    [fileId, detectedMime],
  );
  return row.payload;
}

export async function issueConversationFileDownloadSql(
  context: RequestContext,
  fileId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.issue_conversation_file_download($1::uuid) AS payload`,
    [fileId],
  );
  return row.payload;
}
