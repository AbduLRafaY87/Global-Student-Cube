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
  saveAdvisoryDraftSql,
  studentAdvisorySql,
  supersedeAdvisorySql,
  transitionAdvisorySql,
} from "@/server/modules/counseling/commands";

const ALLOWED_KEYS = ["event", "shareableBody", "privateNotes"] as const;

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { sessionId } = await params;
    requireUuid(sessionId, "sessionId");
    const context = await resolveRequestContext(requestId);
    return commandSuccess(await studentAdvisorySql(context, sessionId), requestId);
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
    if (context.assurance !== "aal2" && context.role === "counselor") {
      throw new CommandError("MFA_REQUIRED", "Confirm your authenticator to continue.");
    }
    const event = typeof body.event === "string" ? body.event : "";
    if (event === "save") {
      if (body.shareableBody === null || typeof body.shareableBody !== "object") {
        throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
      }
      return commandSuccess(
        await saveAdvisoryDraftSql(
          context,
          sessionId,
          body.shareableBody as Record<string, unknown>,
          typeof body.privateNotes === "string" ? body.privateNotes : "",
        ),
        requestId,
      );
    }
    if (event === "supersede") {
      return commandSuccess(await supersedeAdvisorySql(context, sessionId), requestId);
    }
    if (!event) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    return commandSuccess(
      await transitionAdvisorySql(context, sessionId, event),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
