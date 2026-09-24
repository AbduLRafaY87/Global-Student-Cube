import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  annualComparisonAmount,
  housingMonthlyAmount,
  tuitionForHorizon,
} from "./annual";
import {
  broaderBudgetTotal,
  combinedPlanningTotal,
  type BudgetLine,
} from "./budget";
import { assessApplicationFees, sumKnownFeeSubtotals } from "./fees";
import { convertWithQuote, isFxStale, usdRateFromUsdBaseTable } from "./fx";
import { ANNUAL_COMPARISON_LABEL, displayMoneyAmount, minorUnits } from "./money";
import {
  evaluateCostReadiness,
  netEstimatedExpense,
  selectedScholarshipAddsFunding,
} from "./readiness";

function line(
  kind: BudgetLine["kind"],
  amount: number | null,
  included = false,
  basis: BudgetLine["basis"] = "annual",
): BudgetLine {
  return {
    kind,
    amount,
    currency: amount === null ? null : "USD",
    basis,
    includedInAccommodation: included,
  };
}

describe("annual comparison", () => {
  it("adds annual tuition and twelve monthly accommodation payments", () => {
    assert.equal(annualComparisonAmount(12000, 500), 18000);
    assert.equal(annualComparisonAmount(18000, 800), 27600);
  });

  it("stays unknown when tuition or housing is missing, and never uses full-program as a silent annual", () => {
    assert.equal(annualComparisonAmount(null, 500), null);
    assert.equal(annualComparisonAmount(12000, null), null);
    assert.equal(tuitionForHorizon(18000, 72000, "first_year"), 18000);
    assert.equal(tuitionForHorizon(18000, 72000, "full_program"), 72000);
    assert.equal(tuitionForHorizon(18000, null, "full_program"), null);
    assert.equal(ANNUAL_COMPARISON_LABEL.includes("total cost of attendance"), false);
  });

  it("estimates nightly housing with a disclosed nights assumption", () => {
    assert.deepEqual(housingMonthlyAmount(40, "nightly", 30), { monthly: 1200, estimated: true });
    assert.deepEqual(housingMonthlyAmount(800, "monthly", 30), { monthly: 800, estimated: false });
    assert.deepEqual(housingMonthlyAmount(40, "unknown", 30), { monthly: null, estimated: false });
  });
});

describe("broader budget and double-count prevention", () => {
  it("keeps the broader budget separate from the annual comparison", () => {
    const broader = broaderBudgetTotal([
      line("meals", 2400),
      line("transport", 1200),
      line("insurance", 600),
      line("visa", 300, false, "one_off"),
    ]);
    assert.equal(broader, 4500);
    assert.equal(combinedPlanningTotal(27600, broader), 32100);
    assert.equal(combinedPlanningTotal(18000, broader), 22500);
  });

  it("does not charge a meal already included in accommodation", () => {
    const withIncludedMeal = broaderBudgetTotal([
      line("meals", 2400, true),
      line("transport", 1200),
    ]);
    assert.equal(withIncludedMeal, 1200);
    assert.equal(broaderBudgetTotal([line("meals", 2400, true)]), null);
  });

  it("charges a UCAS system fee once, not per university", () => {
    const assessed = assessApplicationFees(
      [
        {
          appliesTo: "system",
          kind: "ucas",
          amount: 28.5,
          currency: "GBP",
          includedChoices: null,
          sourceFactId: "fact-ucas",
        },
        {
          appliesTo: "system",
          kind: "ucas",
          amount: 28.5,
          currency: "GBP",
          includedChoices: null,
          sourceFactId: "fact-ucas",
        },
      ],
      5,
    );
    assert.equal(assessed.lines.length, 1);
    assert.equal(assessed.total, 28.5);
  });

  it("charges only extra choice-scoped fees after included choices", () => {
    const assessed = assessApplicationFees(
      [
        {
          appliesTo: "choice",
          kind: "extra_school",
          amount: 50,
          currency: "USD",
          includedChoices: 4,
          sourceFactId: "fact-extra",
        },
      ],
      6,
    );
    assert.equal(assessed.total, 100);
    assert.equal(sumKnownFeeSubtotals([28.5, null]), null);
  });
});

