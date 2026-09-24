import {
  annualComparisonAmount,
  housingMonthlyAmount,
  tuitionForHorizon,
  type CostHorizon,
} from "@/domain/costs/annual";
import {
  broaderBudgetTotal,
  combinedPlanningTotal,
  type BudgetLine,
  type BudgetLineKind,
  type LineBasis,
} from "@/domain/costs/budget";
import { assessApplicationFees, type ApplicationFeeRule } from "@/domain/costs/fees";
import { convertWithQuote, isFxStale, type FxQuote } from "@/domain/costs/fx";
import { displayMoneyLine } from "@/domain/costs/money";
import {
  evaluateCostReadiness,
  netEstimatedExpense,
  type ConfirmedFunding,
} from "@/domain/costs/readiness";
import { createClient } from "@/lib/supabase/server";
import { fetchUsdQuotes } from "@/server/adapters/exchange-rate-api";
import type { RequestContext } from "@/server/context";
import { upsertFxSnapshotCommand } from "./commands";

export interface CostPageModel {
  caseId: string;
  studentName: string;
  version: number;
  module3Completed: boolean;
  canWrite: boolean;
  programId: string | null;
  programName: string | null;
  universityName: string | null;
  horizon: CostHorizon;
  nightsPerMonth: number;
  annualComparison: {
    label: string;
    amount: number | null;
    currency: string | null;
    tuition: { amount: number | null; currency: string | null };
    housing: { monthly: number | null; currency: string | null; estimated: boolean };
    usd: number | null;
  };
  broader: {
    total: number | null;
    currency: string | null;
    usd: number | null;
    lines: BudgetLine[];
  };
  planningTotal: number | null;
  applicationFees: {
    total: number | null;
    currency: string | null;
    note: string;
  };
  readiness: ReturnType<typeof evaluateCostReadiness>;
  fx: {
    available: boolean;
    stale: boolean;
    capturedAt: string | null;
    provider: string | null;
  };
  originalPlusUsd: string;
  parentLinks: { id: string; label: string }[];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseLines(value: unknown): BudgetLine[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }
    const row = item as Record<string, unknown>;
    const kind = asString(row.kind) as BudgetLineKind;
    const basis = asString(row.basis) as LineBasis;
    return [
      {
        kind,
        amount: asNumber(row.amount),
        currency: asString(row.currency) || null,
        basis: basis || "annual",
        includedInAccommodation: row.includedInAccommodation === true,
      },
    ];
  });
}

function parseFunding(value: unknown): ConfirmedFunding[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }
    const row = item as Record<string, unknown>;
    return [
      {
        amount: asNumber(row.amount),
        confirmed: row.confirmed === true,
        alreadyInSavings: row.alreadyInSavings === true,
      },
    ];
  });
}

function parseFeeRules(value: unknown[]): ApplicationFeeRule[] {
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }
    const row = item as Record<string, unknown>;
    const appliesTo = asString(row.applies_to);
    if (appliesTo !== "system" && appliesTo !== "group" && appliesTo !== "choice") {
      return [];
    }
    return [
      {
        appliesTo,
        kind: asString(row.kind),
        amount: asNumber(row.amount),
        currency: asString(row.currency) || null,
        includedChoices: asNumber(row.included_choices),
        sourceFactId: asString(row.source_fact_id) || null,
      },
    ];
  });
}

async function latestQuote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
): Promise<FxQuote | null> {
  const { data } = await supabase
    .from("fx_snapshots")
    .select("base, quote, rate, provider, captured_at")
    .eq("base", base)
    .eq("quote", "USD")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) {
    return null;
  }
  const rate = asNumber(data.rate);
  if (rate === null) {
    return null;
  }
  return {
    base: asString(data.base),
    quote: asString(data.quote),
    rate,
    capturedAt: asString(data.captured_at),
    provider: asString(data.provider),
  };
}

