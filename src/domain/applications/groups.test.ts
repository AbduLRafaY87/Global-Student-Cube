import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NOT_PROVIDED } from "../catalog/display";
import {
  groupDeadlineRows,
  groupFeeTotal,
  sharedDocumentItems,
  systemDeadlineCount,
  type DeadlineFact,
  type DocumentRequirementFact,
} from "./groups";

function deadline(overrides: Partial<DeadlineFact> = {}): DeadlineFact {
  return {
    id: overrides.id ?? "d1",
    systemId: overrides.systemId ?? "ucas",
    scope: overrides.scope ?? "system",
    universityId: overrides.universityId ?? null,
    programId: overrides.programId ?? null,
    kind: overrides.kind ?? "equal_consideration",
    precision: overrides.precision ?? "day",
    date: overrides.date ?? "2027-01-15",
    month: overrides.month ?? null,
  };
}

describe("deadline grouping", () => {
  it("shows one UCAS system deadline for five course choices", () => {
    const rows = groupDeadlineRows({
      systemName: "UCAS",
      deadlines: [deadline(), deadline({ id: "d2" })],
    });
    assert.equal(rows.length, 1);
    assert.equal(systemDeadlineCount(rows), 1);
    assert.equal(rows[0]?.layer, "system");
    assert.equal(rows[0]?.sourceLabel, "UCAS · equal consideration");
    assert.equal(rows[0]?.urgencyDate, "2027-01-15");
  });

  it("lists institution exceptions beside the system date and keeps month precision as a label", () => {
    const rows = groupDeadlineRows({
      systemName: "UCAS",
      deadlines: [
        deadline(),
        deadline({
          id: "inst",
          scope: "institution",
          universityId: "u1",
          kind: "college_deadline",
        }),
        deadline({
          id: "month",
          scope: "program",
          programId: "p1",
          kind: "course_deadline",
          precision: "month",
          date: null,
          month: 9,
        }),
      ],
    });
    assert.equal(rows.length, 3);
    assert.equal(systemDeadlineCount(rows), 1);
    const month = rows.find((row) => row.layer === "program");
    assert.equal(month?.when, "September");
    assert.equal(month?.urgencyDate, null);
  });
});

describe("per-system fee totals and shared documents", () => {
  it("adds a system fee once and leaves the total unknown when a material amount is missing", () => {
    const known = groupFeeTotal({
      choiceCount: 5,
      rules: [
        {
          id: "f1",
          appliesTo: "system",
          kind: "ucas_apply",
          amount: 28.5,
          currency: "GBP",
          includedChoices: null,
        },
      ],
    });
    assert.equal(known.unknown, false);
    assert.equal(known.label, "28.50 GBP");

    const unknown = groupFeeTotal({
      choiceCount: 3,
      rules: [
        {
          id: "f2",
          appliesTo: "system",
          kind: "vpd",
          amount: null,
          currency: null,
          includedChoices: null,
        },
      ],
    });
    assert.equal(unknown.unknown, true);
    assert.equal(unknown.label, NOT_PROVIDED);
    assert.equal(unknown.totalAmount, null);
  });

  it("treats a uni-assist certification as one item, not one per university", () => {
    const requirements: DocumentRequirementFact[] = [
      {
        id: "cert",
        purpose: "apply_system_certification",
        required: true,
        certifyOnce: true,
        universityId: null,
        programId: null,
      },
    ];
    const items = sharedDocumentItems(requirements, 4);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.sharedOnce, true);
    assert.equal(items[0]?.copies, 1);
  });
});
