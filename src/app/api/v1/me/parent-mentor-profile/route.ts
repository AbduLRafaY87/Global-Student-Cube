import {
  PARENT_EDUCATION_LEVELS,
  validateParentMentorProfile,
  type ParentMentorProfileInput,
} from "@/domain/mentorship/profiles";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
  requiredLiteral,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { upsertParentMentorProfileSql } from "@/server/modules/mentorship/commands";

const ALLOWED_KEYS = [
  "educationLevel",
  "topics",
  "monthlyAvailabilityHours",
  "experienceYears",
  "reflection",
  "submit",
] as const;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export async function PUT(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const input: ParentMentorProfileInput = {
      educationLevel: requiredLiteral(
        body.educationLevel,
        PARENT_EDUCATION_LEVELS,
        "educationLevel",
      ),
      topics: asStringArray(body.topics),
      monthlyAvailabilityHours:
        typeof body.monthlyAvailabilityHours === "number"
          ? body.monthlyAvailabilityHours
          : null,
      experienceYears:
        typeof body.experienceYears === "number" ? body.experienceYears : null,
      reflection: typeof body.reflection === "string" ? body.reflection : "",
    };
    const submit = body.submit === true;
    if (submit) {
      const errors = validateParentMentorProfile(input);
      if (errors.length > 0) {
        throw new CommandError("VALIDATION_FAILED", errors[0]?.message ?? "Check the highlighted fields.");
      }
    }
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await upsertParentMentorProfileSql(
        context,
        {
          educationLevel: input.educationLevel,
          topics: input.topics,
          monthlyAvailabilityHours: input.monthlyAvailabilityHours,
          experienceYears: input.experienceYears,
          reflection: input.reflection,
        },
        submit,
      ),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
