import {
  PROFILE_TEST_TYPES,
  TEST_VERIFICATIONS,
  validateTestsSection,
  type TestResultInput,
  type TestSubscoreInput,
} from "@/domain/profile/tests";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  asObjectRecord,
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
  requiredLiteral,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { saveTestResultsCommand } from "@/server/modules/profile/commands";

const ALLOWED_KEYS = ["testsTaken", "tests"] as const;

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

function parseSubscores(raw: unknown): TestSubscoreInput[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }
    const record = item as Record<string, unknown>;
    return [
      {
        name: typeof record.name === "string" ? record.name : "",
        score: typeof record.score === "number" ? record.score : null,
        reported: typeof record.reported === "string" ? record.reported : "",
      },
    ];
  });
}

function parseTests(raw: unknown): TestResultInput[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item, index) => {
    const row = asObjectRecord(item, `tests.${index}`);
    const prefix = `tests.${index}`;
    return {
      testType: requiredLiteral(row.testType, PROFILE_TEST_TYPES, `${prefix}.testType`),
      testVariant: typeof row.testVariant === "string" ? row.testVariant : "",
      scaleCode: typeof row.scaleCode === "string" ? row.scaleCode : "",
      scaleVersion: typeof row.scaleVersion === "string" ? row.scaleVersion : "",
      score: typeof row.score === "number" ? row.score : null,
      reportedScore: typeof row.reportedScore === "string" ? row.reportedScore : "",
      subscores: parseSubscores(row.subscores),
      comparableTotal:
        typeof row.comparableTotal === "number" ? row.comparableTotal : null,
      takenOn: typeof row.takenOn === "string" ? row.takenOn : "",
      evidenceId: typeof row.evidenceId === "string" ? row.evidenceId : null,
      verification: requiredLiteral(
        row.verification,
        TEST_VERIFICATIONS,
        `${prefix}.verification`,
      ),
    };
  });
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
    const errors = validateTestsSection({
      testsTaken,
      tests: parseTests(body.tests),
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
