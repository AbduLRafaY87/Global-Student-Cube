import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG_PAGE_MAX, isExcludedPublicField } from "../catalog/catalog";
import { SIGNED_DOWNLOAD_SECONDS, validateFileUpload } from "../profile/files";
import { SAVED_PAIR_CAP } from "../shortlist/shortlist";
import { RECOMMENDATION_CAP } from "../recommendations/recommendations";
import { LOGIN_MAX_ATTEMPTS } from "../identity/abuse";
import { PHONE_OTP_MAX_ATTEMPTS, phoneOtpIsLoginMfa } from "../privacy/otp";

describe("threat-model and data-quality invariants", () => {
  it("keeps signed download URLs at 60 seconds", () => {
    assert.equal(SIGNED_DOWNLOAD_SECONDS, 60);
  });

  it("caps recommendations at 10 and saved shortlist at 3", () => {
    assert.equal(RECOMMENDATION_CAP, 10);
    assert.equal(SAVED_PAIR_CAP, 3);
  });

  it("never treats acceptance_rate as a public field", () => {
    assert.equal(isExcludedPublicField("acceptance_rate"), true);
  });

  it("rejects executable uploads and HTML/SVG", () => {
    const rejected = validateFileUpload({
      purpose: "transcript",
      sizeBytes: 1024,
      mime: "text/html",
    });
    assert.equal(rejected.some((error) => error.code === "REJECTED_TYPE"), true);
  });

  it("rate-limits login and phone OTP to five attempts", () => {
    assert.equal(LOGIN_MAX_ATTEMPTS, 5);
    assert.equal(PHONE_OTP_MAX_ATTEMPTS, 5);
    assert.equal(phoneOtpIsLoginMfa(), false);
  });

  it("clamps public catalog pages at 50", () => {
    assert.equal(CATALOG_PAGE_MAX, 50);
  });
});
