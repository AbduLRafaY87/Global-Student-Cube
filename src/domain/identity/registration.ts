import { validateBirthDate, type AgeBand } from "./age";
import { isSupportedCountryCode } from "./countries";
import { DATA_USE_POLICY_VERSION } from "./consent";
import { normalizeEmail, validateLoginEmail } from "./email";
import { suggestFamilyName, validatePersonName } from "./names";
import { formatE164, validatePhoneParts } from "./phone";
import {
  validatePassword,
  validatePasswordConfirmation,
} from "./password";

export const SOCIAL_KINDS = [
  "linkedin",
  "instagram",
  "facebook",
  "x",
  "other",
] as const;

export type SocialKind = (typeof SOCIAL_KINDS)[number];

export type ParticipantStage =
  | "seeking_university"
  | "currently_studying"
  | "alumni";

export type Gender = "male" | "female" | "prefer_not_to_say";

export type PassportStatus = "yes" | "no" | "in_process";

export interface SocialLink {
  kind: SocialKind;
  url: string;
}

export interface EligibilityDraft {
  eligible: boolean | null;
  stage: ParticipantStage | null;
}

export interface IdentityDraft {
  fullName: string;
  familyName: string;
  familyNameConfirmed: boolean;
  parentSpouseName: string;
  gender: Gender | "";
  dob: string;
  nationality: string;
  residenceCountry: string;
  city: string;
  cityUnlisted: boolean;
  street: string;
  postalCode: string;
  addressCountry: string;
}

export interface ContactDraft {
  email: string;
  phoneCountryCode: string;
  phoneNational: string;
  whatsappSame: boolean;
  whatsappCountryCode: string;
  whatsappNational: string;
  password: string;
  passwordConfirmation: string;
}

export interface ReviewDraft {
  passportStatus: PassportStatus | "";
  socialUrls: SocialLink[];
  consentDataUse: boolean;
  consentEmailNotices: boolean;
  consentWhatsappNotices: boolean;
}

export interface RegistrationDraft {
  eligibility: EligibilityDraft;
  identity: IdentityDraft;
  contact: ContactDraft;
  review: ReviewDraft;
}

export const EMPTY_REGISTRATION_DRAFT: RegistrationDraft = {
  eligibility: { eligible: null, stage: null },
  identity: {
    fullName: "",
    familyName: "",
    familyNameConfirmed: false,
    parentSpouseName: "",
    gender: "",
    dob: "",
    nationality: "",
    residenceCountry: "",
    city: "",
    cityUnlisted: false,
    street: "",
    postalCode: "",
    addressCountry: "",
  },
  contact: {
    email: "",
    phoneCountryCode: "+1",
    phoneNational: "",
    whatsappSame: true,
    whatsappCountryCode: "+1",
    whatsappNational: "",
    password: "",
    passwordConfirmation: "",
  },
  review: {
    passportStatus: "",
    socialUrls: [{ kind: "linkedin", url: "" }],
    consentDataUse: false,
    consentEmailNotices: false,
    consentWhatsappNotices: false,
  },
};

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const HTTPS_URL = /^https:\/\/[^\s]+$/i;

export function validateEligibility(
  draft: EligibilityDraft,
): FieldErrors<EligibilityDraft> {
  const errors: FieldErrors<EligibilityDraft> = {};

  if (draft.eligible !== true && draft.eligible !== false) {
    errors.eligible = "Choose whether you are eligible for this pilot.";
  }

  if (draft.eligible === true && !draft.stage) {
    errors.stage = "Choose why you are creating this account.";
  }

  return errors;
}

