import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMMON_APP_SYSTEM,
  UCAS_SYSTEM,
  canUnlockRoadmap,
  deriveRoadmapTasks,
  openingOfficialSiteCompletesSubmission,
  roadmapLockReason,
} from "./roadmap";

const criteria = [
  { key: "standardized_test", kind: "test", revision: 2, mandatory: true },
  { key: "documents", kind: "document", revision: 2, mandatory: true },
];

describe("selected-target roadmap", () => {
  it("derives different tasks for UCAS and Common App", () => {
    const ucas = deriveRoadmapTasks({
      system: UCAS_SYSTEM,
      criteria,
      documents: [
        { purpose: "transcript", required: true, certifyOnce: false },
        { purpose: "apply_system_certification", required: true, certifyOnce: true },
      ],
      deadlines: [
        {
          scope: "system",
          kind: "equal_consideration",
          precision: "day",
          date: "2027-01-15",
          month: null,
        },
        {
          scope: "institution",
          kind: "college",
          precision: "day",
          date: "2027-01-10",
          month: null,
        },
      ],
      criteriaRevision: 2,
    });
    const common = deriveRoadmapTasks({
      system: COMMON_APP_SYSTEM,
      criteria,
      documents: [
        { purpose: "transcript", required: true, certifyOnce: false },
        { purpose: "apply_system_certification", required: true, certifyOnce: true },
      ],
      deadlines: [
        {
          scope: "system",
          kind: "equal_consideration",
          precision: "day",
          date: "2027-01-15",
          month: null,
        },
        {
          scope: "institution",
          kind: "college",
          precision: "day",
          date: "2027-01-10",
          month: null,
        },
      ],
      criteriaRevision: 2,
    });

    assert.ok(ucas.some((task) => task.sourceKey === "essay:one_statement:ucas"));
    assert.equal(ucas.some((task) => task.sourceKey.startsWith("essay:supplement")), false);
    assert.ok(ucas.some((task) => task.sourceKey === "fee:system:ucas"));
    assert.equal(ucas.some((task) => task.sourceKey === "fee:choice:ucas"), false);
    assert.ok(ucas.some((task) => task.sourceKey === "deadline:system:equal_consideration:ucas"));
    assert.equal(
      ucas.some((task) => task.sourceKey === "deadline:institution:college:ucas"),
      false,
    );
    assert.ok(ucas.some((task) => task.sourceKey === "document:transcript:ucas"));
    assert.equal(
      ucas.some((task) => task.sourceKey === "document:apply_system_certification:ucas"),
      false,
    );

    assert.ok(common.some((task) => task.sourceKey === "essay:shared_core:common_app"));
    assert.ok(common.some((task) => task.sourceKey === "essay:supplement:common_app"));
    assert.ok(common.some((task) => task.sourceKey === "fee:system:common_app"));
    assert.ok(common.some((task) => task.sourceKey === "fee:choice:common_app"));
    assert.ok(
      common.some((task) => task.sourceKey === "deadline:system:equal_consideration:common_app"),
    );
    assert.ok(common.some((task) => task.sourceKey === "deadline:institution:college:common_app"));
    assert.ok(common.some((task) => task.sourceKey === "document:transcript:common_app"));
    assert.ok(
      common.some((task) => task.sourceKey === "document:apply_system_certification:common_app"),
    );
    assert.ok(ucas.some((task) => task.sourceKey === "criterion:standardized_test:2"));
    assert.equal(openingOfficialSiteCompletesSubmission(), false);
  });

  it("stays locked until counseling and a chosen target exist", () => {
    assert.equal(
      canUnlockRoadmap({ counselingCompleted: true, hasSelectedTarget: false }),
      false,
    );
    assert.ok(
      roadmapLockReason({
        counselingCompleted: true,
        hasSelectedTarget: false,
      })?.includes("counseling"),
    );
    assert.equal(
      canUnlockRoadmap({ counselingCompleted: true, hasSelectedTarget: true }),
      true,
    );
  });
});
