import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveTourAudience } from "./tour";

describe("role-aware tour audience", () => {
  it("falls back to overall when the audience is missing or unknown", () => {
    assert.deepEqual(resolveTourAudience(null), { audience: "overall", fellBack: false });
    assert.deepEqual(resolveTourAudience("alumni"), { audience: "overall", fellBack: true });
    assert.equal(resolveTourAudience("student").audience, "student");
  });
});
