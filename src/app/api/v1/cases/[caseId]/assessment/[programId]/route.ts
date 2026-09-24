import {
  evaluateAssessment,
  isAssessmentAnswer,
  requirementVersionOf,
  type AssessmentClaim,
  type AssessmentCriterionInput,
} from "@/domain/assessment/assessment";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { saveProgramAssessmentCommand } from "@/server/modules/assessment/commands";
import { loadAssessmentPage } from "@/server/modules/assessment/load";

const ALLOWED_KEYS = ["universityId", "answers"] as const;

interface RouteParams {
  params: Promise<{ caseId: string; programId: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId, programId } = await params;
    requireUuid(caseId, "caseId");
    requireUuid(programId, "programId");
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const universityId = requireUuid(String(body.universityId ?? ""), "universityId");
    if (!Array.isArray(body.answers)) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const context = await resolveRequestContext(requestId);
    const page = await loadAssessmentPage(caseId, programId, context.accountId);
    if (!page) {
      throw new CommandError("NOT_FOUND", "That record was not found.");
    }

    const claims: AssessmentClaim[] = body.answers.flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }
      const row = item as Record<string, unknown>;
      const key = typeof row.criterionKey === "string" ? row.criterionKey : "";
      const answer = typeof row.answer === "string" ? row.answer : "";
      if (!key || !isAssessmentAnswer(answer)) {
        return [];
      }
      return [
        {
          key,
          answer,
          evidenceFileId:
            typeof row.evidenceFileId === "string" && row.evidenceFileId !== ""
              ? row.evidenceFileId
              : null,
          explanation: typeof row.explanation === "string" ? row.explanation : "",
        },
      ];
    });

    const criteria: AssessmentCriterionInput[] = page.criteria;
    const result = evaluateAssessment(criteria, claims, page.evidence);
    const payload = {
      programId,
      universityId,
      requirementVersion: requirementVersionOf(
        criteria.map((row) => ({ key: row.key })),
      ) || page.currentVersion,
      equalWeights: result.equalWeights,
      score: result.score,
      label: result.label,
      knownCoverage: result.knownCoverage,
      possibleLow: result.possibleLow,
      possibleHigh: result.possibleHigh,
      answers: result.items.map((item) => {
        const claim = claims.find((row) => row.key === item.key);
        return {
          criterionKey: item.key,
          kind: item.kind,
          weight: item.weight,
          mandatory: item.mandatory,
          publishedThreshold: item.publishedThreshold,
          answer: claim?.answer ?? item.claimedAnswer,
          evidenceFileId: claim?.evidenceFileId ?? null,
          explanation: claim?.explanation ?? "",
          verificationState: item.verification,
        };
      }),
    };
    const saved = await saveProgramAssessmentCommand(context, caseId, payload);
    return commandSuccess(saved, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