export function validateIdentity(
  draft: IdentityDraft,
  today: Date,
): FieldErrors<IdentityDraft> & { ageBand?: AgeBand; ageError?: string } {
  const errors: FieldErrors<IdentityDraft> & {
    ageBand?: AgeBand;
    ageError?: string;
  } = {};

  const fullNameError = validatePersonName(draft.fullName, true);
  if (fullNameError) {
    errors.fullName = fullNameError;
  }

  const familyError = validatePersonName(draft.familyName, false);
  if (familyError) {
    errors.familyName = familyError;
  }

  const suggested = suggestFamilyName(draft.fullName);
  if (
    suggested &&
    draft.familyName === suggested &&
    !draft.familyNameConfirmed
  ) {
    errors.familyName = "Confirm or edit the suggested surname.";
  }

  const parentError = validatePersonName(draft.parentSpouseName, false);
  if (parentError) {
    errors.parentSpouseName = parentError;
  }

  if (
    draft.gender !== "male" &&
    draft.gender !== "female" &&
    draft.gender !== "prefer_not_to_say"
  ) {
    errors.gender = "Choose a gender option.";
  }

  const birth = validateBirthDate(draft.dob, today);
  if ("error" in birth) {
    errors.dob = birth.error;
  } else {
    errors.ageBand = birth.band;
    if (birth.band === "under_13") {
      errors.ageError =
        "Independent student accounts are for ages 13 and over. A parent or legal guardian must operate this case.";
    }
  }

  if (!isSupportedCountryCode(draft.nationality)) {
    errors.nationality = "Choose a nationality.";
  }

  if (!isSupportedCountryCode(draft.residenceCountry)) {
    errors.residenceCountry = "Choose a country of residence.";
  }

  if (!draft.city.trim()) {
    errors.city = "Enter a city, or mark it as unlisted.";
  }

  if (!draft.street.trim() || draft.street.trim().length > 300) {
    errors.street = "Enter a street address (up to 300 characters).";
  }

  if (!isSupportedCountryCode(draft.addressCountry)) {
    errors.addressCountry = "Choose an address country.";
  }

  return errors;
}

export function validateContact(
  draft: ContactDraft,
): FieldErrors<ContactDraft> {
  const errors: FieldErrors<ContactDraft> = {};
  const emailError = validateLoginEmail(draft.email);

  if (emailError) {
    errors.email = emailError;
  }

  const phoneError = validatePhoneParts(
    draft.phoneCountryCode,
    draft.phoneNational,
    true,
  );
  if (phoneError) {
    errors.phoneNational = phoneError;
  }

  if (!draft.whatsappSame) {
    const whatsappError = validatePhoneParts(
      draft.whatsappCountryCode,
      draft.whatsappNational,
      false,
    );
    if (whatsappError && draft.whatsappNational.trim()) {
      errors.whatsappNational = whatsappError;
    }
  }

  const passwordError = validatePassword(draft.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  const confirmError = validatePasswordConfirmation(
    draft.password,
    draft.passwordConfirmation,
  );
  if (confirmError) {
    errors.passwordConfirmation = confirmError;
  }

  return errors;
}

function validateHttpsUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return "Enter a profile URL.";
  }

  if (!HTTPS_URL.test(trimmed)) {
    return "Use an https:// URL.";
  }

  return null;
}

export function validateReview(
  draft: ReviewDraft,
  stage: ParticipantStage | null,
  ageBand: AgeBand | undefined,
): FieldErrors<ReviewDraft> {
  const errors: FieldErrors<ReviewDraft> = {};

  if (stage === "seeking_university" && !draft.passportStatus) {
    errors.passportStatus = "Choose a passport status.";
  }

  const filled = draft.socialUrls.filter((link) => link.url.trim());

  if (ageBand !== "teen" && filled.length < 1) {
    errors.socialUrls = "Add at least one professional or social profile URL.";
  }

  if (filled.length > 5) {
    errors.socialUrls = "Use at most five profile URLs.";
  }

  for (const link of filled) {
    const urlError = validateHttpsUrl(link.url);
    if (urlError) {
      errors.socialUrls = urlError;
      break;
    }
  }

  if (!draft.consentDataUse) {
    errors.consentDataUse =
      "You need to accept the data-use policy to create an account.";
  }

  return errors;
}

export function isEligibilityComplete(draft: EligibilityDraft): boolean {
  return (
    draft.eligible === true &&
    Object.keys(validateEligibility(draft)).length === 0
  );
}

export function isIdentityComplete(
  draft: IdentityDraft,
  today: Date,
): boolean {
  const result = validateIdentity(draft, today);
  const fieldErrors = { ...result };
  delete fieldErrors.ageBand;
  const ageError = fieldErrors.ageError;
  delete fieldErrors.ageError;
  return !ageError && Object.keys(fieldErrors).length === 0;
}

