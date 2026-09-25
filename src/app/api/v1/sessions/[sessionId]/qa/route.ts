import { mediaAiActionsAllowed } from "@/domain/ai/jobs";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import {
  counselorQaSql,
  enqueueAiJobSql,
  saveCoachingResponseSql,
} from "@/server/modules/ai/commands";

const ALLOWED_KEYS = ["action", "response"] as const;

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { sessionId } = await params;
    requireUuid(sessionId, "sessionId");
    const context = await resolveRequestContext(requestId);
    if (context.role !== "counselor" && context.role !== "admin") {
      throw new CommandError("FORBIDDEN", "Private coaching is a staff artifact.");
    }
    if (context.role === "counselor" && context.assurance !== "aal2") {
      throw new CommandError("MFA_REQUIRED", "Confirm your authenticator to continue.");
    }
    return commandSuccess(await counselorQaSql(context, sessionId), requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { sessionId } = await params;
    requireUuid(sessionId, "sessionId");
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const context = await resolveRequestContext(requestId);
    if (context.role !== "counselor") {
      throw new CommandError("FORBIDDEN", "Private coaching is a staff artifact.");
    }
    if (context.assurance !== "aal2") {
      throw new CommandError("MFA_REQUIRED", "Confirm your authenticator to continue.");
    }
    const action = typeof body.action === "string" ? body.action : "";
    if (action === "generate") {
      if (!mediaAiActionsAllowed(process.env.GSC_FEATURE_RECORDING_AI).coaching) {
        throw new CommandError(
          "VALIDATION_FAILED",
          "AI coaching is off. The manual summary still works.",
        );
      }
      return commandSuccess(
        await enqueueAiJobSql(context, sessionId, "qa_coaching"),
        requestId,
        { status: 202 },
      );
    }
    if (action === "acknowledge" || action === "flag") {
      return commandSuccess(
        await saveCoachingResponseSql(
          context,
          sessionId,
          typeof body.response === "string" ? body.response : "",
          action === "flag",
        ),
        requestId,
      );
    }
    throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
