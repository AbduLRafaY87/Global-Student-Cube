import { validateExperience } from "@/domain/profile/experience";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { saveExperienceCommand } from "@/server/modules/profile/commands";

const ALLOWED_KEYS = [
  "careerGoal",
  "activities",
  "scholarshipReceived",
  "scholarshipNotGranted",
  "awards",
  "relative",
  "introFileId",
  "introLanguage",
  "introCaption",
] as const;

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId } = await params;
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const errors = validateExperience({
      careerGoal: typeof body.careerGoal === "string" ? body.careerGoal : "",
      activities: (Array.isArray(body.activities) ? body.activities : []) as never,
      scholarshipReceived:
        typeof body.scholarshipReceived === "boolean"
          ? body.scholarshipReceived
          : null,
      scholarshipNotGranted:
        typeof body.scholarshipNotGranted === "boolean"
          ? body.scholarshipNotGranted
          : null,
      awards: (Array.isArray(body.awards) ? body.awards : []) as never,
      relative: (body.relative as never) ?? null,
      introFileId: typeof body.introFileId === "string" ? body.introFileId : null,
    });
    if (errors.length > 0) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.", {
        fields: errors.map((error) => ({ path: error.path, code: error.code })),
      });
    }
    const context = await resolveRequestContext(requestId);
    const result = await saveExperienceCommand(context, caseId, body);
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
