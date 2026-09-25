import { resolveRequestContext } from "@/server/context";
import {
  asObjectRecord,
  assertBodySize,
  assertJsonContentType,
  requiredLiteral,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { submitMentoringFeedbackSql } from "@/server/modules/mentorship/commands";

const ALLOWED_KEYS = ["questionnaire", "answers"] as const;
const QUESTIONNAIRES = ["alumni_mentee", "mentor", "parent_mentee"] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { id } = await params;
    requireUuid(id, "id");
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await submitMentoringFeedbackSql(
        context,
        id,
        requiredLiteral(body.questionnaire, QUESTIONNAIRES, "questionnaire"),
        asObjectRecord(body.answers, "answers"),
      ),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
