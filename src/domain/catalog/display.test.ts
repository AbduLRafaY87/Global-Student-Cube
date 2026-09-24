import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANNUAL_COMPARISON_LABEL,
  NOT_PROVIDED,
  comparableAnnualSum,
  displayDeadline,
  displayMoney,
  monthlyAccommodation,
} from "./display";

describe("catalog display rules", () => {
  it("renders a month-only deadline as the month name", () => {
    assert.equal(displayDeadline({ precision: "month", date: "2026-01-31", month: 9 }), "September");
    assert.equal(displayDeadline({ precision: "unknown", date: "2026-01-31", month: 9 }), NOT_PROVIDED);
    assert.equal(displayDeadline({ precision: "day", date: "2026-09-15", month: null }), "2026-09-15");
  });

  it("does not invent a comparable annual sum from mixed or missing money", () => {
    assert.equal(comparableAnnualSum(18000, "USD", 800, "USD"), 27600);
    assert.equal(comparableAnnualSum(18000, "USD", 800, "GBP"), null);
    assert.equal(comparableAnnualSum(18000, "USD", null, "USD"), null);
    assert.equal(displayMoney(null, "USD"), NOT_PROVIDED);
    assert.equal(ANNUAL_COMPARISON_LABEL.includes("Total cost of attendance"), false);
  });

  it("estimates nightly accommodation as 30 nights and labels it estimated", () => {
    assert.deepEqual(monthlyAccommodation(40, "GBP", "nightly"), {
      monthly: 1200,
      currency: "GBP",
      estimated: true,
    });
    assert.deepEqual(monthlyAccommodation(800, "GBP", "monthly"), {
      monthly: 800,
      currency: "GBP",
      estimated: false,
    });
  });
});
