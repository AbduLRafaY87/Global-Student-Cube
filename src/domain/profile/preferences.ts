import type { FieldError } from "./education";

export const TARGET_LEVELS = [
  "undergraduate",
  "masters",
  "phd",
  "certificate",
] as const;
export type TargetLevel = (typeof TARGET_LEVELS)[number];

export const INTAKE_MONTHS = [1, 5, 9] as const;
export type IntakeMonth = (typeof INTAKE_MONTHS)[number];

export const ACCOMMODATION_PREFERENCES = [
  "dorm",
  "apartment",
  "shared",
] as const;
export type AccommodationPreference = (typeof ACCOMMODATION_PREFERENCES)[number];

export const CAREER_GOAL_MAX_WORDS = 200;
export const COUNTRY_PRIORITY_MAX = 3;
export const LOCATION_MAX = 10;
export const DISCIPLINE_MAX = 5;
export const SPECIALIZATION_MAX = 5;

export interface CountryPreferenceInput {
  countryCode: string;
  priority: number;
  cities: string[];
}

export interface PreferencesInput {
  continuingField: boolean | null;
  targetLevel: TargetLevel | "";
  fieldIds: string[];
  previousFieldIds: string[];
  disciplineIds: string[];
  specializationIds: string[];
  countries: CountryPreferenceInput[];
  intakeMonth: number | null;
  intakeYear: number | null;
  intakeUndecided: boolean;
  accommodation: AccommodationPreference | "";
}

function isIn<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

export function requiredCountryCount(supportedCatalogCount: number): number {
  if (supportedCatalogCount <= 0) {
    return 0;
  }
  return Math.min(COUNTRY_PRIORITY_MAX, supportedCatalogCount);
}

export function validateCountryPreferences(
  countries: CountryPreferenceInput[],
  supportedCatalogCount: number,
): FieldError[] {
  const required = requiredCountryCount(supportedCatalogCount);
  const errors: FieldError[] = [];
  const codes = countries.map((row) => row.countryCode.toUpperCase());
  const unique = new Set(codes);

  if (unique.size !== codes.length) {
    errors.push({
      path: "countries",
      code: "DUPLICATE",
      message: "Duplicate country selections are rejected.",
    });
  }

  if (required === 0) {
    errors.push({
      path: "countries",
      code: "NO_CATALOG",
      message: "No supported catalog countries are available.",
    });
    return errors;
  }

  if (countries.length !== required) {
    errors.push({
      path: "countries",
      code: "COUNT",
      message:
        required < COUNTRY_PRIORITY_MAX
          ? `The catalog currently supports ${required} ${required === 1 ? "country" : "countries"}. Select that many, in order.`
          : "Select exactly three distinct ordered countries.",
    });
  }

  countries.forEach((row, index) => {
    if (row.priority !== index + 1) {
      errors.push({
        path: `countries.${index}.priority`,
        code: "PRIORITY",
        message: "Country priority must be 1, 2 or 3 in list order.",
      });
    }
    if (!/^[A-Za-z]{2}$/.test(row.countryCode)) {
      errors.push({
        path: `countries.${index}.countryCode`,
        code: "COUNTRY",
        message: "Choose a supported country.",
      });
    }
    if (row.cities.length > LOCATION_MAX) {
      errors.push({
        path: `countries.${index}.cities`,
        code: "CITY_LIMIT",
        message: "At most ten cities or regions can be stored.",
      });
    }
  });

  const allCities = countries.flatMap((row) => row.cities);
  if (allCities.length > LOCATION_MAX) {
    errors.push({
      path: "cities",
      code: "CITY_LIMIT",
      message: "At most ten cities or regions can be stored.",
    });
  }

  return errors;
}

export function validateCareerGoal(text: string): FieldError[] {
  const count = wordCount(text);
  if (!text.trim()) {
    return [
      {
        path: "careerGoal",
        code: "REQUIRED",
        message: "Describe your career goal or say you are unsure.",
      },
    ];
  }
  if (count > CAREER_GOAL_MAX_WORDS) {
    return [
      {
        path: "careerGoal",
        code: "WORD_LIMIT",
        message: "Career goals can be at most 200 words.",
      },
    ];
  }
  return [];
}

