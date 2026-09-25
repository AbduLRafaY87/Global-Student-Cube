import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  messageInboxSql,
  messageThreadSql,
  unansweredCounselorMessagesSql,
} from "./commands";

export type MessagingLoad<T> =
  | { ok: true; data: T }
  | { ok: false; forbidden: boolean };

async function wrap<T>(run: () => Promise<T>): Promise<MessagingLoad<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (
      error instanceof CommandError &&
      (error.code === "FORBIDDEN" ||
        error.code === "AUTH_REQUIRED" ||
        error.code === "NOT_FOUND" ||
        error.code === "MFA_REQUIRED")
    ) {
      return { ok: false, forbidden: true };
    }
    return { ok: false, forbidden: false };
  }
}

export async function loadMessageInbox(input: {
  caseId: string | null;
  query: string;
  unreadOnly: boolean;
  cursor: string | null;
  limit: number;
}) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return messageInboxSql(context, input);
  });
}

export async function loadMessageThread(
  conversationId: string,
  before: string | null,
  limit: number,
) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return messageThreadSql(context, conversationId, before, limit);
  });
}

export async function loadUnansweredCounselorMessages() {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return unansweredCounselorMessagesSql(context);
  });
}
