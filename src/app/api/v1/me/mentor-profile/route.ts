import {
  validateAlumniMentorProfile,
  type AlumniMentorProfileInput,
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
import { STUDY_STATUSES } from "@/domain/mentorship/profiles";
import { upsertAlumniMentorProfileSql } from "@/server/modules/mentorship/commands";

const ALLOWED_KEYS = [
  "studyStatus",
  "universityAttended",
  "course",
  "graduationYear",
  "graduationIsAnticipated",
  "topics",
  "industries",
  "industriesOther",
  "currentOrganization",
  "role",
  "employerBusinessUrl",
  "professionalLink",
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
    const input: AlumniMentorProfileInput = {
      studyStatus: requiredLiteral(body.studyStatus, STUDY_STATUSES, "studyStatus"),
      universityAttended:
        typeof body.universityAttended === "string" ? body.universityAttended : "",
      course: typeof body.course === "string" ? body.course : "",
      graduationYear:
        typeof body.graduationYear === "number" ? body.graduationYear : null,
      graduationIsAnticipated: body.graduationIsAnticipated === true,
      topics: asStringArray(body.topics),
      industries: asStringArray(body.industries),
      industriesOther: typeof body.industriesOther === "string" ? body.industriesOther : "",
      currentOrganization:
        typeof body.currentOrganization === "string" ? body.currentOrganization : "",
      role: typeof body.role === "string" ? body.role : "",
      employerBusinessUrl:
        typeof body.employerBusinessUrl === "string" ? body.employerBusinessUrl : "",
      professionalLink:
        typeof body.professionalLink === "string" ? body.professionalLink : "",
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
      const errors = validateAlumniMentorProfile(input);
      if (errors.length > 0) {
        throw new CommandError("VALIDATION_FAILED", errors[0]?.message ?? "Check the highlighted fields.");
      }
    }
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await upsertAlumniMentorProfileSql(
        context,
        {
          studyStatus: input.studyStatus,
          universityAttended: input.universityAttended,
          course: input.course,
          graduationYear: input.graduationYear,
          graduationIsAnticipated: input.graduationIsAnticipated,
          topics: input.topics,
          industries: input.industries,
          industriesOther: input.industriesOther,
          currentOrganization: input.currentOrganization,
          role: input.role,
          employerBusinessUrl: input.employerBusinessUrl,
          professionalLink: input.professionalLink,
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
