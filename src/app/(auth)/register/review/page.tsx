"use client";

import { RegisterShell } from "@/components/auth/RegisterShell";
import { useRegisterDraft } from "@/components/auth/RegisterDraftProvider";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { DATA_USE_POLICY_VERSION } from "@/domain/identity/consent";
import { COUNTRIES } from "@/domain/identity/countries";
import {
  isContactComplete,
  isEligibilityComplete,
  isIdentityComplete,
  SOCIAL_KINDS,
  validateIdentity,
  validateReview,
  type PassportStatus,
  type SocialKind,
} from "@/domain/identity/registration";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PASSPORT_OPTIONS: { value: PassportStatus; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "in_process", label: "In process" },
];

export default function RegisterReviewPage() {
  const router = useRouter();
  const { draft, setDraft, ready, clearDraft } = useRegisterDraft();
  const [today] = useState(() => new Date());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!isEligibilityComplete(draft.eligibility)) {
      router.replace("/register");
      return;
    }
    if (!isIdentityComplete(draft.identity, today)) {
      router.replace("/register/identity");
      return;
    }
    if (!isContactComplete(draft.contact)) {
      router.replace("/register/contact");
    }
  }, [draft, ready, router, today]);

  if (!ready) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  const identity = validateIdentity(draft.identity, today);
  const errors = validateReview(
    draft.review,
    draft.eligibility.stage,
    identity.ageBand,
  );
  const countryName =
    COUNTRIES.find((country) => country.code === draft.identity.residenceCountry)
      ?.name ?? draft.identity.residenceCountry;

  async function handleSubmit() {
    setFormError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        code?: string;
        error?: string;
        step?: string;
        redirectTo?: string;
      };

      if (payload.code === "duplicate") {
        setFormError(payload.error ?? "If you already have an account, log in.");
        return;
      }

      if (!response.ok || !payload.ok) {
        if (payload.step) {
          router.push(
            payload.step === "identity"
              ? "/register/identity"
              : payload.step === "contact"
                ? "/register/contact"
                : "/register",
          );
          return;
        }
        setFormError(payload.error ?? "Unable to create your account.");
        return;
      }

      clearDraft();
      router.push(payload.redirectTo ?? "/verify-email");
      router.refresh();
    } catch {
      setFormError("Unable to create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RegisterShell
      step={4}
      title="Privacy and consent"
      backHref="/register/contact"
      backLabel="Back to contact"
      footer={
        <Button
          loading={submitting}
          disabled={Object.keys(errors).length > 0}
          onClick={() => void handleSubmit()}
        >
          Create account and verify
        </Button>
      }
    >
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-text-muted">Name</dt>
          <dd className="font-medium text-text">{draft.identity.fullName}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Residence</dt>
          <dd className="font-medium text-text">
            {draft.identity.city}, {countryName}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Email</dt>
          <dd className="font-medium text-text">{draft.contact.email}</dd>
        </div>
      </dl>
      <p>
        <Link
          href="/register/contact"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Edit contact
        </Link>
      </p>

      {draft.eligibility.stage === "seeking_university" ? (
        <SelectField
          id="passportStatus"
          label="Passport status"
          required
          options={PASSPORT_OPTIONS}
          placeholder="Select a status"
          value={draft.review.passportStatus}
          error={errors.passportStatus}
          onChange={(event) =>
            setDraft({
              ...draft,
              review: {
                ...draft.review,
                passportStatus: event.target.value as PassportStatus,
              },
            })
          }
        />
      ) : null}

      {identity.ageBand === "teen" ? (
        <p className="text-sm text-text-muted">
          You do not need a social profile. A guardian confirmation is used
          instead.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-text">
            Professional or social profile URLs *
          </p>
          {draft.review.socialUrls.map((link, index) => (
            <div key={`${link.kind}-${index}`} className="grid gap-3 min-[900px]:grid-cols-2">
              <SelectField
                id={`social-kind-${index}`}
                label="Profile type"
                options={SOCIAL_KINDS.map((kind) => ({
                  value: kind,
                  label: kind,
                }))}
                value={link.kind}
                onChange={(event) => {
                  const next = [...draft.review.socialUrls];
                  next[index] = {
                    ...link,
                    kind: event.target.value as SocialKind,
                  };
                  setDraft({
                    ...draft,
                    review: { ...draft.review, socialUrls: next },
                  });
                }}
              />
              <TextField
                id={`social-url-${index}`}
                label="HTTPS URL"
                value={link.url}
                onChange={(event) => {
                  const next = [...draft.review.socialUrls];
                  next[index] = { ...link, url: event.target.value };
                  setDraft({
                    ...draft,
                    review: { ...draft.review, socialUrls: next },
                  });
                }}
              />
              {draft.review.socialUrls.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const next = draft.review.socialUrls.filter(
                      (_, itemIndex) => itemIndex !== index,
                    );
                    setDraft({
                      ...draft,
                      review: { ...draft.review, socialUrls: next },
                    });
                  }}
                >
                  Remove this profile
                </Button>
              ) : null}
            </div>
          ))}
          {draft.review.socialUrls.length < 5 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setDraft({
                  ...draft,
                  review: {
                    ...draft.review,
                    socialUrls: [
                      ...draft.review.socialUrls,
                      { kind: "other", url: "" },
                    ],
                  },
                })
              }
            >
              Add another profile
            </Button>
          ) : null}
          {errors.socialUrls ? (
            <p className="text-sm text-critical" role="alert">
              {errors.socialUrls}
            </p>
          ) : null}
        </div>
      )}

      <fieldset className="space-y-3 rounded-[var(--radius-card)] border border-border p-4">
        <legend className="text-sm font-medium text-text">Data use *</legend>
        <p className="text-sm text-text-muted">
          Policy version {DATA_USE_POLICY_VERSION}. Required to create an account.
          Marketing is optional and is not pre-checked.{" "}
          <Link
            href="/privacy?document=data-use"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Read the data-use policy
          </Link>
        </p>
        <label className="flex min-h-12 items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={draft.review.consentDataUse}
            onChange={(event) =>
              setDraft({
                ...draft,
                review: {
                  ...draft.review,
                  consentDataUse: event.target.checked,
                },
              })
            }
          />
          I have read and accept the data-use policy.
        </label>
        {errors.consentDataUse ? (
          <p className="text-sm text-critical" role="alert">
            {errors.consentDataUse}
          </p>
        ) : null}
        <label className="flex min-h-12 items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={draft.review.consentEmailNotices}
            onChange={(event) =>
              setDraft({
                ...draft,
                review: {
                  ...draft.review,
                  consentEmailNotices: event.target.checked,
                },
              })
            }
          />
          Optional: email notices that are not required to operate the service.
        </label>
        <label className="flex min-h-12 items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={draft.review.consentWhatsappNotices}
            onChange={(event) =>
              setDraft({
                ...draft,
                review: {
                  ...draft.review,
                  consentWhatsappNotices: event.target.checked,
                },
              })
            }
          />
          Optional: WhatsApp notices. This is separate from having a WhatsApp number.
        </label>
      </fieldset>

      {formError ? (
        <p className="text-sm text-critical" role="alert">
          {formError}{" "}
          {formError.includes("log in") ? (
            <Link href="/login" className="font-medium underline">
              Log in
            </Link>
          ) : null}
        </p>
      ) : null}
    </RegisterShell>
  );
}
