import { GUIDANCE_LEVELS, VISA_CATEGORIES } from "@/domain/catalog/guidance";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
  requiredLiteral,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import {
  optionalText,
  requireAdminContext,
  requiredReason,
} from "@/server/modules/admin/http";
import { upsertCountryGuidanceCommand } from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = [
  "id",
  "country",
  "studyLevel",
  "visaCategory",
  "nationalityApplicability",
  "officialUrl",
  "officialAuthority",
  "sourceDate",
  "applicationFeeAmount",
  "applicationFeeCurrency",
  "visaFeeAmount",
  "visaFeeCurrency",
  "paymentNotes",
  "processingMin",
  "processingMax",
  "processingUnit",
  "documents",
  "countryRules",
  "workHoursValue",
  "workHoursPeriod",
  "workHoursConditions",
  "workHoursSource",
  "workHoursSourceDate",
  "faq",
  "reapplicationNotes",
  "studentAdvice",
  "counselorNotes",
  "nextReviewAt",
  "reason",
] as const;

interface Body {
  id?: unknown;
  country?: unknown;
  studyLevel?: unknown;
  visaCategory?: unknown;
  nationalityApplicability?: unknown;
  officialUrl?: unknown;
  officialAuthority?: unknown;
  sourceDate?: unknown;
  applicationFeeAmount?: unknown;
  applicationFeeCurrency?: unknown;
  visaFeeAmount?: unknown;
  visaFeeCurrency?: unknown;
  paymentNotes?: unknown;
  processingMin?: unknown;
  processingMax?: unknown;
  processingUnit?: unknown;
  documents?: unknown;
  countryRules?: unknown;
  workHoursValue?: unknown;
  workHoursPeriod?: unknown;
  workHoursConditions?: unknown;
  workHoursSource?: unknown;
  workHoursSourceDate?: unknown;
  faq?: unknown;
  reapplicationNotes?: unknown;
  studentAdvice?: unknown;
  counselorNotes?: unknown;
  nextReviewAt?: unknown;
  reason?: unknown;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string"
      ? value.split(",").map((item) => item.trim()).filter(Boolean)
      : [];
}

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Body;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);
    if (typeof body.country !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await upsertCountryGuidanceCommand(context, {
      id: optionalText(body.id),
      reason: requiredReason(body.reason),
      payload: {
        country: body.country.trim().toUpperCase(),
        studyLevel: requiredLiteral(body.studyLevel, GUIDANCE_LEVELS, "studyLevel"),
        visaCategory: requiredLiteral(body.visaCategory, VISA_CATEGORIES, "visaCategory"),
        nationalityApplicability: stringList(body.nationalityApplicability),
        officialUrl: optionalText(body.officialUrl) ?? "",
        officialAuthority: optionalText(body.officialAuthority) ?? "",
        sourceDate: optionalText(body.sourceDate) ?? "",
        applicationFeeAmount:
          typeof body.applicationFeeAmount === "number"
            ? String(body.applicationFeeAmount)
            : optionalText(body.applicationFeeAmount) ?? "",
        applicationFeeCurrency: optionalText(body.applicationFeeCurrency) ?? "",
        visaFeeAmount:
          typeof body.visaFeeAmount === "number"
            ? String(body.visaFeeAmount)
            : optionalText(body.visaFeeAmount) ?? "",
        visaFeeCurrency: optionalText(body.visaFeeCurrency) ?? "",
        paymentNotes: optionalText(body.paymentNotes) ?? "",
        processingMin:
          typeof body.processingMin === "number"
            ? String(body.processingMin)
            : optionalText(body.processingMin) ?? "",
        processingMax:
          typeof body.processingMax === "number"
            ? String(body.processingMax)
            : optionalText(body.processingMax) ?? "",
        processingUnit: optionalText(body.processingUnit) ?? "",
        documents: Array.isArray(body.documents) ? body.documents : [],
        countryRules: optionalText(body.countryRules) ?? "",
        workHoursValue:
          typeof body.workHoursValue === "number"
            ? String(body.workHoursValue)
            : optionalText(body.workHoursValue) ?? "",
        workHoursPeriod: optionalText(body.workHoursPeriod) ?? "",
        workHoursConditions: optionalText(body.workHoursConditions) ?? "",
        workHoursSource: optionalText(body.workHoursSource) ?? "",
        workHoursSourceDate: optionalText(body.workHoursSourceDate) ?? "",
        faq: Array.isArray(body.faq) ? body.faq : [],
        reapplicationNotes: optionalText(body.reapplicationNotes) ?? "",
        studentAdvice: optionalText(body.studentAdvice) ?? "",
        counselorNotes: optionalText(body.counselorNotes) ?? "",
        nextReviewAt: optionalText(body.nextReviewAt) ?? "",
      },
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
