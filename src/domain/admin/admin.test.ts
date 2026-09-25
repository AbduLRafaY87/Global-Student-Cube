import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { visibleOverviewQueues } from "./overview";
import { canAccessAdminRoute } from "./permissions";
import {
  counselorIsProspectivelyAvailable,
  decisionRequiresReason,
  isEscalationDue,
  isOpenVerificationState,
  kindFromAccountRole,
} from "./verification";

describe("admin route scopes", () => {
  it("denies students, parents, counselors, and admins without MFA", () => {
    assert.equal(
      canAccessAdminRoute("student", "aal2", ["operations"], "users"),
      false,
    );
    assert.equal(
      canAccessAdminRoute("parent", "aal2", ["operations"], "users"),
      false,
    );
    assert.equal(
      canAccessAdminRoute("counselor", "aal2", ["verification"], "approvals"),
      false,
    );
    assert.equal(
      canAccessAdminRoute("admin", "aal1", ["operations"], "users"),
      false,
    );
  });

  it("denies an admin who lacks the route scope", () => {
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["operations"], "approvals"),
      false,
    );
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["verification"], "users"),
      false,
    );
  });

  it("allows an admin with MFA and the matching scope", () => {
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["verification"], "approvals"),
      true,
    );
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["operations"], "audit"),
      true,
    );
    assert.equal(canAccessAdminRoute("admin", "aal2", [], "overview"), true);
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["catalog_editorial"], "catalog"),
      true,
    );
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["operations"], "catalog"),
      false,
    );
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["rewards_approval"], "rewards"),
      true,
    );
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["operations"], "rewards"),
      false,
    );
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["catalog_editorial"], "content"),
      true,
    );
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["catalog_editorial"], "moderation"),
      true,
    );
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["safety"], "moderation"),
      false,
    );
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["operations"], "analytics"),
      true,
    );
    assert.equal(
      canAccessAdminRoute("admin", "aal2", ["verification"], "analytics"),
      false,
    );
  });
});

describe("permission-aware overview", () => {
  it("shows catalog review queues only with catalog_editorial", () => {
    const queues = visibleOverviewQueues(["catalog_editorial"], {
      ingestion_review: 2,
      catalog_review_due: 1,
    });
    assert.deepEqual(
      queues.map((queue) => queue.id),
      ["ingestion_review", "catalog_review_due", "moderation_review"],
    );
  });

  it("omits unpermitted queues instead of showing zero", () => {
    const queues = visibleOverviewQueues(["operations"], {
      professional_review: 4,
      guardian_review: 2,
      escalations: 1,
      recent_audit: 3,
    });
    assert.deepEqual(
      queues.map((queue) => queue.id),
      ["recent_audit"],
    );
    assert.equal(queues[0]?.count, 3);
  });

  it("shows a permitted empty queue as zero", () => {
    const queues = visibleOverviewQueues(["verification"], {
      professional_review: 0,
    });
    assert.equal(queues.some((queue) => queue.id === "professional_review"), true);
    assert.equal(
      queues.find((queue) => queue.id === "professional_review")?.count,
      0,
    );
    assert.equal(queues.some((queue) => queue.id === "escalations"), false);
  });
});

describe("verification rules", () => {
  it("maps professional roles and never invents a student queue kind", () => {
    assert.equal(kindFromAccountRole("counselor"), "counselor");
    assert.equal(kindFromAccountRole("alumni"), "mentor");
    assert.equal(kindFromAccountRole("student"), null);
    assert.equal(kindFromAccountRole("parent"), null);
  });

  it("requires a reason on approve and reject", () => {
    assert.equal(decisionRequiresReason("approved"), true);
    assert.equal(decisionRequiresReason("rejected"), true);
    assert.equal(decisionRequiresReason("needs_information"), false);
    assert.equal(isOpenVerificationState("pending"), true);
    assert.equal(isOpenVerificationState("approved"), false);
  });

  it("treats a seven-day-old case as supervisor-due", () => {
    const now = new Date("2026-09-24T00:00:00.000Z");
    assert.equal(isEscalationDue(new Date("2026-09-17T00:00:00.000Z"), now), true);
    assert.equal(isEscalationDue(new Date("2026-09-25T00:00:00.000Z"), now), false);
  });

  it("removes a suspended counselor from prospective access immediately", () => {
    assert.equal(
      counselorIsProspectivelyAvailable({
        accountStatus: "suspended",
        hasCounselorRole: true,
        verificationState: "approved",
      }),
      false,
    );
    assert.equal(
      counselorIsProspectivelyAvailable({
        accountStatus: "approved",
        hasCounselorRole: true,
        verificationState: "approved",
      }),
      true,
    );
    assert.equal(
      counselorIsProspectivelyAvailable({
        accountStatus: "approved",
        hasCounselorRole: true,
        verificationState: "pending",
      }),
      false,
    );
  });
});