export function isContactComplete(draft: ContactDraft): boolean {
  return Object.keys(validateContact(draft)).length === 0;
}

export interface ValidatedRegistration {
  emailNormalized: string;
  fullName: string;
  familyName: string;
  parentSpouseName: string | null;
  gender: Gender;
  dob: string;
  nationality: string;
  residenceCountry: string;
  city: string;
  address: {
    street: string;
    city: string;
    postal_code: string | null;
    country: string;
    unlisted_city: boolean;
  };
  phoneE164: string;
  whatsappE164: string | null;
  participantStage: ParticipantStage;
  passportStatus: PassportStatus | null;
  socialUrls: SocialLink[];
  ageBand: AgeBand;
  consent: {
    dataUse: true;
    emailNotices: boolean;
    whatsappNotices: boolean;
    policyVersion: string;
  };
  password: string;
}

export function validateRegistrationSubmission(
  draft: RegistrationDraft,
  today: Date,
):
  | { ok: true; value: ValidatedRegistration }
  | { ok: false; step: "eligibility" | "identity" | "contact" | "review" } {
  if (draft.eligibility.eligible !== true) {
    return { ok: false, step: "eligibility" };
  }

  const eligibilityErrors = validateEligibility(draft.eligibility);
  if (Object.keys(eligibilityErrors).length > 0) {
    return { ok: false, step: "eligibility" };
  }

  const identityErrors = validateIdentity(draft.identity, today);
  if (identityErrors.ageError || identityErrors.ageBand === "under_13") {
    return { ok: false, step: "identity" };
  }

  const ageBand = identityErrors.ageBand;
  const identityFields = { ...identityErrors };
  delete identityFields.ageBand;
  delete identityFields.ageError;
  if (Object.keys(identityFields).length > 0 || !ageBand) {
    return { ok: false, step: "identity" };
  }

  if (Object.keys(validateContact(draft.contact)).length > 0) {
    return { ok: false, step: "contact" };
  }

  if (
    Object.keys(
      validateReview(draft.review, draft.eligibility.stage, ageBand),
    ).length > 0
  ) {
    return { ok: false, step: "review" };
  }

  const phoneE164 = formatE164(
    draft.contact.phoneCountryCode,
    draft.contact.phoneNational,
  );
  const whatsappE164 = draft.contact.whatsappSame
    ? phoneE164
    : draft.contact.whatsappNational.trim()
      ? formatE164(
          draft.contact.whatsappCountryCode,
          draft.contact.whatsappNational,
        )
      : null;

  const socialUrls = draft.review.socialUrls.filter((link) => link.url.trim());

  return {
    ok: true,
    value: {
      emailNormalized: normalizeEmail(draft.contact.email),
      fullName: draft.identity.fullName.trim(),
      familyName: draft.identity.familyName.trim(),
      parentSpouseName: draft.identity.parentSpouseName.trim() || null,
      gender: draft.identity.gender as Gender,
      dob: draft.identity.dob,
      nationality: draft.identity.nationality.toUpperCase(),
      residenceCountry: draft.identity.residenceCountry.toUpperCase(),
      city: draft.identity.city.trim(),
      address: {
        street: draft.identity.street.trim(),
        city: draft.identity.city.trim(),
        postal_code: draft.identity.postalCode.trim() || null,
        country: draft.identity.addressCountry.toUpperCase(),
        unlisted_city: draft.identity.cityUnlisted,
      },
      phoneE164,
      whatsappE164,
      participantStage: draft.eligibility.stage as ParticipantStage,
      passportStatus:
        draft.eligibility.stage === "seeking_university"
          ? (draft.review.passportStatus as PassportStatus)
          : null,
      socialUrls,
      ageBand,
      consent: {
        dataUse: true,
        emailNotices: draft.review.consentEmailNotices,
        whatsappNotices: draft.review.consentWhatsappNotices,
        policyVersion: DATA_USE_POLICY_VERSION,
      },
      password: draft.contact.password,
    },
  };
}
