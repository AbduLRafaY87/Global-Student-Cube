import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveCaseGrants,
  isolateChildRows,
  isActiveParentLink,
  linkKindForStudentAge,
  parentCan,
  visibleCasesForParent,
} from "./access";

describe("parent case access", () => {
  it("shows a parent without an active link nothing", () => {
    assert.equal(isActiveParentLink({ status: "invited", revokedAt: null }), false);
    assert.deepEqual(
      visibleCasesForParent([
        { caseId: "case-a", linkActive: false },
        { caseId: "case-b", linkActive: false },
      ]),
      [],
    );
    assert.deepEqual(deriveCaseGrants(["finance.read"], false), []);
  });

  it("drops access immediately when the link is revoked", () => {
    assert.equal(
      isActiveParentLink({ status: "active", revokedAt: "2026-09-24T00:00:00Z" }),
      false,
    );
    assert.equal(parentCan(["finance.read", "profile.read"], "finance.read", false), false);
    assert.deepEqual(deriveCaseGrants(["finance.read"], false), []);
  });

  it("enforces scope boundaries", () => {
    const scopes = deriveCaseGrants(["profile.read"], true);
    assert.equal(parentCan(scopes, "profile.read", true), true);
    assert.equal(parentCan(scopes, "finance.read", true), false);
    assert.equal(parentCan(scopes, "finance.write", true), false);
    assert.ok(deriveCaseGrants(["finance.write"], true).includes("finance.read"));
  });

  it("isolates two children so one case never leaks the other", () => {
    const rows = [
      { caseId: "child-a", title: "A" },
      { caseId: "child-b", title: "B" },
    ];
    assert.deepEqual(isolateChildRows(rows, "child-a"), [{ caseId: "child-a", title: "A" }]);
    assert.equal(isolateChildRows(rows, "child-b")[0]?.title, "B");
    assert.equal(linkKindForStudentAge(16), "verified_guardian");
    assert.equal(linkKindForStudentAge(18), "adult_authorized");
  });
});
