import {
  ACCOMMODATION_PREFERENCES,
  TARGET_LEVELS,
  validatePreferences,
  type CountryPreferenceInput,
} from "@/domain/profile/preferences";
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
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { savePreferencesCommand } from "@/server/modules/profile/commands";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_KEYS = [
  "continuingField",
  "targetLevel",
  "fieldIds",
  "previousFieldIds",
  "disciplineIds",
  "specializationIds",
  "countries",
  "intakeMonth",
  "intakeYear",
  "intakeUndecided",
  "accommodation",
] as const;

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

function parseCountries(raw: unknown): CountryPreferenceInput[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item, index) => {
    const row = asObjectRecord(item, `countries.${index}`);
    return {
      countryCode: typeof row.countryCode === "string" ? row.countryCode : "",
      priority: typeof row.priority === "number" ? row.priority : 0,
      cities: Array.isArray(row.cities)
        ? row.cities.filter((city): city is string => typeof city === "string")
        : [],
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

    const supabase = await createClient();
    const { count } = await supabase
      .from("universities")
      .select("country", { count: "exact", head: true })
      .eq("publication_state", "published");

    const errors = validatePreferences(
      {
        continuingField:
          typeof body.continuingField === "boolean" ? body.continuingField : null,
        targetLevel: optionalLiteral(body.targetLevel, TARGET_LEVELS, "targetLevel"),
        fieldIds: Array.isArray(body.fieldIds)
          ? body.fieldIds.filter((item): item is string => typeof item === "string")
          : [],
        previousFieldIds: Array.isArray(body.previousFieldIds)
          ? body.previousFieldIds.filter((item): item is string => typeof item === "string")
          : [],
        disciplineIds: Array.isArray(body.disciplineIds)
          ? body.disciplineIds.filter((item): item is string => typeof item === "string")
          : [],
        specializationIds: Array.isArray(body.specializationIds)
          ? body.specializationIds.filter((item): item is string => typeof item === "string")
          : [],
        countries: parseCountries(body.countries),
        intakeMonth: typeof body.intakeMonth === "number" ? body.intakeMonth : null,
        intakeYear: typeof body.intakeYear === "number" ? body.intakeYear : null,
        intakeUndecided: Boolean(body.intakeUndecided),
        accommodation: optionalLiteral(
          body.accommodation,
          ACCOMMODATION_PREFERENCES,
          "accommodation",
        ),
      },
      count ?? 0,
      null,
    );
    if (errors.length > 0) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.", {
        fields: errors.map((error) => ({ path: error.path, code: error.code })),
      });
    }

    const context = await resolveRequestContext(requestId);
    const result = await savePreferencesCommand(context, caseId, body);
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
