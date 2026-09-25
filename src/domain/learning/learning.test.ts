import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyProgress,
  canTransitionContent,
  claimsAccreditedAward,
  counselorCanPublish,
  LEARNING_CATEGORIES,
  memberCanSeeContent,
  parentGuidanceIndependentlyDiscoverable,
  playerIsKeyboardAccessible,
  PLAYER_CONTROLS,
  resumePosition,
  ROLE_TUTORIAL_TOPICS,
  updatedContentAvailable,
  validateLearningCopy,
  videoCanPublish,
  videoCompletionReached,
  watchingVideoAwardsPoints,
} from "./learning";

describe("unpublished content is invisible", () => {
  it("hides draft, review and archived items from members", () => {
    assert.equal(memberCanSeeContent("draft", "overall", "student"), false);
    assert.equal(memberCanSeeContent("submitted", "overall", "student"), false);
    assert.equal(memberCanSeeContent("review", "overall", "student"), false);
    assert.equal(memberCanSeeContent("archived", "overall", "student"), false);
    assert.equal(memberCanSeeContent("published", "overall", "student"), true);
    assert.equal(memberCanSeeContent("published", "counselors", "student"), false);
    assert.equal(memberCanSeeContent("published", "students_parents", "parent"), true);
  });
});

describe("progress persistence", () => {
  it("resumes without completing unseen lessons and supports explicit reset", () => {
    const first = applyProgress({
      completedLessonIds: [],
      lessonId: "lesson-1",
      totalLessons: 3,
      reset: false,
    });
    assert.equal(first.state, "in_progress");
    assert.deepEqual(first.completedLessonIds, ["lesson-1"]);
    const second = applyProgress({
      completedLessonIds: first.completedLessonIds,
      lessonId: "lesson-2",
      totalLessons: 3,
      reset: false,
    });
    assert.equal(second.state, "in_progress");
    assert.equal(second.completedLessonIds.includes("lesson-3"), false);
    const done = applyProgress({
      completedLessonIds: second.completedLessonIds,
      lessonId: "lesson-3",
      totalLessons: 3,
      reset: false,
    });
    assert.equal(done.state, "completed");
    const reset = applyProgress({
      completedLessonIds: done.completedLessonIds,
      lessonId: "lesson-1",
      totalLessons: 3,
      reset: true,
    });
    assert.equal(reset.state, "not_started");
    assert.deepEqual(reset.completedLessonIds, []);
    assert.equal(resumePosition(42, 100), 42);
    assert.equal(resumePosition(200, 100), 100);
  });

  it("completes video at 90 percent or via transcript, and readings only when marked", () => {
    assert.equal(
      videoCompletionReached({
        format: "video",
        viewedRatio: 0.89,
        transcriptCompleted: false,
        markedComplete: false,
      }),
      false,
    );
    assert.equal(
      videoCompletionReached({
        format: "video",
        viewedRatio: 0.9,
        transcriptCompleted: false,
        markedComplete: false,
      }),
      true,
    );
    assert.equal(
      videoCompletionReached({
        format: "video",
        viewedRatio: 0.1,
        transcriptCompleted: true,
        markedComplete: false,
      }),
      true,
    );
    assert.equal(
      videoCompletionReached({
        format: "reading",
        viewedRatio: 1,
        transcriptCompleted: true,
        markedComplete: false,
      }),
      false,
    );
    assert.equal(
      updatedContentAvailable(1, 2, ["a"], ["a", "b"]),
      true,
    );
    assert.equal(watchingVideoAwardsPoints(), false);
  });
});

describe("player accessibility", () => {
  it("requires keyboard controls and captions or a transcript before video publish", () => {
    assert.equal(playerIsKeyboardAccessible(PLAYER_CONTROLS), true);
    assert.equal(playerIsKeyboardAccessible(["play", "pause"]), false);
    assert.equal(
      videoCanPublish({ captions: "", transcript: "", mediaReady: true }),
      false,
    );
    assert.equal(
      videoCanPublish({ captions: "", transcript: "Readable transcript.", mediaReady: false }),
      true,
    );
  });
});

describe("module 11 catalog rules", () => {
  it("covers every category and role tutorial family without accredited claims", () => {
    assert.equal(LEARNING_CATEGORIES.length, 7);
    assert.ok(ROLE_TUTORIAL_TOPICS.students_parents.length >= 5);
    assert.ok(ROLE_TUTORIAL_TOPICS.alumni_mentors.length >= 5);
    assert.ok(ROLE_TUTORIAL_TOPICS.counselors.length >= 4);
    assert.equal(parentGuidanceIndependentlyDiscoverable("parent_guidance"), true);
    assert.equal(counselorCanPublish(), false);
    assert.equal(canTransitionContent("draft", "published", "counselor"), false);
    assert.equal(canTransitionContent("submitted", "published", "publisher"), true);
    assert.equal(claimsAccreditedAward("Accredited diploma"), true);
    assert.equal(validateLearningCopy("How to register", "SYNTHETIC walk-through."), null);
    assert.equal(validateLearningCopy("Accredited course", "Summary"), "accredited");
  });
});