describe("FX snapshots", () => {
  const captured = "2026-09-21T12:00:00.000Z";

  it("treats a quote older than 72 hours as stale and an exact 72h quote as fresh", () => {
    const now = new Date("2026-09-24T12:00:00.001Z");
    assert.equal(isFxStale(captured, now), true);
    assert.equal(isFxStale(captured, new Date("2026-09-24T12:00:00.000Z")), false);
  });

  it("never invents a 1:1 rate when the quote is missing", () => {
    assert.equal(usdRateFromUsdBaseTable("EUR", null), null);
    assert.equal(convertWithQuote(100, null).converted, null);
    assert.equal(usdRateFromUsdBaseTable("USD", null), 1);
    const quote = {
      base: "XYZ",
      quote: "USD",
      rate: 0.1,
      capturedAt: captured,
      provider: "exchangerate-api",
    };
    assert.equal(convertWithQuote(240000, quote).converted, 24000);
  });
});

describe("readiness and funding", () => {
  it("shows 120% when reserves are 120 and expense is 100, while the bar caps at 100", () => {
    const result = evaluateCostReadiness({
      savings: 120,
      savingsDeclined: false,
      confirmedFunding: [],
      netExpense: 100,
      fxAvailable: true,
    });
    assert.equal(result.status, "known");
    assert.equal(result.percent, 120);
    assert.equal(result.displayPercent, "120.0");
    assert.equal(result.barValue, 100);
  });

  it("uses the SYNTHETIC budget example and one-decimal display", () => {
    const net = netEstimatedExpense(32100, [
      { amount: 5000, confirmed: true, alreadyInSavings: false },
    ]);
    assert.equal(net, 27100);
    const result = evaluateCostReadiness({
      savings: 24000,
      savingsDeclined: false,
      confirmedFunding: [],
      netExpense: net,
      fxAvailable: true,
    });
    assert.equal(result.displayPercent, "88.6");
  });

  it("applies a confirmed scholarship once and never treats a selection as automatic funding", () => {
    assert.equal(selectedScholarshipAddsFunding(true, false), false);
    assert.equal(selectedScholarshipAddsFunding(true, true), true);
    const net = netEstimatedExpense(18000, [
      { amount: 2000, confirmed: true, alreadyInSavings: false },
      { amount: 2000, confirmed: true, alreadyInSavings: true },
    ]);
    assert.equal(net, 16000);
    const withUnconfirmed = netEstimatedExpense(18000, [
      { amount: 5000, confirmed: false, alreadyInSavings: false },
    ]);
    assert.equal(withUnconfirmed, 18000);
  });

  it("gives no score for zero, unknown, or declined savings", () => {
    assert.equal(
      evaluateCostReadiness({
        savings: 100,
        savingsDeclined: false,
        confirmedFunding: [],
        netExpense: 0,
        fxAvailable: true,
      }).status,
      "invalid_denominator",
    );
    assert.equal(
      evaluateCostReadiness({
        savings: 100,
        savingsDeclined: false,
        confirmedFunding: [],
        netExpense: null,
        fxAvailable: true,
      }).percent,
      null,
    );
    assert.equal(
      evaluateCostReadiness({
        savings: null,
        savingsDeclined: true,
        confirmedFunding: [],
        netExpense: 18000,
        fxAvailable: true,
      }).status,
      "savings_declined",
    );
  });
});

describe("currency minor units", () => {
  it("keeps JPY whole and BHD three decimals while calculations stay unrounded", () => {
    assert.equal(minorUnits("JPY"), 0);
    assert.equal(minorUnits("BHD"), 3);
    assert.equal(minorUnits("USD"), 2);
    assert.equal(displayMoneyAmount(1500, "JPY"), "1500");
    assert.equal(displayMoneyAmount(1.2, "BHD"), "1.200");
    assert.equal(displayMoneyAmount(88.5608856089, "USD"), "88.56");
  });
});
