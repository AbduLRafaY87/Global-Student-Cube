"use client";

import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  canCompleteModule3,
  evaluateReadiness,
  HOUSING_CONSTRUCTION_LABELS,
  HOUSING_CONSTRUCTIONS,
  HOUSING_DISCLOSURES,
  HOUSING_ROOM_LABELS,
  HOUSING_ROOMS,
  HOUSING_STATUS_LABELS,
  HOUSING_STATUSES,
  HOUSING_STRUCTURE_LABELS,
  HOUSING_STRUCTURES,
  TRI_STATES,
  type FinancialInput,
  type HousingDisclosure,
  type HousingInput,
  type TriState,
} from "@/domain/finance/finance";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { saveProfileSection } from "./profile-api";

interface FinancesFormProps {
  caseId: string;
  version: number;
  initial: FinancialInput;
  canWrite: boolean;
  module3Completed: boolean;
}

function optionsFrom<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): { value: string; label: string }[] {
  return values.map((value) => ({ value, label: labels[value] }));
}

export function FinancesForm({
  caseId,
  version,
  initial,
  canWrite,
  module3Completed,
}: FinancesFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FinancialInput>(initial);
  const [fundsConfirmed, setFundsConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [caseVersion, setCaseVersion] = useState(version);

  const readiness = useMemo(
    () =>
      evaluateReadiness({
        savings: form.savingsDeclined ? null : form.savings,
        savingsDeclined: form.savingsDeclined === true,
        annualComparison: null,
        fxAvailable: false,
      }),
    [form.savings, form.savingsDeclined],
  );

  function patch(next: Partial<FinancialInput>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function patchHousing(next: Partial<HousingInput>) {
    setForm((current) => ({ ...current, housing: { ...current.housing, ...next } }));
  }

  function payload(): Record<string, unknown> {
    return {
      occupation: form.occupation,
      income: form.incomeDeclined ? null : form.income,
      incomeCurrency: form.incomeDeclined ? null : form.incomeCurrency,
      incomeDeclined: form.incomeDeclined,
      savings: form.savingsDeclined ? null : form.savings,
      savingsCurrency: form.savingsDeclined ? null : form.savingsCurrency,
      savingsDeclined: form.savingsDeclined,
      housing: form.housing,
      sponsorAvailable: form.sponsorAvailable || "prefer_not",
      incomeProofAvailable: form.incomeProofAvailable || "prefer_not",
    };
  }

  async function save(complete: boolean) {
    if (!canWrite) {
      return;
    }
    if (form.savingsDeclined === false && !fundsConfirmed) {
      setMessage("Confirm that the same family funds have not been repeated.");
      return;
    }
    setBusy(true);
    const saved = await saveProfileSection(
      `/api/v1/cases/${caseId}/profile/finances`,
      payload(),
      "PATCH",
      { ifMatch: `"v${caseVersion}"` },
    );
    if (!saved.ok) {
      setBusy(false);
      setMessage(saved.message);
      return;
    }
    setCaseVersion((current) => current + 1);
    if (complete) {
      const finished = await saveProfileSection(
        `/api/v1/cases/${caseId}/profile/finances/complete`,
        {},
        "POST",
      );
      setBusy(false);
      setMessage(finished.ok ? "Financial section complete." : finished.message);
      if (finished.ok) {
        router.push(`/cases/${caseId}/profile`);
        router.refresh();
      }
      return;
    }
    setBusy(false);
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
    >
      <p className="text-sm text-text-muted">
        Parent collaboration is encouraged, not required for independent adults. We
        encourage parents to help verify these details.
      </p>

      <TextField
        id="occupation"
        label="Occupation"
        optional
        value={form.occupation}
        maxLength={160}
        onChange={(event) => patch({ occupation: event.target.value })}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text">Annual income</legend>
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex min-h-12 items-center gap-2 text-sm">
            <input
              type="radio"
              name="income-disclosure"
              checked={form.incomeDeclined === false}
              onChange={() => patch({ incomeDeclined: false })}
            />
            Provide amount
          </label>
          <label className="inline-flex min-h-12 items-center gap-2 text-sm">
            <input
              type="radio"
              name="income-disclosure"
              checked={form.incomeDeclined === true}
              onChange={() =>
                patch({ incomeDeclined: true, income: null, incomeCurrency: null })
              }
            />
            Decline to answer
          </label>
        </div>
        {form.incomeDeclined === false ? (
          <div className="grid gap-4 min-[640px]:grid-cols-2">
            <TextField
              id="income"
              label="Amount"
              inputMode="decimal"
              value={form.income === null ? "" : String(form.income)}
              onChange={(event) =>
                patch({
                  income: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
            <TextField
              id="income-currency"
              label="Currency"
              value={form.incomeCurrency ?? ""}
              maxLength={3}
              onChange={(event) =>
                patch({ incomeCurrency: event.target.value.toUpperCase() || null })
              }
            />
          </div>
        ) : null}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text">Housing</legend>
        <SelectField
          id="housing-disclosure"
          label="Housing disclosure"
          required
          value={form.housing.disclosure}
          onChange={(event) =>
            patchHousing({ disclosure: event.target.value as HousingDisclosure | "" })
          }
          options={HOUSING_DISCLOSURES.map((value) => ({
            value,
            label: value === "provided" ? "Provided" : "Declined",
          }))}
          placeholder="Choose"
        />
        {form.housing.disclosure === "provided" ? (
          <div className="grid gap-4">
            <SelectField
              id="housing-status"
              label="Housing status"
              required
              value={form.housing.status}
              onChange={(event) =>
                patchHousing({ status: event.target.value as HousingInput["status"] })
              }
              options={optionsFrom(HOUSING_STATUSES, HOUSING_STATUS_LABELS)}
              placeholder="Choose"
            />
            <SelectField
              id="housing-structure"
              label="Housing structure"
              required
              value={form.housing.structure}
              onChange={(event) =>
                patchHousing({ structure: event.target.value as HousingInput["structure"] })
              }
              options={optionsFrom(HOUSING_STRUCTURES, HOUSING_STRUCTURE_LABELS)}
              placeholder="Choose"
            />
            {form.housing.structure === "other" ? (
              <TextField
                id="housing-structure-other"
                label="Other structure"
                required
                value={form.housing.structureOther}
                onChange={(event) => patchHousing({ structureOther: event.target.value })}
              />
            ) : null}
            <SelectField
              id="housing-construction"
              label="Construction"
              required
              value={form.housing.construction}
              onChange={(event) =>
                patchHousing({
                  construction: event.target.value as HousingInput["construction"],
                })
              }
              options={optionsFrom(HOUSING_CONSTRUCTIONS, HOUSING_CONSTRUCTION_LABELS)}
              placeholder="Choose"
            />
            <SelectField
              id="housing-rooms"
              label="Rooms"
              required
              value={form.housing.rooms}
              onChange={(event) =>
                patchHousing({ rooms: event.target.value as HousingInput["rooms"] })
              }
              options={optionsFrom(HOUSING_ROOMS, HOUSING_ROOM_LABELS)}
              placeholder="Choose"
            />
          </div>
        ) : null}
      </fieldset>

      <SelectField
        id="sponsor"
        label="Sponsor available"
        optional
        value={form.sponsorAvailable}
        onChange={(event) => patch({ sponsorAvailable: event.target.value as TriState | "" })}
        options={TRI_STATES.map((value) => ({
          value,
          label: value === "prefer_not" ? "Prefer not to answer" : value === "yes" ? "Yes" : "No",
        }))}
        placeholder="Choose"
      />
      <SelectField
        id="income-proof"
        label="Income-proof availability"
        optional
        hint="This asks availability, not a mandatory upload."
        value={form.incomeProofAvailable}
        onChange={(event) =>
          patch({ incomeProofAvailable: event.target.value as TriState | "" })
        }
        options={TRI_STATES.map((value) => ({
          value,
          label: value === "prefer_not" ? "Prefer not to answer" : value === "yes" ? "Yes" : "No",
        }))}
        placeholder="Choose"
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text">Savings and reserves</legend>
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex min-h-12 items-center gap-2 text-sm">
            <input
              type="radio"
              name="savings-disclosure"
              checked={form.savingsDeclined === false}
              onChange={() => patch({ savingsDeclined: false })}
            />
            Provide amount
          </label>
          <label className="inline-flex min-h-12 items-center gap-2 text-sm">
            <input
              type="radio"
              name="savings-disclosure"
              checked={form.savingsDeclined === true}
              onChange={() =>
                patch({ savingsDeclined: true, savings: null, savingsCurrency: null })
              }
            />
            Decline to answer
          </label>
        </div>
        {form.savingsDeclined === false ? (
          <>
            <div className="grid gap-4 min-[640px]:grid-cols-2">
              <TextField
                id="savings"
                label="Amount"
                inputMode="decimal"
                value={form.savings === null ? "" : String(form.savings)}
                onChange={(event) =>
                  patch({
                    savings: event.target.value === "" ? null : Number(event.target.value),
                  })
                }
              />
              <TextField
                id="savings-currency"
                label="Currency"
                value={form.savingsCurrency ?? ""}
                maxLength={3}
                onChange={(event) =>
                  patch({ savingsCurrency: event.target.value.toUpperCase() || null })
                }
              />
            </div>
            <label className="inline-flex min-h-12 items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={fundsConfirmed}
                onChange={(event) => setFundsConfirmed(event.target.checked)}
              />
              I confirm the same family funds have not been repeated.
            </label>
          </>
        ) : null}
      </fieldset>

      <article className="rounded-[var(--radius-card)] border border-border p-4">
        <h2 className="text-lg font-semibold text-text">USD snapshot and readiness</h2>
        <p className="mt-2 text-sm text-text">
          Conversion unavailable. Original amounts are kept. Income is never added to
          savings.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          {readiness.status === "savings_declined"
            ? "Readiness is Unknown because savings were declined."
            : readiness.status === "fx_unavailable"
              ? "Readiness is Unknown while a conversion rate is unavailable."
              : "Readiness stays Unknown until a cost comparison exists."}
        </p>
      </article>

      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 min-[640px]:flex-row">
        <Button type="submit" loading={busy} disabled={!canWrite}>
          Save
        </Button>
        <Button
          type="button"
          loading={busy}
          disabled={!canWrite || !canCompleteModule3(form)}
          onClick={() => void save(true)}
        >
          Complete financial section
        </Button>
        <Link
          href={`/family-links?caseId=${caseId}`}
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-control-border px-4 text-base font-medium"
        >
          Invite parent
        </Link>
        <Link
          href={`/cases/${caseId}/costs`}
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-control-border px-4 text-base font-medium"
        >
          View estimate
        </Link>
      </div>
      {module3Completed ? (
        <p className="text-sm text-text-muted">This financial section is already complete.</p>
      ) : null}
    </form>
  );
}
