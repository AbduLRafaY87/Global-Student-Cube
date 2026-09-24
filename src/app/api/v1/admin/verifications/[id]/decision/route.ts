import { isVerificationDecision } from "@/domain/admin/verification";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { decideVerificationCaseSql } from "@/server/modules/admin/commands";
import {
  optionalText,
  readVersion,
  requireAdminContext,
  requireUuid,
} from "@/server/modules/admin/http";

const ALLOWED_KEYS = ["decision", "reason", "applicantMessage", "version"] as const;

interface DecisionBody {
  decision?: unknown;
  reason?: unknown;
  applicantMessage?: unknown;
  version?: unknown;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();

  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as DecisionBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    if (typeof body.decision !== "string" || !isVerificationDecision(body.decision)) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);

    const payload = await decideVerificationCaseSql(context, {
      caseId: requireUuid(id, "id"),
      decision: body.decision,
      reason: typeof body.reason === "string" ? body.reason : "",
      applicantMessage: optionalText(body.applicantMessage),
      version: readVersion(request, body.version),
    });
    return commandSuccess(payload, requestId, { version: payload.version });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
