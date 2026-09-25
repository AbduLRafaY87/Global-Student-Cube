import {
  ACTIVITY_TYPES,
  AWARD_OUTCOMES,
  validateExperience,
  type ActivityInput,
  type AwardInput,
  type RelativeInput,
} from "@/domain/profile/experience";
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

function parseActivities(raw: unknown): ActivityInput[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item, index) => {
    const row = asObjectRecord(item, `activities.${index}`);
    return {
      ordinal: typeof row.ordinal === "number" ? row.ordinal : index,
      type: optionalLiteral(row.type, ACTIVITY_TYPES, `activities.${index}.type`),
      otherType: typeof row.otherType === "string" ? row.otherType : "",
      name: typeof row.name === "string" ? row.name : "",
      role: typeof row.role === "string" ? row.role : "",
      durationMonths:
        typeof row.durationMonths === "number" ? row.durationMonths : null,
      durationText: typeof row.durationText === "string" ? row.durationText : "",
      hoursWeek: typeof row.hoursWeek === "number" ? row.hoursWeek : null,
      achievements: typeof row.achievements === "string" ? row.achievements : "",
    };
  });
}

function parseAwards(raw: unknown): AwardInput[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item, index) => {
    const row = asObjectRecord(item, `awards.${index}`);
    return {
      name: typeof row.name === "string" ? row.name : "",
      outcome: requiredLiteral(row.outcome, AWARD_OUTCOMES, `awards.${index}.outcome`),
      year: typeof row.year === "number" ? row.year : null,
      amount: typeof row.amount === "number" ? row.amount : null,
      currency: typeof row.currency === "string" ? row.currency : null,
      evidenceId: typeof row.evidenceId === "string" ? row.evidenceId : null,
      evidenceUnavailableReason:
        typeof row.evidenceUnavailableReason === "string"
          ? row.evidenceUnavailableReason
          : "",
    };
  });
}

function parseRelative(raw: unknown): RelativeInput | null {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }
  const row = asObjectRecord(raw, "relative");
  return {
    hasRelative: typeof row.hasRelative === "boolean" ? row.hasRelative : false,
    relationship: typeof row.relationship === "string" ? row.relationship : "",
    country: typeof row.country === "string" ? row.country : "",
    city: typeof row.city === "string" ? row.city : "",
  };
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
      activities: parseActivities(body.activities),
      scholarshipReceived:
        typeof body.scholarshipReceived === "boolean"
          ? body.scholarshipReceived
          : null,
      scholarshipNotGranted:
        typeof body.scholarshipNotGranted === "boolean"
          ? body.scholarshipNotGranted
          : null,
      awards: parseAwards(body.awards),
      relative: parseRelative(body.relative),
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