export async function loadCostPage(
  caseId: string,
  userId: string,
  programId: string | null,
  context: RequestContext | null,
): Promise<CostPageModel | null> {
  const supabase = await createClient();
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, student_name, student_account_id, operating_guardian_id, version, module3_completed_at")
    .eq("id", caseId)
    .maybeSingle();
  if (!caseRow || typeof caseRow.id !== "string") {
    return null;
  }
  const isOwner =
    caseRow.student_account_id === userId || caseRow.operating_guardian_id === userId;
  const { data: grants } = await supabase
    .from("case_grants")
    .select("scope")
    .eq("case_id", caseId)
    .eq("account_id", userId)
    .is("revoked_at", null);
  const scopes = (grants ?? []).map((row) => asString(row.scope));
  const canRead =
    isOwner || scopes.includes("finance.read") || scopes.includes("finance.write");
  if (!canRead) {
    return null;
  }

  const [{ data: finance }, { data: assumptions }, { data: links }] = await Promise.all([
    supabase.from("financial_profiles").select("*").eq("case_id", caseId).maybeSingle(),
    supabase.from("budget_assumptions").select("*").eq("case_id", caseId).maybeSingle(),
    supabase
      .from("parent_links")
      .select("id, kind, status, revoked_at")
      .eq("case_id", caseId)
      .eq("status", "active")
      .is("revoked_at", null),
  ]);

  const horizon = (asString(assumptions?.horizon) || "first_year") as CostHorizon;
  const nights = asNumber(assumptions?.nights_per_month) ?? 30;
  const lines = parseLines(assumptions?.lines);
  const funding = parseFunding(assumptions?.confirmed_funding);

  let programName: string | null = null;
  let universityName: string | null = null;
  let tuitionAmount: number | null = null;
  let tuitionCurrency: string | null = null;
  let fullProgramAmount: number | null = null;
  let housingMonthly: number | null = null;
  let housingCurrency: string | null = null;
  let housingEstimated = false;
  let mealsIncluded = false;

  if (programId) {
    const { data: program } = await supabase
      .from("catalog_programs_public")
      .select(
        "id, name, university_id, annual_tuition_amount, annual_tuition_currency, full_program_tuition_amount, full_program_tuition_currency",
      )
      .eq("id", programId)
      .maybeSingle();
    if (program) {
      programName = asString(program.name);
      tuitionAmount = asNumber(program.annual_tuition_amount);
      tuitionCurrency = asString(program.annual_tuition_currency) || null;
      fullProgramAmount = asNumber(program.full_program_tuition_amount);
      const { data: university } = await supabase
        .from("catalog_universities_public")
        .select("name")
        .eq("id", program.university_id)
        .maybeSingle();
      universityName = asString(university?.name) || null;
      const { data: housing } = await supabase
        .from("catalog_accommodations_public")
        .select("amount, currency, basis, meal_plan")
        .eq("university_id", program.university_id)
        .order("amount", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (housing) {
        const monthly = housingMonthlyAmount(
          asNumber(housing.amount),
          asString(housing.basis),
          nights,
        );
        housingMonthly = monthly.monthly;
        housingEstimated = monthly.estimated;
        housingCurrency = asString(housing.currency) || null;
        const mealPlan =
          typeof housing.meal_plan === "object" && housing.meal_plan !== null
            ? (housing.meal_plan as Record<string, unknown>)
            : {};
        mealsIncluded = mealPlan.included === true || mealPlan.meals === true;
      }
    }
  }

  if (mealsIncluded) {
    for (const line of lines) {
      if (line.kind === "meals") {
        line.includedInAccommodation = true;
      }
    }
  }

  const tuition = tuitionForHorizon(tuitionAmount, fullProgramAmount, horizon);
  const annual = annualComparisonAmount(tuition, housingMonthly);
  const sameCurrency =
    tuitionCurrency && housingCurrency && tuitionCurrency === housingCurrency
      ? tuitionCurrency
      : tuitionCurrency && !housingMonthly
        ? tuitionCurrency
        : null;
  const annualCurrency = annual === null ? null : sameCurrency;

  const { data: groups } = await supabase
    .from("application_groups")
    .select("id, system_id")
    .eq("case_id", caseId);
  let feeTotal: number | null = null;
  let feeCurrency: string | null = null;
  let feeNote = "No application group yet. A UCAS fee is once per system, not per university.";
  if (groups && groups.length > 0) {
    const subtotals: (number | null)[] = [];
    let lastCurrency: string | null = null;
    for (const group of groups) {
      const [{ data: rules }, { count }] = await Promise.all([
        supabase
          .from("application_fee_rules")
          .select("applies_to, kind, amount, currency, included_choices, source_fact_id")
          .eq("system_id", group.system_id),
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("group_id", group.id),
      ]);
      const assessed = assessApplicationFees(parseFeeRules(rules ?? []), count ?? 0);
      subtotals.push(assessed.total);
      lastCurrency = assessed.currency ?? lastCurrency;
    }
    if (subtotals.some((value) => value === null)) {
      feeTotal = null;
      feeNote = "An application-fee rule is unknown, so the fee total is not provided.";
    } else {
      feeTotal = subtotals.reduce<number>((sum, value) => sum + (value ?? 0), 0);
      feeCurrency = lastCurrency;
      feeNote = "System fees are counted once per application system.";
    }
  }

  const applicationLine: BudgetLine | null =
    feeTotal === null
      ? null
      : {
          kind: "application_fees",
          amount: feeTotal,
          currency: feeCurrency,
          basis: "one_off",
          includedInAccommodation: false,
        };
  const budgetLines = applicationLine
    ? [...lines.filter((line) => line.kind !== "application_fees"), applicationLine]
    : lines;
  const broader = broaderBudgetTotal(budgetLines);
  const planning = combinedPlanningTotal(annual, broader);

  const currencies = [
    annualCurrency,
    tuitionCurrency,
    housingCurrency,
    feeCurrency,
    ...budgetLines.map((line) => line.currency),
    asString(finance?.savings_currency) || null,
  ].filter((code): code is string => Boolean(code));

  const quotes: FxQuote[] = [];
  for (const code of [...new Set(currencies)]) {
    const cached = await latestQuote(supabase, code);
    if (cached && !isFxStale(cached.capturedAt)) {
      quotes.push(cached);
    }
  }
  const missing = [...new Set(currencies)].filter(
    (code) => !quotes.some((quote) => quote.base === code),
  );
  if (missing.length > 0 && context) {
    try {
      const fetched = await fetchUsdQuotes(missing);
      for (const quote of fetched) {
        quotes.push(quote);
        await upsertFxSnapshotCommand(context, {
          base: quote.base,
          quote: quote.quote,
          rate: quote.rate,
          provider: quote.provider,
          capturedAt: quote.capturedAt,
        });
      }
    } catch {
      // Missing FX stays unavailable. Never invent a rate.
    }
  }

  const quoteFor = (currency: string | null): FxQuote | null => {
    if (!currency) {
      return null;
    }
    if (currency === "USD") {
      return {
        base: "USD",
        quote: "USD",
        rate: 1,
        capturedAt: quotes[0]?.capturedAt ?? new Date().toISOString(),
        provider: quotes[0]?.provider ?? "local",
      };
    }
    return quotes.find((quote) => quote.base === currency) ?? null;
  };
  const toUsd = (amount: number | null, currency: string | null): number | null => {
    if (amount === null || !currency) {
      return null;
    }
    return convertWithQuote(amount, quoteFor(currency)).converted;
  };

  const annualUsd = toUsd(annual, annualCurrency);
  const broaderUsd = toUsd(broader, budgetLines.find((line) => line.currency)?.currency ?? annualCurrency);
  const savingsCurrency = asString(finance?.savings_currency) || null;
  const savingsUsd = finance?.savings_declined ? null : toUsd(asNumber(finance?.savings), savingsCurrency);
  const planningUsd =
    annual === null ? null : annualUsd === null ? null : annualUsd + (broaderUsd ?? 0);
  const fundingUsd: ConfirmedFunding[] = funding.map((row) => ({
    ...row,
    amount: row.amount === null ? null : toUsd(row.amount, "USD") ?? row.amount,
  }));
  const stale = quotes.some((quote) => isFxStale(quote.capturedAt));
  const fxAvailable =
    Boolean(finance?.savings_declined) ||
    ((annual === null || annualUsd !== null) &&
      (finance?.savings == null || savingsUsd !== null));
  const readiness = evaluateCostReadiness({
    savings: finance?.savings_declined ? null : savingsUsd,
    savingsDeclined: Boolean(finance?.savings_declined),
    confirmedFunding: fundingUsd,
    netExpense: netEstimatedExpense(planningUsd, fundingUsd),
    fxAvailable,
  });

  return {
    caseId: caseRow.id,
    studentName: asString(caseRow.student_name),
    version: asNumber(caseRow.version) ?? 1,
    module3Completed: typeof caseRow.module3_completed_at === "string",
    canWrite: isOwner || scopes.includes("finance.write"),
    programId,
    programName,
    universityName,
    horizon,
    nightsPerMonth: nights,
    annualComparison: {
      label: "Tuition and accommodation estimate",
      amount: annual,
      currency: annualCurrency,
      tuition: { amount: tuition, currency: tuitionCurrency },
      housing: { monthly: housingMonthly, currency: housingCurrency, estimated: housingEstimated },
      usd: annualUsd,
    },
    broader: {
      total: broader,
      currency: budgetLines.find((line) => line.currency)?.currency ?? null,
      usd: broaderUsd,
      lines: budgetLines,
    },
    planningTotal: planning,
    applicationFees: { total: feeTotal, currency: feeCurrency, note: feeNote },
    readiness,
    fx: {
      available: quotes.length > 0 || currencies.every((code) => code === "USD"),
      stale,
      capturedAt: quotes[0]?.capturedAt ?? null,
      provider: quotes[0]?.provider ?? null,
    },
    originalPlusUsd: [
      displayMoneyLine(annual, annualCurrency),
      annualUsd === null ? "USD snapshot unavailable" : `${annualUsd.toFixed(2)} USD`,
    ].join(" · "),
    parentLinks: (links ?? []).flatMap((row) =>
      typeof row.id === "string" ? [{ id: row.id, label: asString(row.kind) }] : [],
    ),
  };
}
