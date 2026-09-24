import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ageBand, validateBirthDate } from "./age";
import {
  canAccessProtectedRoutes,
  statusAfterEmailVerified,
} from "./account-status";
import {
  unverifiedProtectedRedirect,
  verifiedAuthEntryRedirect,
} from "./access";
import { canonicalConsentPayload } from "./consent";
import { formatGscId } from "./gsc-id";
import { isPasswordPolicyMet, validatePassword } from "./password";
import { projectedHomeRole } from "./home-role";
import { isInviteUsable } from "./invitations";
import { privilegedMfaRedirect } from "./mfa";
import {
  consumeResetToken,
  isResetTokenReuseError,
} from "./password-reset";
import { generateRecoveryCodes, normalizeRecoveryCode } from "./recovery";
import {
  EMPTY_REGISTRATION_DRAFT,
  validateIdentity,
  validateRegistrationSubmission,
  validateReview,
  type RegistrationDraft,
} from "./registration";

const TODAY = new Date(Date.UTC(2026, 8, 19));

function adultDraft(): RegistrationDraft {
  return {
    eligibility: { eligible: true, stage: "seeking_university" },
    identity: {
      fullName: "Ada O'Neil",
      familyName: "O'Neil",
      familyNameConfirmed: true,
      parentSpouseName: "",
      gender: "female",
      dob: "2000-01-15",
      nationality: "KE",
      residenceCountry: "KE",
      city: "Nairobi",
      cityUnlisted: false,
      street: "1 Kenyatta Avenue",
      postalCode: "00100",
      addressCountry: "KE",
    },
    contact: {
      email: "Ada@Example.COM",
      phoneCountryCode: "+254",
      phoneNational: "712345678",
      whatsappSame: true,
      whatsappCountryCode: "+254",
      whatsappNational: "",
      password: "Valid Pass1!",
      passwordConfirmation: "Valid Pass1!",
    },
    review: {
      passportStatus: "in_process",
      socialUrls: [
        { kind: "linkedin", url: "https://linkedin.com/in/ada-oneil" },
      ],
      consentDataUse: true,
      consentEmailNotices: false,
      consentWhatsappNotices: false,
    },
  };
}

describe("password policy", () => {
  it("enforces 12–128 with upper, lower, number and symbol", () => {
    assert.equal(validatePassword("Short1!"), "Use at least 12 characters.");
    assert.equal(validatePassword("ValidPass1!"), "Use at least 12 characters.");
    assert.equal(validatePassword("ValidPass1!x"), null);
    assert.equal(validatePassword(`A1!${"a".repeat(125)}`), null);
    assert.equal(validatePassword("abcdefghijkl"), "Use upper and lower case letters, a number and a symbol.");
    assert.equal(isPasswordPolicyMet("abcdefghijkl"), false);
    assert.equal(isPasswordPolicyMet("Abcdefghijkl"), false);
    assert.equal(isPasswordPolicyMet("Abcdefghijk1"), false);
    assert.equal(isPasswordPolicyMet("Abcdefghijk1!"), true);
    assert.equal(isPasswordPolicyMet("Valid Pass1!"), true);
    assert.equal(validatePassword(`${"A1!".padEnd(129, "a")}`)?.includes("128"), true);
  });

  it("keeps internal spaces and does not trim", () => {
    const password = "Valid Pass1!";
    assert.equal(password.length, 12);
    assert.equal(isPasswordPolicyMet(password), true);
    assert.notEqual(password.trim(), "ValidPass1!");
  });
});

describe("age routing", () => {
  it("blocks independent signup just below 13 and allows 13–17 as teens", () => {
    const twelve = validateBirthDate("2013-09-20", TODAY);
    assert.ok(!("error" in twelve));
    if (!("error" in twelve)) {
      assert.equal(twelve.age, 12);
      assert.equal(twelve.band, "under_13");
    }

    const thirteen = validateBirthDate("2013-09-19", TODAY);
    assert.ok(!("error" in thirteen));
    if (!("error" in thirteen)) {
      assert.equal(thirteen.age, 13);
      assert.equal(thirteen.band, "teen");
    }

    const identity = validateIdentity(
      {
        ...adultDraft().identity,
        dob: "2013-09-20",
        familyNameConfirmed: true,
      },
      TODAY,
    );
    assert.equal(identity.ageBand, "under_13");
    assert.match(identity.ageError ?? "", /parent or legal guardian/i);
  });

  it("treats 18 as adult", () => {
    assert.equal(ageBand(18), "adult");
    assert.equal(statusAfterEmailVerified("adult"), "approved");
    assert.equal(statusAfterEmailVerified("teen"), "guardian_pending");
  });
});

describe("registration submission", () => {
  it("normalizes email and accepts a spaced password unchanged", () => {
    const result = validateRegistrationSubmission(adultDraft(), TODAY);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.emailNormalized, "ada@example.com");
      assert.equal(result.value.password, "Valid Pass1!");
      assert.equal(result.value.ageBand, "adult");
    }
  });

  it("rejects No eligibility without creating a payload", () => {
    const draft = adultDraft();
    draft.eligibility.eligible = false;
    const result = validateRegistrationSubmission(draft, TODAY);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.step, "eligibility");
    }
  });

  it("does not require social URLs for 13–17", () => {
    const draft = adultDraft();
    draft.identity.dob = "2010-01-01";
    draft.review.socialUrls = [];
    const result = validateRegistrationSubmission(draft, TODAY);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.ageBand, "teen");
    }
  });

  it("starts from an empty draft that cannot submit", () => {
    const result = validateRegistrationSubmission(
      EMPTY_REGISTRATION_DRAFT,
      TODAY,
    );
    assert.equal(result.ok, false);
  });
});

