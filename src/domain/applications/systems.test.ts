import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupStateFromLeftoverStatus,
  isFilePurpose,
  isPublishedApplicationSystem,
} from "./systems";

describe("application group backfill", () => {
  it("keeps leftover outcomes on the choice and maps group state", () => {
    assert.equal(groupStateFromLeftoverStatus("draft"), "draft");
    assert.equal(groupStateFromLeftoverStatus("submitted"), "submitted");
    assert.equal(groupStateFromLeftoverStatus("accepted"), "closed");
    assert.equal(groupStateFromLeftoverStatus("rejected"), "closed");
  });

  it("hides only the synthetic leftover catch-all from published systems", () => {
    assert.equal(isPublishedApplicationSystem("direct"), true);
    assert.equal(isPublishedApplicationSystem("ucas"), true);
    assert.equal(isPublishedApplicationSystem("legacy_unmapped"), false);
  });

  it("extends files.purpose with apply-specific values", () => {
    assert.equal(isFilePurpose("transcript"), true);
    assert.equal(isFilePurpose("apply_vpd"), true);
    assert.equal(isFilePurpose("made_up"), false);
  });
});
