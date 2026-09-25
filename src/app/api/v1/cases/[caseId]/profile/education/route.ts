import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  asObjectRecord,
  assertBodySize,
  assertJsonContentType,
  optionalLiteral,
  rejectUnknownKeys,
  requiredLiteral,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { saveAcademicHistoryCommand } from "@/server/modules/profile/commands";
import {
  BOARD_SYSTEMS,
  COMPLETION_STATUSES,
  EDUCATION_LEVELS,
  INSTITUTION_LEVELS,
  RESULT_STATUSES,
  SCORE_SCALES,
  validateEducationSection,
  type EducationRecordInput,
} from "@/domain/profile/education";

const ALLOWED_KEYS = ["level", "educationYears", "records"] as const;

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

function parseEducationRecords(raw: unknown): EducationRecordInput[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item, index) => {
    const record = asObjectRecord(item, `records.${index}`);
    const prefix = `records.${index}`;
    return {
      institution: typeof record.institution === "string" ? record.institution : "",
      level: requiredLiteral(record.level, INSTITUTION_LEVELS, `${prefix}.level`),
      country: typeof record.country === "string" ? record.country : "",
      city: typeof record.city === "string" ? record.city : "",
      board: requiredLiteral(record.board, BOARD_SYSTEMS, `${prefix}.board`),
      boardOther: typeof record.boardOther === "string" ? record.boardOther : undefined,
      completionYear:
        typeof record.completionYear === "number" ? record.completionYear : null,
      completionStatus: requiredLiteral(
        record.completionStatus,
        COMPLETION_STATUSES,
        `${prefix}.completionStatus`,
      ),
      resultStatus: requiredLiteral(
        record.resultStatus,
        RESULT_STATUSES,
        `${prefix}.resultStatus`,
      ),
      scoreValue: typeof record.scoreValue === "string" ? record.scoreValue : "",
      scoreScale: optionalLiteral(
        record.scoreScale,
        SCORE_SCALES,
        `${prefix}.scoreScale`,
      ),
      scoreBounds: typeof record.scoreBounds === "string" ? record.scoreBounds : undefined,
      evidenceId: typeof record.evidenceId === "string" ? record.evidenceId : null,
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
    const errors = validateEducationSection({
      level: optionalLiteral(body.level, EDUCATION_LEVELS, "level"),
      educationYears:
        typeof body.educationYears === "number" ? body.educationYears : null,
      records: parseEducationRecords(body.records),
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
