"use client";

import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { COST_HORIZONS, type CostHorizon } from "@/domain/costs/annual";
import {
  BUDGET_LINE_KINDS,
  LINE_BASES,
  type BudgetLine,
  type BudgetLineKind,
  type LineBasis,
} from "@/domain/costs/budget";
import { displayMoneyLine } from "@/domain/costs/money";
import type { CostReadinessResult } from "@/domain/costs/readiness";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CostCompareFormProps {
  caseId: string;
  version: number;
  canWrite: boolean;
  horizon: CostHorizon;
  nightsPerMonth: number;
  lines: BudgetLine[];
  parentLinks: { id: string; label: string }[];
  readiness: CostReadinessResult;
  annualLabel: string;
  annualOriginal: string;
  annualUsd: string;
  broaderOriginal: string;
  applicationNote: string;
  fxStale: boolean;
  fxAvailable: boolean;
  fxCapturedAt: string | null;
}

const KIND_LABELS: Record<BudgetLineKind, string> = {
  meals: "Meals",
  transport: "Transport",
  insurance: "Insurance",
  travel: "Travel",
  application_fees: "Application fees",
  visa: "Visa fees",
  other: "Other sourced costs",
};

export function CostCompareForm({
  caseId,
  version,
  canWrite,
  horizon,
  nightsPerMonth,
  lines,
  parentLinks,
  readiness,
  annualLabel,
  annualOriginal,
  annualUsd,
  broaderOriginal,
  applicationNote,
  fxStale,
  fxAvailable,
  fxCapturedAt,
}: CostCompareFormProps) {
  const router = useRouter();
  const [currentHorizon, setCurrentHorizon] = useState<CostHorizon>(horizon);
  const [nights, setNights] = useState(String(nightsPerMonth));
  const [items, setItems] = useState<BudgetLine[]>(
    lines.length > 0
      ? lines
      : BUDGET_LINE_KINDS.filter((kind) => kind !== "application_fees").map((kind) => ({
          kind,
          amount: null,
          currency: "USD",
          basis: "annual" as LineBasis,
          includedInAccommodation: false,
        })),
  );
  const [fundingAmount, setFundingAmount] = useState("");
  const [fundingConfirmed, setFundingConfirmed] = useState(false);
  const [inSavings, setInSavings] = useState(false);
  const [parentLinkId, setParentLinkId] = useState(parentLinks[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(index: number, patch: Partial<BudgetLine>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  async function save() {
    if (!canWrite) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/cases/${caseId}/costs/assumptions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": `"v${version}"`,
        },
        body: JSON.stringify({
          horizon: currentHorizon,
          nightsPerMonth: Number(nights),
          lines: items,
          confirmedFunding:
            fundingAmount === ""
              ? []
              : [
                  {
                    amount: Number(fundingAmount),
                    confirmed: fundingConfirmed,
                    alreadyInSavings: inSavings,
                  },
                ],
        }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      setBusy(false);
      setMessage(response.ok ? "Budget assumptions saved." : (payload.error?.message ?? "Not saved."));
      if (response.ok) {
        router.refresh();
      }
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  async function share() {
    if (!parentLinkId) {
      setMessage("No authorized parent link is available.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/cases/${caseId}/costs/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ parentLinkId }),
      });
      setBusy(false);
      setMessage(response.ok ? "A notice was sent to the linked parent." : "Share was not sent.");
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  return (
    <div className="space-y-6">
      {fxStale ? (
        <p className="rounded-[var(--radius-card)] border border-warning bg-warning-bg p-4 text-sm" role="status">
          This FX snapshot is older than 72 hours
          {fxCapturedAt ? ` (captured ${fxCapturedAt})` : ""}. Confirm it before relying on the USD column.
        </p>
      ) : null}
      {!fxAvailable ? (
        <p className="rounded-[var(--radius-card)] border border-border p-4 text-sm">
          A conversion rate is unavailable. Original currencies are kept. No 1:1 rate is assumed.
        </p>
      ) : null}

      <article className="rounded-[var(--radius-card)] border border-border p-4">
        <h2 className="text-lg font-semibold text-text">{annualLabel}</h2>
        <p className="mt-2 text-sm text-text">
          Annual tuition + 12 × monthly accommodation. This is not a total cost of attendance.
        </p>
        <p className="mt-2 text-sm text-text">{annualOriginal}</p>
        <p className="mt-1 text-sm text-text-muted">USD snapshot: {annualUsd}</p>
      </article>

      <article className="rounded-[var(--radius-card)] border border-border p-4">
        <h2 className="text-lg font-semibold text-text">Broader budget</h2>
        <p className="mt-2 text-sm text-text-muted">
          Separate from the annual comparison. {applicationNote} {broaderOriginal}.
        </p>
      </article>

      <article className="rounded-[var(--radius-card)] border border-border p-4">
        <h2 className="text-lg font-semibold text-text">Readiness</h2>
        {readiness.displayPercent ? (
          <ProgressBar
            label="Financial readiness"
            value={readiness.percent ?? 0}
            displayText={`${readiness.displayPercent}%`}
          />
        ) : (
          <p className="text-sm text-text">
            {readiness.status === "savings_declined"
              ? "Readiness is Unknown because savings were declined."
              : readiness.status === "invalid_denominator"
                ? "Readiness has no score while the expense is zero or unknown."
                : "Readiness is Unknown until savings and expenses can be compared."}
          </p>
        )}
        <p className="mt-2 text-sm text-text-muted">
          Selecting a scholarship never adds funding automatically. Only a confirmed award with usable
          evidence is applied, and never twice if it is already in savings.
        </p>
      </article>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <SelectField
          id="horizon"
          label="Horizon"
          value={currentHorizon}
          onChange={(event) => setCurrentHorizon(event.target.value as CostHorizon)}
          options={COST_HORIZONS.map((value) => ({
            value,
            label: value === "first_year" ? "First academic year" : "Full program",
          }))}
        />
        <TextField
          id="nights"
          label="Nights per month for nightly housing"
          hint="Default 30. This estimate is labelled estimated."
          inputMode="numeric"
          value={nights}
          onChange={(event) => setNights(event.target.value)}
        />
        {items.map((item, index) => (
          <fieldset key={`${item.kind}-${index}`} className="space-y-3 rounded-[var(--radius-card)] border border-border p-4">
            <legend className="text-sm font-medium text-text">{KIND_LABELS[item.kind]}</legend>
            <div className="grid gap-3 min-[640px]:grid-cols-3">
              <TextField
                id={`${item.kind}-amount`}
                label="Amount"
                inputMode="decimal"
                value={item.amount === null ? "" : String(item.amount)}
                onChange={(event) =>
                  update(index, {
                    amount: event.target.value === "" ? null : Number(event.target.value),
                  })
                }
              />
              <TextField
                id={`${item.kind}-currency`}
                label="Currency"
                value={item.currency ?? ""}
                maxLength={3}
                onChange={(event) => update(index, { currency: event.target.value.toUpperCase() || null })}
              />
              <SelectField
                id={`${item.kind}-basis`}
                label="Basis"
                value={item.basis}
                onChange={(event) => update(index, { basis: event.target.value as LineBasis })}
                options={LINE_BASES.map((value) => ({
                  value,
                  label: value === "one_off" ? "One-off" : value,
                }))}
              />
            </div>
            {item.kind === "meals" ? (
              <label className="inline-flex min-h-12 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.includedInAccommodation}
                  onChange={(event) =>
                    update(index, { includedInAccommodation: event.target.checked })
                  }
                />
                Meals are already included in accommodation
              </label>
            ) : null}
          </fieldset>
        ))}
        <fieldset className="space-y-3 rounded-[var(--radius-card)] border border-border p-4">
          <legend className="text-sm font-medium text-text">Confirmed funding</legend>
          <TextField
            id="funding-amount"
            label="Confirmed award amount (USD)"
            hint="Leave empty unless the award is confirmed with usable evidence."
            inputMode="decimal"
            value={fundingAmount}
            onChange={(event) => setFundingAmount(event.target.value)}
          />
          <label className="inline-flex min-h-12 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={fundingConfirmed}
              onChange={(event) => setFundingConfirmed(event.target.checked)}
            />
            This award is confirmed
          </label>
          <label className="inline-flex min-h-12 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inSavings}
              onChange={(event) => setInSavings(event.target.checked)}
            />
            This award is already counted in savings
          </label>
        </fieldset>
        <div className="flex flex-col gap-3 min-[640px]:flex-row">
          <Button type="submit" loading={busy} disabled={!canWrite}>
            Save budget assumptions
          </Button>
          <Link
            href={`/cases/${caseId}/profile/finances`}
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-control-border px-4"
          >
            Edit finances
          </Link>
        </div>
      </form>

      {parentLinks.length > 0 ? (
        <div className="space-y-3">
          <SelectField
            id="share-parent"
            label="Share with linked parent"
            value={parentLinkId}
            onChange={(event) => setParentLinkId(event.target.value)}
            options={parentLinks.map((link) => ({ value: link.id, label: link.label }))}
          />
          <Button type="button" variant="secondary" loading={busy} onClick={() => void share()}>
            Share with linked parent
          </Button>
        </div>
      ) : null}

      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function moneyOrUnavailable(amount: number | null, currency: string | null): string {
  return displayMoneyLine(amount, currency);
}
