import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canCompleteModule3,
  evaluateReadiness,
  validateFinancialSection,
  validateMoneyField,
  type FinancialInput,
} from "./finance";

function validFinance(overrides: Partial<FinancialInput> = {}): FinancialInput {
  return {
    occupation: "Teacher",
    income: null,
    incomeCurrency: null,
    incomeDeclined: true,
    savings: null,
    savingsCurrency: null,
    savingsDeclined: true,
    housing: {
      disclosure: "declined",
      status: "",
      structure: "",
      structureOther: "",
      construction: "",
      rooms: "",
    },
    sponsorAvailable: "prefer_not",
    incomeProofAvailable: "prefer_not",
    ...overrides,
  };
}

describe("financial disclosure", () => {
  it("lets an explicit decline complete the financial section", () => {
    assert.deepEqual(validateFinancialSection(validFinance()), []);
    assert.equal(canCompleteModule3(validFinance()), true);
  });

  it("treats a missing disclosure choice as unfinished, not zero", () => {
    const errors = validateMoneyField(null, null, null, "income");
    assert.equal(errors[0]?.code, "REQUIRED");
    assert.equal(canCompleteModule3(validFinance({ incomeDeclined: null })), false);
  });

  it("stores a declined amount as empty and never adds income to savings", () => {
    const declinedWithZero = validateMoneyField(0, "USD", true, "savings");
    assert.equal(declinedWithZero[0]?.code, "DECLINED_NULL");

    const readiness = evaluateReadiness({
      savings: 22500,
      savingsDeclined: false,
      annualComparison: 18000,
      fxAvailable: true,
    });
    assert.equal(readiness.status, "known");
    assert.equal(readiness.percent, 125);
    const withIncomeIgnored = evaluateReadiness({
      savings: 22500,
      savingsDeclined: false,
      annualComparison: 18000,
      fxAvailable: true,
    });
    assert.equal(withIncomeIgnored.percent, readiness.percent);
  });

  it("keeps readiness Unknown when savings are declined", () => {
    const result = evaluateReadiness({
      savings: null,
      savingsDeclined: true,
      annualComparison: 18000,
      fxAvailable: true,
    });
    assert.equal(result.status, "savings_declined");
    assert.equal(result.percent, null);
  });

  it("does not divide by a zero or missing expense", () => {
    assert.equal(
      evaluateReadiness({
        savings: 100,
        savingsDeclined: false,
        annualComparison: 0,
        fxAvailable: true,
      }).status,
      "invalid_denominator",
    );
    assert.equal(
      evaluateReadiness({
        savings: 100,
        savingsDeclined: false,
        annualComparison: null,
        fxAvailable: true,
      }).status,
      "incomplete_costs",
    );
  });
});