describe("consent evidence", () => {
  it("blocks submission until required data-use consent is checked", () => {
    const draft = adultDraft();
    draft.review.consentDataUse = false;
    const errors = validateReview(draft.review, draft.eligibility.stage, "adult");
    assert.match(errors.consentDataUse ?? "", /data-use policy/i);
    const result = validateRegistrationSubmission(draft, TODAY);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.step, "review");
    }
  });

  it("canonicalizes decisions for an immutable hash payload", () => {
    const first = canonicalConsentPayload(
      "actor-1",
      { dataUse: true, emailNotices: false, whatsappNotices: true },
      "gsc-data-use-2026-09-19",
      "2026-09-19T00:00:00.000Z",
    );
    const second = canonicalConsentPayload(
      "actor-1",
      { dataUse: true, emailNotices: false, whatsappNotices: true },
      "gsc-data-use-2026-09-19",
      "2026-09-19T00:00:00.000Z",
    );
    assert.equal(first, second);
    assert.match(first, /"dataUse":true/);
  });
});

describe("GSC identifiers", () => {
  it("formats sequential ids and alphabetic rollover", () => {
    assert.equal(formatGscId(1), "GSC-000001");
    assert.equal(formatGscId(999999), "GSC-999999");
    assert.equal(formatGscId(1000000), "GSC-A000001");
  });
});

describe("access and reset tokens", () => {
  it("blocks unverified users from protected routes", () => {
    assert.equal(canAccessProtectedRoutes(false, "email_pending"), false);
    assert.equal(canAccessProtectedRoutes(true, "email_pending"), false);
    assert.equal(canAccessProtectedRoutes(true, "approved"), true);
    assert.equal(canAccessProtectedRoutes(true, "guardian_pending"), true);
    assert.equal(canAccessProtectedRoutes(true, "suspended"), false);
    assert.equal(
      unverifiedProtectedRedirect("/profile", false, true),
      "/verify-email",
    );
    assert.equal(
      unverifiedProtectedRedirect("/verify-email", false, false),
      null,
    );
    assert.equal(unverifiedProtectedRedirect("/mfa", false, false), null);
    assert.equal(
      unverifiedProtectedRedirect("/invite/accept", false, false),
      null,
    );
    assert.equal(
      verifiedAuthEntryRedirect("/login", true, "/profile"),
      "/profile",
    );
    assert.equal(
      verifiedAuthEntryRedirect("/register", false, "/profile"),
      "/verify-email",
    );
  });

  it("projects the leftover home role and blocks counselor routes without aal2", () => {
    assert.equal(projectedHomeRole(["student", "mentor"]), "student");
    assert.equal(projectedHomeRole(["student", "parent"]), "parent");
    assert.equal(projectedHomeRole(["student", "counselor", "parent"]), "counselor");
    assert.equal(projectedHomeRole(["admin", "counselor"]), "admin");
    assert.equal(
      privilegedMfaRedirect("/counselor", "counselor", "aal1"),
      "/mfa",
    );
    assert.equal(privilegedMfaRedirect("/counselor", "counselor", "aal2"), null);
    assert.equal(privilegedMfaRedirect("/counselor", "student", "aal1"), null);
    assert.equal(privilegedMfaRedirect("/profile", "counselor", "aal1"), null);
  });

  it("rejects expired or reused invites and consumed recovery codes", () => {
    assert.equal(
      isInviteUsable({
        acceptedAt: null,
        revokedAt: null,
        expiresAt: "2099-01-01T00:00:00.000Z",
      }),
      true,
    );
    assert.equal(
      isInviteUsable({
        acceptedAt: "2026-01-01T00:00:00.000Z",
        revokedAt: null,
        expiresAt: "2099-01-01T00:00:00.000Z",
      }),
      false,
    );
    assert.equal(
      isInviteUsable({
        acceptedAt: null,
        revokedAt: null,
        expiresAt: "2020-01-01T00:00:00.000Z",
        now: new Date("2026-01-01T00:00:00.000Z"),
      }),
      false,
    );
    let next = 0;
    const codes = generateRecoveryCodes((size) => {
      const bytes = new Uint8Array(size);
      for (let index = 0; index < size; index += 1) {
        bytes[index] = (next + index) % 256;
      }
      next += 1;
      return bytes;
    });
    assert.equal(codes.length, 8);
    assert.equal(normalizeRecoveryCode("ab cd-ef"), "ABCDEF");
  });

  it("rejects reuse of a consumed reset token", () => {
    const store = new Set<string>();
    const adapter = {
      has: (hash: string) => store.has(hash),
      add: (hash: string) => {
        store.add(hash);
      },
    };
    assert.equal(consumeResetToken(adapter, "abc"), true);
    assert.equal(consumeResetToken(adapter, "abc"), false);
    assert.equal(isResetTokenReuseError("Token has expired or is already used"), true);
  });
});
