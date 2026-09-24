import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { saveAcademicHistoryCommand } from "@/server/modules/profile/commands";
import { validateEducationSection } from "@/domain/profile/education";

const ALLOWED_KEYS = ["level", "educationYears", "records"] as const;

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
    const records = Array.isArray(body.records) ? body.records : [];
    const errors = validateEducationSection({
      level: typeof body.level === "string" ? body.level : "",
      educationYears:
        typeof body.educationYears === "number" ? body.educationYears : null,
      records: records as never,
    });
    if (errors.length > 0) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.", {
        fields: errors.map((error) => ({ path: error.path, code: error.code })),
      });
    }
    const context = await resolveRequestContext(requestId);
    const result = await saveAcademicHistoryCommand(context, caseId, body);
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
