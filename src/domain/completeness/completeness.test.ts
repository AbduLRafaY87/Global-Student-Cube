import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { screenCounts, SPEC_SCREENS } from "./screens";

const EXPECTED_IDS = [
  ...["PUB-01", "PUB-02", "PUB-03", "PUB-04", "PUB-05", "PUB-06"],
  ...["AUTH-01", "AUTH-02", "AUTH-03", "AUTH-04", "AUTH-05", "AUTH-06", "AUTH-07", "AUTH-08", "AUTH-09", "AUTH-10"],
  ...["STU-01", "STU-02", "STU-03", "STU-04", "STU-05", "STU-06", "STU-07"],
  ...["PAR-01", "PAR-02", "PAR-03"],
  ...["CAT-01", "CAT-02", "CAT-03", "CAT-04", "CAT-05", "CAT-06", "CAT-07", "CAT-08"],
  ...["SES-01", "SES-02", "SES-03", "SES-04", "SES-05", "SES-06", "SES-07", "SES-08", "SES-09", "SES-10", "SES-11", "SES-12"],
  ...["MEN-01", "MEN-02", "MEN-03", "MEN-04", "MEN-05", "MEN-06", "MEN-07"],
  ...["COU-01", "COU-02", "COU-03", "COU-04", "COU-05", "COU-06", "COU-07", "COU-08"],
  ...["MSG-01", "MSG-02"],
  ...["ADM-01", "ADM-02", "ADM-03", "ADM-04", "ADM-05", "ADM-06", "ADM-07", "ADM-08", "ADM-09", "ADM-10", "ADM-11", "ADM-12", "ADM-13", "ADM-14", "ADM-15"],
  ...["REW-01", "REW-02", "REW-03", "REW-04"],
  ...["LRN-01", "LRN-02", "LRN-03"],
  ...["NEW-01", "NEW-02", "NEW-03"],
  ...["JRN-01", "JRN-02", "JRN-03"],
  ...["SET-01", "SET-02", "SET-03", "SET-04", "SET-05", "SET-06"],
];

describe("spec screen completeness inventory", () => {
  it("lists every AUTH/PUB/STU/PAR/CAT/SES/MEN/COU/MSG/ADM/REW/LRN/NEW/JRN/SET screen once", () => {
    assert.deepEqual(
      SPEC_SCREENS.map((row) => row.id),
      EXPECTED_IDS,
    );
    assert.equal(SPEC_SCREENS.length, 97);
  });

  it("does not mark the product complete while not-started or partial screens remain", () => {
    const counts = screenCounts();
    assert.deepEqual(counts, {
      written_unverified: 84,
      partial: 2,
      not_started: 10,
      removed: 1,
      deferred: 0,
    });
    assert.equal(existsSync(path.join(process.cwd(), "src/app/page.tsx")), true);
    assert.equal(existsSync(path.join(process.cwd(), "src/app/(auth)/login/page.tsx")), true);
    assert.equal(existsSync(path.join(process.cwd(), "src/app/settings/preferences/page.tsx")), false);
    assert.equal(existsSync(path.join(process.cwd(), "src/app/(dashboard)/settings/preferences/page.tsx")), false);
    assert.equal(existsSync(path.join(process.cwd(), "src/app/counselors/page.tsx")), false);
    const trace = readFileSync(path.join(process.cwd(), "docs/release/traceability.md"), "utf8");
    assert.match(trace, /NEEDS HUMAN/);
    assert.match(trace, /SES-01/);
    assert.match(trace, /SET-02/);
  });
});
