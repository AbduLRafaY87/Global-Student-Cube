import { validateTestsSection } from "@/domain/profile/tests";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { saveTestResultsCommand } from "@/server/modules/profile/commands";

const ALLOWED_KEYS = ["testsTaken", "tests"] as const;

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
    const testsTaken =
      typeof body.testsTaken === "boolean" ? body.testsTaken : null;
    const tests = Array.isArray(body.tests) ? body.tests : [];
    const errors = validateTestsSection({
      testsTaken,
      tests: tests as never,
    });
    if (errors.length > 0) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.", {
        fields: errors.map((error) => ({ path: error.path, code: error.code })),
      });
    }
    const context = await resolveRequestContext(requestId);
    const result = await saveTestResultsCommand(context, caseId, body);
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
