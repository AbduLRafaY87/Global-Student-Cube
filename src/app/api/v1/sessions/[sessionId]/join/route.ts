import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import {
  bumpSessionRosterSql,
  recordSessionEventSql,
  sessionWorkspaceSql,
  transitionSessionSql,
} from "@/server/modules/sessions/commands";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { sessionId } = await params;
    requireUuid(sessionId, "sessionId");
    const context = await resolveRequestContext(requestId);
    const before = await sessionWorkspaceSql(context, sessionId);

    if (before.sessionState === "in_progress" || before.sessionState === "waiting") {
      const alreadyPresent = before.participants.some(
        (participant) => participant.accountId === context.accountId,
      );
      if (alreadyPresent && before.recordingState === "recording") {
        await bumpSessionRosterSql(context, sessionId);
      }
    }

    await recordSessionEventSql(
      context,
      sessionId,
      "joined",
      "manual_reviewed",
      `joined:${sessionId}:${context.accountId}:${requestId}`,
    );

    let session = await sessionWorkspaceSql(context, sessionId);
    if (session.sessionState === "scheduled") {
      session = await transitionSessionSql(context, sessionId, "open_join_window");
    }
    if (session.sessionState === "waiting") {
      session = await transitionSessionSql(context, sessionId, "start_session");
    }

    return commandSuccess(session, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
