import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NOT_PROVIDED } from "../catalog/display";
import {
  GUEST_PREVIEW_CAP,
  availabilityLabel,
  bookmarkAddsFunding,
  filterScholarships,
  guestPreviewRows,
  isLabeledOpen,
  leftoverCountryCodes,
  paginateScholarships,
  scholarshipDeadlineLabel,
  type ScholarshipRecord,
} from "./scholarships";

function row(overrides: Partial<ScholarshipRecord> = {}): ScholarshipRecord {
  return {
    id: overrides.id ?? "s1",
    name: overrides.name ?? "SYNTHETIC - not real Award",
    providerName: overrides.providerName ?? "SYNTHETIC Provider",
    officialUrl: overrides.officialUrl ?? "https://example.invalid/award",
    providerType: overrides.providerType ?? "university",
    type: Object.hasOwn(overrides, "type") ? (overrides.type ?? null) : "merit",
    countryCodes: overrides.countryCodes ?? ["GB"],
    levels: overrides.levels ?? ["undergraduate"],
    fieldIds: overrides.fieldIds ?? ["20000000-0000-4000-8000-000000000001"],
    availability: overrides.availability ?? "open",
    deadlinePrecision: overrides.deadlinePrecision ?? "month",
    deadlineDate: overrides.deadlineDate ?? null,
    deadlineMonth: overrides.deadlineMonth ?? 9,
    eligibilityExcerpt: overrides.eligibilityExcerpt ?? "Sourced excerpt",
    verifiedAt: overrides.verifiedAt ?? "2026-09-01T00:00:00Z",
    withdrawnUrl: overrides.withdrawnUrl ?? false,
  };
}

describe("scholarship filter honesty", () => {
  it("does not let a field filter match empty or unverified field metadata", () => {
    const unverified = row({ fieldIds: [] });
    const matched = filterScholarships([unverified, row()], {
      fieldId: "20000000-0000-4000-8000-000000000001",
    });
    assert.equal(matched.length, 1);
    assert.equal(matched[0]?.id, "s1");
    assert.deepEqual(
      filterScholarships([row({ countryCodes: [] })], { country: "GB" }),
      [],
    );
    assert.deepEqual(filterScholarships([row({ type: null })], { type: "merit" }), []);
    assert.deepEqual(filterScholarships([row({ levels: [] })], { level: "undergraduate" }), []);
  });

  it("does not treat an empty field list as all fields", () => {
    assert.equal(
      filterScholarships([row({ fieldIds: [] })], {
        fieldId: "20000000-0000-4000-8000-000000000002",
      }).length,
      0,
    );
  });
});

describe("closed-award labelling", () => {
  it("never labels a closed or expired award as open", () => {
    assert.equal(availabilityLabel("closed"), "Closed");
    assert.equal(isLabeledOpen(availabilityLabel("closed")), false);
    assert.equal(availabilityLabel("unknown"), "Unknown");
    assert.equal(availabilityLabel("open"), "Open");
    assert.equal(
      availabilityLabel("open", { precision: "day", date: "2020-01-01" }, "2026-09-24"),
      "Closed",
    );
    assert.equal(
      isLabeledOpen(
        availabilityLabel("open", { precision: "day", date: "2020-01-01" }, "2026-09-24"),
      ),
      false,
    );
    assert.deepEqual(
      filterScholarships(
        [row({ availability: "open", deadlinePrecision: "day", deadlineDate: "2020-01-01" })],
        { availability: "open" },
      ),
      [],
    );
    assert.equal(
      filterScholarships(
        [row({ availability: "open", deadlinePrecision: "day", deadlineDate: "2020-01-01" })],
        { availability: "closed" },
      ).length,
      1,
    );
  });
});

describe("scholarship deadline precision", () => {
  it("keeps a month-only deadline as a month name", () => {
    assert.equal(
      scholarshipDeadlineLabel({
        deadlinePrecision: "month",
        deadlineDate: "2026-09-30",
        deadlineMonth: 9,
      }),
      "September",
    );
    assert.equal(
      scholarshipDeadlineLabel({
        deadlinePrecision: "unknown",
        deadlineDate: "2026-09-30",
        deadlineMonth: 9,
      }),
      NOT_PROVIDED,
    );
    assert.equal(
      scholarshipDeadlineLabel({
        deadlinePrecision: "day",
        deadlineDate: "2026-09-15",
        deadlineMonth: null,
      }),
      "2026-09-15",
    );
  });
});

describe("scholarship pagination bounds", () => {
  it("clamps page size and offset and slices the result set", () => {
    const rows = Array.from({ length: 60 }, (_, index) =>
      row({ id: `s${index}`, name: `Award ${index}` }),
    );
    const first = paginateScholarships(rows, 200, -4);
    assert.equal(first.page.limit, 50);
    assert.equal(first.page.offset, 0);
    assert.equal(first.slice.length, 50);
    assert.equal(first.total, 60);
    const next = paginateScholarships(rows, 20, 40);
    assert.equal(next.slice.length, 20);
    assert.equal(next.slice[0]?.id, "s40");
  });
});

describe("guest preview and bookmark funding", () => {
  it("caps the guest preview and never treats a bookmark as funding", () => {
    const rows = Array.from({ length: 12 }, (_, index) => row({ id: `s${index}` }));
    assert.equal(guestPreviewRows(rows, {}).length, GUEST_PREVIEW_CAP);
    assert.equal(bookmarkAddsFunding(), false);
    assert.deepEqual(leftoverCountryCodes("United States"), []);
    assert.deepEqual(leftoverCountryCodes("gb"), ["GB"]);
  });
});
