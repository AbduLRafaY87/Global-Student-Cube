import { BUDGET_LINE_KINDS, LINE_BASES } from "@/domain/costs/budget";
import { COST_HORIZONS } from "@/domain/costs/annual";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { parseIfMatchVersion } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { saveBudgetAssumptionsCommand } from "@/server/modules/costs/commands";

const ALLOWED_KEYS = ["horizon", "nightsPerMonth", "lines", "confirmedFunding"] as const;

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId } = await params;
    assertBodySize(request);
    assertJsonContentType(request);
    const expectedVersion = parseIfMatchVersion(request.headers.get("if-match"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const horizon = typeof body.horizon === "string" ? body.horizon : "first_year";
    if (!(COST_HORIZONS as readonly string[]).includes(horizon)) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const nights =
      typeof body.nightsPerMonth === "number" ? body.nightsPerMonth : 30;
    if (!Number.isInteger(nights) || nights < 1 || nights > 31) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const lines = Array.isArray(body.lines) ? body.lines : [];
    for (const item of lines) {
      if (typeof item !== "object" || item === null) {
        throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
      }
      const row = item as Record<string, unknown>;
      if (
        typeof row.kind !== "string" ||
        !(BUDGET_LINE_KINDS as readonly string[]).includes(row.kind) ||
        typeof row.basis !== "string" ||
        !(LINE_BASES as readonly string[]).includes(row.basis)
      ) {
        throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
      }
    }
    const context = await resolveRequestContext(requestId);
    const result = await saveBudgetAssumptionsCommand(context, caseId, {
      ...body,
      horizon,
      nightsPerMonth: nights,
      expectedVersion,
    });
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
