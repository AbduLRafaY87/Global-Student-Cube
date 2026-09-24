"use client";

import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  SELF_REPORTED_DISCLAIMER,
  assessmentLabelCopy,
  criterionTitle,
  evaluateAssessment,
  publishedThresholdLabel,
  type AssessmentAnswer,
  type AssessmentClaim,
  type AssessmentCriterionInput,
  type StudentScaleEvidence,
} from "@/domain/assessment/assessment";
import { Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface AssessmentFormProps {
  caseId: string;
  programId: string;
  universityId: string;
  universityName: string;
  programName: string;
  canWrite: boolean;
  criteria: AssessmentCriterionInput[];
  initialClaims: AssessmentClaim[];
  evidence: StudentScaleEvidence[];
  files: { id: string; label: string }[];
  needsReassessment: boolean;
}

const RADIO_OPTIONS: { value: AssessmentAnswer; label: string }[] = [
  { value: "meets", label: "Met" },
  { value: "does_not_meet", label: "Not met" },
  { value: "unknown", label: "Unknown" },
];

export function AssessmentForm({
  caseId,
  programId,
  universityId,
  universityName,
  programName,
  canWrite,
  criteria,
  initialClaims,
  evidence,
  files,
  needsReassessment,
}: AssessmentFormProps) {
  const router = useRouter();
  const [claims, setClaims] = useState<AssessmentClaim[]>(
    criteria.map((criterion) => {
      const existing = initialClaims.find((row) => row.key === criterion.key);
      return {
        key: criterion.key,
        answer: existing?.answer === "not_applicable" ? "unknown" : existing?.answer ?? "unknown",
        evidenceFileId: existing?.evidenceFileId ?? null,
        explanation: existing?.explanation ?? "",
      };
    }),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const result = useMemo(
    () => evaluateAssessment(criteria, claims, evidence),
    [criteria, claims, evidence],
  );

  function update(key: string, patch: Partial<AssessmentClaim>) {
    setClaims((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  async function save() {
    if (!canWrite) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/cases/${caseId}/assessment/${programId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityId,
          answers: claims.map((row) => ({
            criterionKey: row.key,
            answer: row.answer,
            evidenceFileId: row.evidenceFileId,
            explanation: row.explanation,
          })),
        }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      setBusy(false);
      setMessage(response.ok ? "Self-check saved." : (payload.error?.message ?? "Not saved."));
      if (response.ok) {
        router.refresh();
      }
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  return (
    <div className="grid gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold text-text">Program self-assessment</h1>
          <p className="mt-2 text-sm text-text">
            {programName} · {universityName}
          </p>
          <p className="mt-2 text-sm font-medium text-text">{SELF_REPORTED_DISCLAIMER}</p>
        </header>
        {needsReassessment ? (
          <p className="text-sm text-warning" role="status">
            Published criteria changed. Review this self-check before relying on the previous result.
          </p>
        ) : null}
        {result.equalWeights ? (
          <p className="text-sm text-text-muted">
            Published weights are missing. Each applicable criterion uses an equal weight.
          </p>
        ) : null}
        <ul className="grid gap-3">
          {criteria.map((criterion) => {
            const claim = claims.find((row) => row.key === criterion.key);
            const scored = result.items.find((row) => row.key === criterion.key);
            return (
              <li
                key={criterion.key}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-text">
                      {criterionTitle(criterion.key)}
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      Threshold: {publishedThresholdLabel(criterion.requirement)} · Weight:{" "}
                      {result.equalWeights ? "equal" : (criterion.weight ?? "Not provided")}
                      {criterion.mandatory ? " · Mandatory" : ""}
                    </p>
                  </div>
                  <span
                    className="inline-flex size-10 items-center justify-center text-text-muted"
                    title={publishedThresholdLabel(criterion.requirement)}
                  >
                    <Info className="size-4" aria-hidden />
                    <span className="sr-only">
                      Published threshold {publishedThresholdLabel(criterion.requirement)}
                    </span>
                  </span>
                </div>
                <fieldset className="mt-3">
                  <legend className="sr-only">
                    {criterionTitle(criterion.key)} result
                  </legend>
                  <div className="flex flex-col gap-2">
                    {RADIO_OPTIONS.map((option) => (
                      <label key={option.value} className="flex min-h-12 items-center gap-2 text-sm text-text">
                        <input
                          type="radio"
                          name={`answer-${criterion.key}`}
                          value={option.value}
                          checked={claim?.answer === option.value}
                          disabled={!canWrite}
                          onChange={() => update(criterion.key, { answer: option.value })}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-3 space-y-3">
                  <SelectField
                    id={`evidence-${criterion.key}`}
                    label="Evidence reference"
                    optional
                    value={claim?.evidenceFileId ?? ""}
                    onChange={(event) =>
                      update(criterion.key, {
                        evidenceFileId: event.target.value === "" ? null : event.target.value,
                      })
                    }
                    options={[
                      { value: "", label: "No file selected" },
                      ...files.map((file) => ({ value: file.id, label: file.label })),
                    ]}
                  />
                  <TextField
                    id={`note-${criterion.key}`}
                    label="Evidence note"
                    optional
                    value={claim?.explanation ?? ""}
                    onChange={(event) => update(criterion.key, { explanation: event.target.value })}
                  />
                </div>
                {scored?.verification === "unlike_scale" ? (
                  <p className="mt-2 text-sm text-warning">
                    Unlike test scales are not compared. This criterion stays Unknown.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
      <aside className="space-y-4 min-[900px]:sticky min-[900px]:top-4 min-[900px]:self-start">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <ProgressBar
            value={result.score ?? 0}
            label="Weighted self-check"
            displayText={
              result.score === null ? "Unknown" : `${result.score.toFixed(1)}% · ${assessmentLabelCopy(result.label)}`
            }
          />
          <p className="mt-3 text-sm text-text">{assessmentLabelCopy(result.label)}</p>
          {result.unknownMandatory ? (
            <p className="mt-2 text-sm text-warning">
              A mandatory criterion is Unknown, so this result is provisional.
            </p>
          ) : null}
          {result.hardUnmet ? (
            <p className="mt-2 text-sm text-critical">
              A hard requirement is not met, so this cannot be Likely eligible.
            </p>
          ) : null}
          {result.knownCoverage !== null ? (
            <p className="mt-2 text-sm text-text-muted">
              Known coverage {result.knownCoverage.toFixed(1)}%. Possible score{" "}
              {result.possibleLow?.toFixed(1)}–{result.possibleHigh?.toFixed(1)}.
            </p>
          ) : null}
        </div>
        <Button type="button" onClick={() => void save()} loading={busy} disabled={!canWrite}>
          Save self-check
        </Button>
        <Link
          className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-control)] border border-control-border px-4 text-sm"
          href={`/cases/${caseId}/costs?program=${programId}`}
        >
          View costs
        </Link>
        <Link
          className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-control)] border border-control-border px-4 text-sm"
          href="/explore/universities"
        >
          See alternatives
        </Link>
        {message ? (
          <p className="text-sm text-text" role="status">
            {message}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
