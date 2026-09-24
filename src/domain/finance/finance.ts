export const HOUSING_STATUSES = [
  "self_owned",
  "inherited",
  "private_rent",
  "subsidized_rent",
  "employer",
  "relatives",
  "temporary",
] as const;
export type HousingStatus = (typeof HOUSING_STATUSES)[number];

export const HOUSING_STRUCTURES = [
  "flat",
  "semi_detached",
  "bungalow",
  "villa",
  "shared",
  "informal",
  "other",
] as const;
export type HousingStructure = (typeof HOUSING_STRUCTURES)[number];

export const HOUSING_CONSTRUCTIONS = [
  "permanent",
  "semi_permanent",
  "temporary",
  "earthen",
] as const;
export type HousingConstruction = (typeof HOUSING_CONSTRUCTIONS)[number];

export const HOUSING_ROOMS = ["1", "2", "3_4", "5_plus"] as const;
export type HousingRooms = (typeof HOUSING_ROOMS)[number];

export const HOUSING_DISCLOSURES = ["provided", "declined"] as const;
export type HousingDisclosure = (typeof HOUSING_DISCLOSURES)[number];

export const TRI_STATES = ["yes", "no", "prefer_not"] as const;
export type TriState = (typeof TRI_STATES)[number];

export const READINESS_STATUSES = [
  "known",
  "incomplete_costs",
  "savings_declined",
  "fx_unavailable",
  "invalid_denominator",
] as const;
export type ReadinessStatus = (typeof READINESS_STATUSES)[number];

export const OCCUPATION_MAX = 160;

export interface HousingInput {
  disclosure: HousingDisclosure | "";
  status: HousingStatus | "";
  structure: HousingStructure | "";
  structureOther: string;
  construction: HousingConstruction | "";
  rooms: HousingRooms | "";
}

export interface FinancialInput {
  occupation: string;
  income: number | null;
  incomeCurrency: string | null;
  incomeDeclined: boolean | null;
  savings: number | null;
  savingsCurrency: string | null;
  savingsDeclined: boolean | null;
  housing: HousingInput;
  sponsorAvailable: TriState | "";
  incomeProofAvailable: TriState | "";
}

export interface FieldError {
  path: string;
  code: string;
  message: string;
}

function isIn<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

export function validateMoneyField(
  amount: number | null,
  currency: string | null,
  declined: boolean | null,
  path: "income" | "savings",
): FieldError[] {
  if (declined === null) {
    return [
      {
        path: `${path}Declined`,
        code: "REQUIRED",
        message: "Provide the amount or explicitly decline.",
      },
    ];
  }
  if (declined) {
    if (amount !== null || currency) {
      return [
        {
          path,
          code: "DECLINED_NULL",
          message: "A declined amount is stored as empty, not zero.",
        },
      ];
    }
    return [];
  }
  if (amount === null || amount < 0) {
    return [
      {
        path,
        code: "AMOUNT",
        message: "Enter an amount of zero or more, or decline.",
      },
    ];
  }
  if (!currency || !/^[A-Za-z]{3}$/.test(currency)) {
    return [
      {
        path: `${path}Currency`,
        code: "CURRENCY",
        message: "Amount and currency must be stored together.",
      },
    ];
  }
  return [];
}

export function validateHousing(housing: HousingInput): FieldError[] {
  if (!housing.disclosure || !isIn(housing.disclosure, HOUSING_DISCLOSURES)) {
    return [
      {
        path: "housing.disclosure",
        code: "REQUIRED",
        message: "Say whether housing details are provided or declined.",
      },
    ];
  }
  if (housing.disclosure === "declined") {
    return [];
  }
  const errors: FieldError[] = [];
  if (!isIn(housing.status, HOUSING_STATUSES)) {
    errors.push({ path: "housing.status", code: "REQUIRED", message: "Choose a housing status." });
  }
  if (!isIn(housing.structure, HOUSING_STRUCTURES)) {
    errors.push({
      path: "housing.structure",
      code: "REQUIRED",
      message: "Choose a housing structure.",
    });
  }
  if (housing.structure === "other" && !housing.structureOther.trim()) {
    errors.push({
      path: "housing.structureOther",
      code: "OTHER_REQUIRED",
      message: "Name the other housing structure.",
    });
  }
  if (!isIn(housing.construction, HOUSING_CONSTRUCTIONS)) {
    errors.push({
      path: "housing.construction",
      code: "REQUIRED",
      message: "Choose a construction type.",
    });
  }
  if (!isIn(housing.rooms, HOUSING_ROOMS)) {
    errors.push({ path: "housing.rooms", code: "REQUIRED", message: "Choose a room band." });
  }
  return errors;
}

