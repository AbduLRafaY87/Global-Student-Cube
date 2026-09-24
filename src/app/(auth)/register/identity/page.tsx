"use client";

import { RegisterShell } from "@/components/auth/RegisterShell";
import { useRegisterDraft } from "@/components/auth/RegisterDraftProvider";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { COUNTRIES } from "@/domain/identity/countries";
import { suggestFamilyName } from "@/domain/identity/names";
import {
  isEligibilityComplete,
  validateIdentity,
  type Gender,
} from "@/domain/identity/registration";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function RegisterIdentityPage() {
  const router = useRouter();
  const { draft, setDraft, ready } = useRegisterDraft();
  const [today] = useState(() => new Date());
  const countryOptions = useMemo(
    () => COUNTRIES.map((country) => ({ value: country.code, label: country.name })),
    [],
  );

  useEffect(() => {
    if (ready && !isEligibilityComplete(draft.eligibility)) {
      router.replace("/register");
    }
  }, [draft.eligibility, ready, router]);

  if (!ready) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  const errors = validateIdentity(draft.identity, today);
  const blockedMinor = errors.ageBand === "under_13";
  const canContinue = !blockedMinor && !errors.dob && !errors.fullName && !errors.gender
    && !errors.nationality && !errors.residenceCountry && !errors.city && !errors.street
    && !errors.addressCountry && !errors.familyName && !errors.parentSpouseName;

  return (
    <RegisterShell
      step={2}
      title="Your identity"
      backHref="/register"
      backLabel="Back to eligibility"
      footer={
        blockedMinor ? (
          <Button variant="secondary" onClick={() => router.push("/")}>
            Continue as guest
          </Button>
        ) : (
          <Button
            disabled={!canContinue}
            onClick={() => router.push("/register/contact")}
          >
            Continue
          </Button>
        )
      }
    >
      <TextField
        id="fullName"
        label="Full name"
        required
        value={draft.identity.fullName}
        error={errors.fullName}
        onChange={(event) => {
          const fullName = event.target.value;
          const suggested = suggestFamilyName(fullName);
          setDraft({
            ...draft,
            identity: {
              ...draft.identity,
              fullName,
              familyName:
                !draft.identity.familyNameConfirmed && suggested
                  ? suggested
                  : draft.identity.familyName,
              familyNameConfirmed:
                draft.identity.familyNameConfirmed &&
                draft.identity.familyName !== suggested
                  ? true
                  : draft.identity.familyNameConfirmed,
            },
          });
        }}
      />

      <TextField
        id="familyName"
        label="Surname"
        optional
        value={draft.identity.familyName}
        error={errors.familyName}
        hint="Suggested from your full name. You can edit it."
        onChange={(event) =>
          setDraft({
            ...draft,
            identity: {
              ...draft.identity,
              familyName: event.target.value,
              familyNameConfirmed: true,
            },
          })
        }
      />

      {draft.identity.familyName && !draft.identity.familyNameConfirmed ? (
        <label className="flex min-h-12 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={false}
            onChange={(event) =>
              setDraft({
                ...draft,
                identity: {
                  ...draft.identity,
                  familyNameConfirmed: event.target.checked,
                },
              })
            }
          />
          Confirm this surname suggestion
        </label>
      ) : null}

      <TextField
        id="parentSpouseName"
        label="Father or husband name"
        optional
        value={draft.identity.parentSpouseName}
        error={errors.parentSpouseName}
        onChange={(event) =>
          setDraft({
            ...draft,
            identity: { ...draft.identity, parentSpouseName: event.target.value },
          })
        }
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Gender *</legend>
        {GENDERS.map((gender) => (
          <label key={gender.value} className="flex min-h-12 items-center gap-3">
            <input
              type="radio"
              name="gender"
              value={gender.value}
              checked={draft.identity.gender === gender.value}
              onChange={() =>
                setDraft({
                  ...draft,
                  identity: { ...draft.identity, gender: gender.value },
                })
              }
            />
            {gender.label}
          </label>
        ))}
        {errors.gender ? (
          <p className="text-sm text-critical" role="alert">
            {errors.gender}
          </p>
        ) : null}
      </fieldset>

      <TextField
        id="dob"
        label="Date of birth"
        required
        type="date"
        value={draft.identity.dob}
        error={errors.dob ?? errors.ageError}
        hint="Use DD/MM/YYYY. Age is calculated from this date."
        onChange={(event) =>
          setDraft({
            ...draft,
            identity: { ...draft.identity, dob: event.target.value },
          })
        }
      />

      {errors.ageBand === "teen" ? (
        <p className="text-sm text-text">
          If you continue, a parent or guardian must later confirm this account
          before private messages or recorded sessions. You can explore
          universities after you verify your email.
        </p>
      ) : null}

      {blockedMinor ? (
        <p className="text-sm text-text" role="alert">
          {errors.ageError}
        </p>
      ) : null}

      <SelectField
        id="nationality"
        label="Nationality"
        required
        options={countryOptions}
        placeholder="Select a country"
        value={draft.identity.nationality}
        error={errors.nationality}
        onChange={(event) =>
          setDraft({
            ...draft,
            identity: { ...draft.identity, nationality: event.target.value },
          })
        }
      />

      <SelectField
        id="residenceCountry"
        label="Country of residence"
        required
        options={countryOptions}
        placeholder="Select a country"
        value={draft.identity.residenceCountry}
        error={errors.residenceCountry}
        onChange={(event) =>
          setDraft({
            ...draft,
            identity: {
              ...draft.identity,
              residenceCountry: event.target.value,
              addressCountry: draft.identity.addressCountry || event.target.value,
            },
          })
        }
      />

      <TextField
        id="city"
        label="City"
        required
        value={draft.identity.city}
        error={errors.city}
        onChange={(event) =>
          setDraft({
            ...draft,
            identity: { ...draft.identity, city: event.target.value },
          })
        }
      />

      <label className="flex min-h-12 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={draft.identity.cityUnlisted}
          onChange={(event) =>
            setDraft({
              ...draft,
              identity: { ...draft.identity, cityUnlisted: event.target.checked },
            })
          }
        />
        This city is unlisted
      </label>

      <TextField
        id="street"
        label="Street address"
        required
        value={draft.identity.street}
        error={errors.street}
        onChange={(event) =>
          setDraft({
            ...draft,
            identity: { ...draft.identity, street: event.target.value },
          })
        }
      />

      <TextField
        id="postalCode"
        label="Postal code"
        optional
        value={draft.identity.postalCode}
        hint="Required only where a local format exists. Do not invent a foreign postcode."
        onChange={(event) =>
          setDraft({
            ...draft,
            identity: { ...draft.identity, postalCode: event.target.value },
          })
        }
      />

      <SelectField
        id="addressCountry"
        label="Address country"
        required
        options={countryOptions}
        placeholder="Select a country"
        value={draft.identity.addressCountry}
        error={errors.addressCountry}
        onChange={(event) =>
          setDraft({
            ...draft,
            identity: { ...draft.identity, addressCountry: event.target.value },
          })
        }
      />
    </RegisterShell>
  );
}
