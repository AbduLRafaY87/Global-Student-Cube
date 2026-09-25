import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { CATALOGUE_CASES, CATALOGUE_IDS } from "./cases";

const ROOT = path.resolve(process.cwd());

function expectedIds(): string[] {
  return Array.from({ length: 116 }, (_, index) => `T${String(index + 1).padStart(3, "0")}`);
}

describe("specified test catalogue", () => {
  it("registers T001–T116 exactly once", () => {
    assert.deepEqual([...CATALOGUE_IDS].sort(), expectedIds());
    assert.equal(new Set(CATALOGUE_IDS).size, 116);
  });

  it("points every automated case at an existing evidence file", () => {
    for (const item of CATALOGUE_CASES) {
      if (!item.automated) {
        assert.equal(item.layer === "manual" || item.layer === "na", true, item.id);
        continue;
      }
      assert.ok(item.evidencePath, item.id);
      assert.equal(existsSync(path.join(ROOT, item.evidencePath ?? "")), true, item.id);
    }
  });

  it("keeps D2-removed approval cases as not-applicable", () => {
    const removed = CATALOGUE_CASES.filter((row) => row.id === "T007" || row.id === "T014");
    assert.equal(removed.length, 2);
    for (const item of removed) {
      assert.equal(item.automated, false);
      assert.equal(item.layer, "na");
    }
  });

  it("lists every catalogue id in the release evidence tables", () => {
    const evidence = readFileSync(path.join(ROOT, "docs/release/test-evidence.md"), "utf8");
    for (const id of CATALOGUE_IDS) {
      assert.match(evidence, new RegExp(`\\| ${id} \\|`), id);
    }
  });
});