export function validateFinancialSection(input: FinancialInput): FieldError[] {
  const errors: FieldError[] = [];
  if (input.occupation.length > OCCUPATION_MAX) {
    errors.push({
      path: "occupation",
      code: "LENGTH",
      message: "Occupation can be at most 160 characters.",
    });
  }
  errors.push(
    ...validateMoneyField(
      input.income,
      input.incomeCurrency,
      input.incomeDeclined,
      "income",
    ),
  );
  errors.push(
    ...validateMoneyField(
      input.savings,
      input.savingsCurrency,
      input.savingsDeclined,
      "savings",
    ),
  );
  errors.push(...validateHousing(input.housing));
  return errors;
}

export function canCompleteModule3(input: FinancialInput): boolean {
  return validateFinancialSection(input).length === 0;
}

export interface ReadinessInput {
  savings: number | null;
  savingsDeclined: boolean;
  annualComparison: number | null;
  fxAvailable: boolean;
}

export interface ReadinessResult {
  percent: number | null;
  status: ReadinessStatus;
  displayPercent: number | null;
}

export function evaluateReadiness(input: ReadinessInput): ReadinessResult {
  if (input.savingsDeclined) {
    return { percent: null, status: "savings_declined", displayPercent: null };
  }
  if (!input.fxAvailable) {
    return { percent: null, status: "fx_unavailable", displayPercent: null };
  }
  if (input.annualComparison === null || input.savings === null) {
    return { percent: null, status: "incomplete_costs", displayPercent: null };
  }
  if (input.annualComparison <= 0) {
    return { percent: null, status: "invalid_denominator", displayPercent: null };
  }
  const percent = (input.savings / input.annualComparison) * 100;
  return {
    percent,
    status: "known",
    displayPercent: percent,
  };
}

export function convertWithRate(
  amount: number,
  rate: number | null,
): { usd: number | null; available: boolean } {
  if (rate === null || rate <= 0) {
    return { usd: null, available: false };
  }
  return { usd: amount * rate, available: true };
}

export const HOUSING_STATUS_LABELS: Record<HousingStatus, string> = {
  self_owned: "Owned (self-owned)",
  inherited: "Owned (inherited/family property)",
  private_rent: "Rented (private)",
  subsidized_rent: "Rented (government/community subsidized)",
  employer: "Provided by employer",
  relatives: "Provided by relatives/others",
  temporary: "Temporary/informal settlement (no rent agreement)",
};

export const HOUSING_STRUCTURE_LABELS: Record<HousingStructure, string> = {
  flat: "Flat (apartment)",
  semi_detached: "Semi-detached house",
  bungalow: "Bungalow",
  villa: "Villa",
  shared: "Shared/partitioned accommodation",
  informal: "Informal dwelling (hut, tin shed, makeshift)",
  other: "Other",
};

export const HOUSING_CONSTRUCTION_LABELS: Record<HousingConstruction, string> = {
  permanent: "Permanent (cement, brick, concrete)",
  semi_permanent: "Semi-permanent (mixed materials)",
  temporary: "Temporary (tin sheets/wood/plastic)",
  earthen: "Mud/earthen",
};

export const HOUSING_ROOM_LABELS: Record<HousingRooms, string> = {
  "1": "1 room",
  "2": "2 rooms",
  "3_4": "3–4 rooms",
  "5_plus": "5+ rooms",
};
