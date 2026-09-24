"use client";

import { RegisterShell } from "@/components/auth/RegisterShell";
import { useRegisterDraft } from "@/components/auth/RegisterDraftProvider";
import { Button } from "@/components/ui/Button";
import {
  validateEligibility,
  type ParticipantStage,
} from "@/domain/identity/registration";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STAGES: { value: ParticipantStage; label: string }[] = [
  { value: "seeking_university", label: "Seeking a university" },
  { value: "currently_studying", label: "Currently studying" },
  { value: "alumni", label: "Alumni or family of alumni" },
];

export default function RegisterEligibilityPage() {
  const router = useRouter();
  const { draft, setDraft, ready } = useRegisterDraft();
  const [showExit, setShowExit] = useState(draft.eligibility.eligible === false);

  if (!ready) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  const errors = validateEligibility(draft.eligibility);
  const canContinue =
    draft.eligibility.eligible === true && !errors.stage && !errors.eligible;

  return (
    <RegisterShell
      step={1}
      title="Create your account"
      backHref="/"
      backLabel="Back to guest home"
      footer={
        showExit ? (
          <Button
            variant="secondary"
            onClick={() => {
              router.push("/");
            }}
          >
            Continue as guest
          </Button>
        ) : (
          <Button
            disabled={!canContinue}
            onClick={() => router.push("/register/identity")}
          >
            Continue
          </Button>
        )
      }
    >
      <p className="text-sm leading-5 text-text-muted">
        Everyone who registers here creates a student account. Counselor, parent
        and staff accounts are created by invitation.
      </p>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">
          Why are you creating this account? *
        </legend>
        {STAGES.map((stage) => (
          <label
            key={stage.value}
            className="flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] border border-border bg-surface px-3"
          >
            <input
              type="radio"
              name="stage"
              value={stage.value}
              checked={draft.eligibility.stage === stage.value}
              onChange={() =>
                setDraft({
                  ...draft,
                  eligibility: { ...draft.eligibility, stage: stage.value },
                })
              }
            />
            <span>{stage.label}</span>
          </label>
        ))}
        {errors.stage ? (
          <p className="text-sm text-critical" role="alert">
            {errors.stage}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">
          Are you eligible for this student pilot? *
        </legend>
        <p className="text-sm text-text-muted">
          This is a self-declaration. We do not infer eligibility from your name,
          location or photograph.
        </p>
        {(["yes", "no"] as const).map((choice) => (
          <label
            key={choice}
            className="flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] border border-border bg-surface px-3"
          >
            <input
              type="radio"
              name="eligible"
              value={choice}
              checked={
                draft.eligibility.eligible === (choice === "yes")
              }
              onChange={() => {
                const eligible = choice === "yes";
                setDraft({
                  ...draft,
                  eligibility: { ...draft.eligibility, eligible },
                });
                setShowExit(!eligible);
              }}
            />
            <span>{choice === "yes" ? "Yes" : "No"}</span>
          </label>
        ))}
      </fieldset>

      {showExit ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-background p-4">
          <p className="text-sm leading-5 text-text">
            This private registration is only for people who are eligible for the
            current pilot. You can still explore public university and scholarship
            information as a guest. We have not saved a private profile.
          </p>
        </div>
      ) : null}

      <p className="text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </RegisterShell>
  );
}
