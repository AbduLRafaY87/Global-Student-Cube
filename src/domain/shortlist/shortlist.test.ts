import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAP_REACHED_MESSAGE,
  RECOMMENDATION_NOT_SAVED_COPY,
  RECOMMENDATION_SLOT_CAP,
  SAVED_PAIR_CAP,
  alreadySaved,
  canAllocateSavedSlot,
  reviewFlagAllowed,
  saveControlState,
  savedCount,
} from "./shortlist";

describe("saved shortlist cap", () => {
  it("caps saved university+program pairs at three and keeps recommendations separate", () => {
    assert.equal(SAVED_PAIR_CAP, 3);
    assert.equal(RECOMMENDATION_SLOT_CAP, 10);
    assert.equal(RECOMMENDATION_NOT_SAVED_COPY.includes("not saved slots"), true);
    assert.equal(canAllocateSavedSlot(2, false), true);
    assert.equal(canAllocateSavedSlot(3, false), false);
    assert.equal(canAllocateSavedSlot(3, true), true);
    assert.equal(
      savedCount([
        { universityId: "u1", programId: "p1" },
        { universityId: "u1", programId: "p1" },
      ]),
      1,
    );
    assert.equal(alreadySaved([{ universityId: "u1", programId: "p1" }], "u1", "p1"), true);
  });

  it("allows a review flag only on a saved pair", () => {
    assert.equal(reviewFlagAllowed(true), true);
    assert.equal(reviewFlagAllowed(false), false);
  });

  it("does not enable save from the UI when Module 3 is incomplete or the cap is reached", () => {
    assert.equal(
      saveControlState({
        signedIn: true,
        module3Completed: false,
        canWrite: true,
        savedCount: 0,
        alreadySaved: false,
      }).enabled,
      false,
    );
    const capped = saveControlState({
      signedIn: true,
      module3Completed: true,
      canWrite: true,
      savedCount: 3,
      alreadySaved: false,
    });
    assert.equal(capped.enabled, false);
    assert.equal(capped.reason, CAP_REACHED_MESSAGE);
  });
});
