import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NEWS_TOPICS,
  applyEngagement,
  canAccessModerationQueue,
  canReadProtectedSafety,
  counselorCanSetPublicationStatus,
  followingDoesNotEnableWhatsApp,
  newsDateIsOfficialDeadline,
  nextModerationState,
  nextStoryState,
  privateJourneyNotifiesMentor,
  publicContentVisible,
  redactSafetyReview,
  searchIncludesItem,
  sharingGrantsCaseAccess,
  stalePublicPayload,
  storyCanPublish,
  storyPublicAttribution,
  validateNewsCopy,
  validateStoryCopy,
  withdrawRemovesFromDiscovery,
} from "./news";

const validNews = {
  title: "SYNTHETIC intake reminder",
  summary: "SYNTHETIC: a month-only deadline stays a month name.",
  topic: "intakes",
  sourceUrl: "https://example.invalid/intake",
};

describe("news copy and topics", () => {
  it("retains every Module 12 topic and requires a source for factual updates", () => {
    assert.equal(NEWS_TOPICS.length, 15);
    assert.equal(validateNewsCopy(validNews), null);
    assert.ok(
      validateNewsCopy({ ...validNews, sourceUrl: "" })?.includes("source URL"),
    );
    assert.equal(
      validateNewsCopy({
        ...validNews,
        topic: "new_app_features",
        sourceUrl: "",
      }),
      null,
    );
    assert.ok(validateNewsCopy({ ...validNews, summary: "x".repeat(281) }));
  });

  it("never treats an editorial date as an official deadline", () => {
    assert.equal(newsDateIsOfficialDeadline(), false);
  });
});

describe("publication visibility and search", () => {
  it("hides withdrawn and unpublished items from discovery and search", () => {
    assert.equal(publicContentVisible("published"), true);
    assert.equal(publicContentVisible("withdrawn"), false);
    assert.equal(publicContentVisible("draft"), false);
    assert.equal(publicContentVisible("archived"), false);
    assert.equal(withdrawRemovesFromDiscovery("withdrawn"), true);
    assert.equal(
      searchIncludesItem({
        state: "withdrawn",
        query: "intake",
        title: "SYNTHETIC intake reminder",
        summary: "hidden",
      }),
      false,
    );
    assert.equal(
      searchIncludesItem({
        state: "published",
        query: "intake",
        title: "SYNTHETIC intake reminder",
        summary: "hidden",
      }),
      true,
    );
    assert.equal(stalePublicPayload("news").unavailable, true);
    assert.ok(!("body" in stalePublicPayload("story")));
  });
});

describe("engagements and sharing", () => {
  it("retries converge on one save/like state and sharing grants no case access", () => {
    const once = applyEngagement(new Set(), "save", true);
    const twice = applyEngagement(once, "save", true);
    assert.deepEqual([...twice], ["save"]);
    assert.deepEqual([...applyEngagement(twice, "save", false)], []);
    assert.equal(sharingGrantsCaseAccess(), false);
    assert.equal(followingDoesNotEnableWhatsApp(), true);
    assert.equal(counselorCanSetPublicationStatus(), false);
  });
});

describe("success-story consent", () => {
  const consents = {
    publicationConsent: true,
    nameConsent: false,
    imageConsent: false,
    spotlightConsent: false,
    mentorNamed: false,
    mentorConsent: false,
    parentNamed: false,
    parentConsent: false,
  };

  it("keeps publication, name, image and spotlight consents independent", () => {
    assert.equal(
      storyCanPublish({ ...consents, adminApproved: true, spotlight: false }),
      true,
    );
    assert.equal(
      storyCanPublish({
        ...consents,
        publicationConsent: false,
        adminApproved: true,
        spotlight: false,
      }),
      false,
    );
    assert.equal(
      storyCanPublish({
        ...consents,
        adminApproved: false,
        spotlight: false,
      }),
      false,
    );
    assert.equal(
      storyCanPublish({
        ...consents,
        spotlightConsent: false,
        adminApproved: true,
        spotlight: true,
      }),
      false,
    );
    assert.equal(
      storyCanPublish({
        ...consents,
        spotlightConsent: true,
        adminApproved: true,
        spotlight: true,
      }),
      true,
    );
    assert.equal(
      storyPublicAttribution({ nameConsent: false, displayName: "Amina Example" }),
      null,
    );
    assert.equal(
      storyPublicAttribution({ nameConsent: true, displayName: "Amina Example" }),
      "Amina Example",
    );
    assert.equal(
      storyCanPublish({
        ...consents,
        mentorNamed: true,
        mentorConsent: false,
        adminApproved: true,
        spotlight: false,
      }),
      false,
    );
    assert.equal(privateJourneyNotifiesMentor(), false);
    assert.ok(validateStoryCopy({ title: "Title", body: "x".repeat(3001) }));
  });

  it("withdraws immediately and returns changes on rejection", () => {
    assert.equal(nextStoryState("draft", "submit"), "submitted");
    assert.equal(nextStoryState("consent_check", "request_changes"), "changes_requested");
    assert.equal(nextStoryState("published", "withdraw"), "withdrawn");
  });
});

describe("moderation access", () => {
  it("hides protected safety from routine moderators", () => {
    assert.equal(canAccessModerationQueue(["catalog_editorial"]), true);
    assert.equal(canAccessModerationQueue(["safety"]), true);
    assert.equal(canAccessModerationQueue(["operations"]), false);
    assert.equal(canReadProtectedSafety(false), false);
    assert.equal(canReadProtectedSafety(true), true);
    assert.equal(
      redactSafetyReview({
        isProtected: true,
        hasSafetyPermission: false,
        evidence: "private complaint",
      }),
      null,
    );
    assert.equal(
      redactSafetyReview({
        isProtected: true,
        hasSafetyPermission: true,
        evidence: "private complaint",
      }),
      "private complaint",
    );
    assert.equal(nextModerationState("open", "publish"), "resolved");
    assert.equal(nextModerationState("open", "escalate"), "escalated");
    assert.equal(nextModerationState("in_review", "request_revision"), "revision_requested");
  });
});
