import {
  canCompleteModule3,
  HOUSING_CONSTRUCTIONS,
  HOUSING_DISCLOSURES,
  HOUSING_ROOMS,
  HOUSING_STATUSES,
  HOUSING_STRUCTURES,
  type FinancialInput,
  type HousingInput,
  type TriState,
  TRI_STATES,
  validateFinancialSection,
} from "@/domain/finance/finance";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  asObjectRecord,
  assertBodySize,
  assertJsonContentType,
  optionalLiteral,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { parseIfMatchVersion } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { saveFinancialProfileCommand } from "@/server/modules/finance/commands";

const ALLOWED_KEYS = [
  "occupation",
  "income",
  "incomeCurrency",
  "incomeDeclined",
  "savings",
  "savingsCurrency",
  "savingsDeclined",
  "housing",
  "sponsorAvailable",
  "incomeProofAvailable",
] as const;

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

function asTri(value: unknown, path: string): TriState | "" {
  return optionalLiteral(value, TRI_STATES, path);
}

function asMoney(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asHousing(value: unknown): HousingInput {
  if (value === undefined || value === null || value === "") {
    return {
      disclosure: "",
      status: "",
      structure: "",
      structureOther: "",
      construction: "",
      rooms: "",
    };
  }
  const record = asObjectRecord(value, "housing");
  return {
    disclosure: optionalLiteral(record.disclosure, HOUSING_DISCLOSURES, "housing.disclosure"),
    status: optionalLiteral(record.status, HOUSING_STATUSES, "housing.status"),
    structure: optionalLiteral(record.structure, HOUSING_STRUCTURES, "housing.structure"),
    structureOther:
      typeof record.structureOther === "string" ? record.structureOther : "",
    construction: optionalLiteral(
      record.construction,
      HOUSING_CONSTRUCTIONS,
      "housing.construction",
    ),
    rooms: optionalLiteral(record.rooms, HOUSING_ROOMS, "housing.rooms"),
  };
}

export function financialInputFromBody(body: Record<string, unknown>): FinancialInput {
  return {
    occupation: typeof body.occupation === "string" ? body.occupation : "",
    income: asMoney(body.income),
    incomeCurrency: typeof body.incomeCurrency === "string" ? body.incomeCurrency : null,
    incomeDeclined: typeof body.incomeDeclined === "boolean" ? body.incomeDeclined : null,
    savings: asMoney(body.savings),
    savingsCurrency: typeof body.savingsCurrency === "string" ? body.savingsCurrency : null,
    savingsDeclined: typeof body.savingsDeclined === "boolean" ? body.savingsDeclined : null,
    housing: asHousing(body.housing),
    sponsorAvailable: asTri(body.sponsorAvailable, "sponsorAvailable"),
    incomeProofAvailable: asTri(body.incomeProofAvailable, "incomeProofAvailable"),
  };
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
    const input = financialInputFromBody(body);
    const errors = validateFinancialSection(input);
    if (errors.length > 0 && !canCompleteModule3(input) && errors.some((error) => error.code !== "REQUIRED")) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.", {
        fields: errors.map((error) => ({ path: error.path, code: error.code })),
      });
    }
    if (input.occupation.length > 160) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    const housing = input.housing;
    const result = await saveFinancialProfileCommand(context, caseId, {
      occupation: input.occupation,
      income: input.incomeDeclined ? null : input.income,
      incomeCurrency: input.incomeDeclined ? null : input.incomeCurrency,
      incomeDeclined: input.incomeDeclined,
      savings: input.savingsDeclined ? null : input.savings,
      savingsCurrency: input.savingsDeclined ? null : input.savingsCurrency,
      savingsDeclined: input.savingsDeclined,
      housing: {
        disclosure: housing.disclosure,
        status: housing.status,
        structure: housing.structure,
        structure_other: housing.structureOther,
        construction: housing.construction,
        rooms: housing.rooms,
      },
      sponsorAvailable: input.sponsorAvailable || "prefer_not",
      incomeProofAvailable: input.incomeProofAvailable || "prefer_not",
      expectedVersion,
    });
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
