"use client";

import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordRules } from "@/components/auth/PasswordRules";
import { RegisterShell } from "@/components/auth/RegisterShell";
import { useRegisterDraft } from "@/components/auth/RegisterDraftProvider";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import {
  isEligibilityComplete,
  isIdentityComplete,
  validateContact,
} from "@/domain/identity/registration";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RegisterContactPage() {
  const router = useRouter();
  const { draft, setDraft, ready } = useRegisterDraft();
  const [today] = useState(() => new Date());

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
    }
  }, [draft.eligibility, draft.identity, ready, router, today]);

  if (!ready) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  const errors = validateContact(draft.contact);
  const canContinue = Object.keys(errors).length === 0;

  return (
    <RegisterShell
      step={3}
      title="Contact and password"
      backHref="/register/identity"
      backLabel="Back to identity"
      footer={
        <Button
          disabled={!canContinue}
          onClick={() => router.push("/register/review")}
        >
          Continue
        </Button>
      }
    >
      <TextField
        id="email"
        label="Login email"
        required
        type="email"
        autoComplete="email"
        value={draft.contact.email}
        error={errors.email}
        onChange={(event) =>
          setDraft({
            ...draft,
            contact: { ...draft.contact, email: event.target.value },
          })
        }
      />

      <div className="flex gap-3">
        <div className="w-24 shrink-0">
          <TextField
            id="phoneCountryCode"
            label="Code"
            required
            inputMode="tel"
            autoComplete="tel-country-code"
            hint="Include +. We never read a SIM."
            value={draft.contact.phoneCountryCode}
            onChange={(event) =>
              setDraft({
                ...draft,
                contact: {
                  ...draft.contact,
                  phoneCountryCode: event.target.value,
                },
              })
            }
          />
        </div>
        <div className="min-w-0 flex-1">
          <TextField
            id="phoneNational"
            label="Phone"
            required
            inputMode="tel"
            autoComplete="tel-national"
            value={draft.contact.phoneNational}
            error={errors.phoneNational}
            onChange={(event) =>
              setDraft({
                ...draft,
                contact: { ...draft.contact, phoneNational: event.target.value },
              })
            }
          />
        </div>
      </div>

      <label className="flex min-h-12 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={draft.contact.whatsappSame}
          onChange={(event) =>
            setDraft({
              ...draft,
              contact: { ...draft.contact, whatsappSame: event.target.checked },
            })
          }
        />
        WhatsApp is the same
      </label>

      {!draft.contact.whatsappSame ? (
        <div className="flex gap-3">
          <div className="w-24 shrink-0">
            <TextField
              id="whatsappCountryCode"
              label="Code"
              optional
              inputMode="tel"
              value={draft.contact.whatsappCountryCode}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  contact: {
                    ...draft.contact,
                    whatsappCountryCode: event.target.value,
                  },
                })
              }
            />
          </div>
          <div className="min-w-0 flex-1">
            <TextField
              id="whatsappNational"
              label="WhatsApp"
              optional
              inputMode="tel"
              value={draft.contact.whatsappNational}
              error={errors.whatsappNational}
              hint="WhatsApp is optional. Opting out still lets you register."
              onChange={(event) =>
                setDraft({
                  ...draft,
                  contact: {
                    ...draft.contact,
                    whatsappNational: event.target.value,
                  },
                })
              }
            />
          </div>
        </div>
      ) : null}

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
        Optional: allow WhatsApp notices. This is separate from having a number.
      </label>

      <PasswordField
        id="password"
        label="Password"
        autoComplete="new-password"
        value={draft.contact.password}
        error={errors.password}
        onChange={(event) =>
          setDraft({
            ...draft,
            contact: { ...draft.contact, password: event.target.value },
          })
        }
      />
      <PasswordRules password={draft.contact.password} />

      <PasswordField
        id="passwordConfirmation"
        label="Confirm password"
        autoComplete="new-password"
        value={draft.contact.passwordConfirmation}
        error={errors.passwordConfirmation}
        onChange={(event) =>
          setDraft({
            ...draft,
            contact: {
              ...draft.contact,
              passwordConfirmation: event.target.value,
            },
          })
        }
      />
    </RegisterShell>
  );
}