export function validatePreferences(
  input: PreferencesInput,
  supportedCatalogCount: number,
  undecidedDisciplineId: string | null,
): FieldError[] {
  const errors: FieldError[] = [];

  if (!input.targetLevel || !isIn(input.targetLevel, TARGET_LEVELS)) {
    errors.push({
      path: "targetLevel",
      code: "REQUIRED",
      message: "Choose Undergraduate, Masters, PhD or Certificate.",
    });
  }
  if (input.fieldIds.length === 0) {
    errors.push({
      path: "fieldIds",
      code: "REQUIRED",
      message: "Choose a field of interest. Undecided is allowed.",
    });
  }
  if (input.continuingField === false && input.previousFieldIds.length === 0) {
    errors.push({
      path: "previousFieldIds",
      code: "PREVIOUS_REQUIRED",
      message: "When changing field, record the previous field as well.",
    });
  }
  if (
    input.continuingField === false &&
    input.previousFieldIds.some((id) => input.fieldIds.includes(id))
  ) {
    errors.push({
      path: "fieldIds",
      code: "DISTINCT",
      message: "The intended field must be distinct from the previous field.",
    });
  }

  if (input.targetLevel === "masters") {
    if (input.disciplineIds.length === 0) {
      errors.push({
        path: "disciplineIds",
        code: "MASTERS_DISCIPLINE",
        message: "Masters requires at least one discipline or explicit Undecided.",
      });
    }
    if (input.disciplineIds.length > DISCIPLINE_MAX) {
      errors.push({
        path: "disciplineIds",
        code: "LIMIT",
        message: "Choose at most five disciplines.",
      });
    }
    if (input.specializationIds.length > SPECIALIZATION_MAX) {
      errors.push({
        path: "specializationIds",
        code: "LIMIT",
        message: "Choose at most five specializations.",
      });
    }
    if (
      undecidedDisciplineId &&
      input.disciplineIds.includes(undecidedDisciplineId) &&
      input.disciplineIds.length > 1
    ) {
      errors.push({
        path: "disciplineIds",
        code: "UNDECIDED_ALONE",
        message: "Undecided cannot be combined with other disciplines.",
      });
    }
  } else if (input.disciplineIds.length > 0 || input.specializationIds.length > 0) {
    errors.push({
      path: "disciplineIds",
      code: "MASTERS_ONLY",
      message: "Discipline and specialization apply only to Masters and are cleared after confirmation.",
    });
  }

  if (input.intakeUndecided) {
    if (input.intakeMonth !== null || input.intakeYear !== null) {
      errors.push({
        path: "intakeUndecided",
        code: "UNDECIDED",
        message: "Undecided intake cannot also store a month or year.",
      });
    }
  } else if (
    input.intakeMonth === null ||
    input.intakeYear === null ||
    !INTAKE_MONTHS.includes(input.intakeMonth as IntakeMonth) ||
    !Number.isInteger(input.intakeYear)
  ) {
    errors.push({
      path: "intakeMonth",
      code: "INTAKE",
      message: "Choose January, May or September and a year, or mark intake undecided.",
    });
  }

  if (!input.accommodation || !isIn(input.accommodation, ACCOMMODATION_PREFERENCES)) {
    errors.push({
      path: "accommodation",
      code: "REQUIRED",
      message: "Choose Dorm, Apartment or Shared. This is not a housing guarantee.",
    });
  }

  errors.push(...validateCountryPreferences(input.countries, supportedCatalogCount));
  return errors;
}

export function citiesForCountries(
  previous: CountryPreferenceInput[],
  nextCodes: string[],
): { next: CountryPreferenceInput[]; removedDependentCities: boolean } {
  let removedDependentCities = false;
  const next = nextCodes.map((code, index) => {
    const existing = previous.find(
      (row) => row.countryCode.toUpperCase() === code.toUpperCase(),
    );
    return {
      countryCode: code.toUpperCase(),
      priority: index + 1,
      cities: existing?.cities ?? [],
    };
  });
  for (const row of previous) {
    if (!nextCodes.some((code) => code.toUpperCase() === row.countryCode.toUpperCase())) {
      if (row.cities.length > 0) {
        removedDependentCities = true;
      }
    }
  }
  return { next, removedDependentCities };
}
