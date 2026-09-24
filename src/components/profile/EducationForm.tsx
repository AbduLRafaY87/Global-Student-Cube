"use client";

import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  BOARD_SYSTEMS,
  COMPLETION_STATUSES,
  EDUCATION_LEVELS,
  INSTITUTION_LEVELS,
  RESULT_STATUSES,
  SCORE_SCALES,
  type EducationRecordInput,
} from "@/domain/profile/education";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveProfileSection, uploadProfileFile } from "./profile-api";

interface EducationFormProps {
  caseId: string;
  level: string;
  educationYears: number | null;
  records: EducationRecordInput[];
  canWrite: boolean;
}

function emptyRecord(): EducationRecordInput {
  return {
    institution: "",
    level: "school",
    country: "",
    city: "",
    board: "national",
    boardOther: "",
    completionYear: null,
    completionStatus: "completed",
    resultStatus: "available",
    scoreValue: "",
    scoreScale: "percentage",
    scoreBounds: "",
    evidenceId: null,
  };
}

export function EducationForm({
  caseId,
  level,
  educationYears,
  records,
  canWrite,
}: EducationFormProps) {
  const router = useRouter();
  const [currentLevel, setCurrentLevel] = useState(level);
  const [years, setYears] = useState(educationYears === null ? "" : String(educationYears));
  const [items, setItems] = useState<EducationRecordInput[]>(
    records.length > 0 ? records : [emptyRecord()],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(index: number, patch: Partial<EducationRecordInput>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canWrite) {
          return;
        }
        setBusy(true);
        void saveProfileSection(`/api/v1/cases/${caseId}/profile/education`, {
          level: currentLevel,
          educationYears: years === "" ? null : Number(years),
          records: items,
        }).then((result) => {
          setBusy(false);
          setMessage(result.ok ? "Saved." : result.message);
          if (result.ok) {
            router.push(`/cases/${caseId}/profile/tests`);
            router.refresh();
          }
        });
      }}
    >
      <SelectField
        id="education-level"
        label="Current or last education level"
        required
        value={currentLevel}
        onChange={(event) => setCurrentLevel(event.target.value)}
        options={EDUCATION_LEVELS.map((value) => ({
          value,
          label:
            value === "high_school"
              ? "High School"
              : value === "diploma"
                ? "Diploma"
                : value === "ug"
                  ? "Undergraduate"
                  : "Postgraduate",
        }))}
      />
      <TextField
        id="education-years"
        label="Years completed"
        hint="Years actually completed, not projected years."
        required
        inputMode="numeric"
        value={years}
        onChange={(event) => setYears(event.target.value)}
      />

      {items.map((record, index) => (
        <section
          key={`education-${index}`}
          className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 max-[899px]:px-0 min-[900px]:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text">Institution {index + 1}</h2>
            {items.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                icon={<Trash2 aria-hidden className="size-5" />}
                onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <TextField
            id={`institution-${index}`}
            label="Institution"
            required
            value={record.institution}
            onChange={(event) => update(index, { institution: event.target.value })}
          />
          <SelectField
            id={`institution-level-${index}`}
            label="Institution type"
            required
            value={record.level}
            onChange={(event) => update(index, { level: event.target.value as EducationRecordInput["level"] })}
            options={INSTITUTION_LEVELS.map((value) => ({
              value,
              label: value.charAt(0).toUpperCase() + value.slice(1),
            }))}
          />
          <TextField
            id={`country-${index}`}
            label="Country"
            required
            maxLength={2}
            value={record.country}
            onChange={(event) => update(index, { country: event.target.value.toUpperCase() })}
          />
          <TextField
            id={`city-${index}`}
            label="City"
            required
            value={record.city}
            onChange={(event) => update(index, { city: event.target.value })}
          />
          <SelectField
            id={`board-${index}`}
            label="Board or exam system"
            required
            value={record.board}
            onChange={(event) => update(index, { board: event.target.value as EducationRecordInput["board"] })}
            options={BOARD_SYSTEMS.map((value) => ({
              value,
              label: value === "other" ? "Other" : value.toUpperCase(),
            }))}
          />
          {record.board === "other" ? (
            <TextField
              id={`board-other-${index}`}
              label="Other board name"
              required
              value={record.boardOther ?? ""}
              onChange={(event) => update(index, { boardOther: event.target.value })}
            />
          ) : null}
          <SelectField
            id={`completion-${index}`}
            label="Completion"
            required
            value={record.completionStatus}
            onChange={(event) =>
              update(index, {
                completionStatus: event.target.value as EducationRecordInput["completionStatus"],
              })
            }
            options={COMPLETION_STATUSES.map((value) => ({
              value,
              label:
                value === "currently_studying"
                  ? "Currently studying"
                  : value === "awaiting_result"
                    ? "Awaiting result"
                    : "Completed",
            }))}
          />
          <TextField
            id={`year-${index}`}
            label="Year"
            inputMode="numeric"
            value={record.completionYear === null ? "" : String(record.completionYear)}
            onChange={(event) =>
              update(index, {
                completionYear: event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />
          <SelectField
            id={`result-${index}`}
            label="Result status"
            required
            value={record.resultStatus}
            onChange={(event) =>
              update(index, { resultStatus: event.target.value as EducationRecordInput["resultStatus"] })
            }
            options={RESULT_STATUSES.map((value) => ({
              value,
              label:
                value === "available"
                  ? "Available"
                  : value === "awaiting_result"
                    ? "Awaiting result"
                    : "Not available",
            }))}
          />
          {record.resultStatus === "available" ? (
            <>
              <SelectField
                id={`scale-${index}`}
                label="Original score scale"
                hint="A percentage is stored as a percentage. It is never converted to GPA."
                required
                value={record.scoreScale}
                onChange={(event) =>
                  update(index, { scoreScale: event.target.value as EducationRecordInput["scoreScale"] })
                }
                options={SCORE_SCALES.map((value) => ({
                  value,
                  label:
                    value === "gpa"
                      ? "GPA 0–4"
                      : value === "percentage"
                        ? "Percentage 0–100"
                        : value === "letter"
                          ? "Letter"
                          : "Other institution scale",
                }))}
              />
              <TextField
                id={`score-${index}`}
                label="Original score"
                required
                value={record.scoreValue}
                onChange={(event) => update(index, { scoreValue: event.target.value })}
              />
              {record.scoreScale === "other" ? (
                <TextField
                  id={`bounds-${index}`}
                  label="Named bounds"
                  required
                  value={record.scoreBounds ?? ""}
                  onChange={(event) => update(index, { scoreBounds: event.target.value })}
                />
              ) : null}
            </>
          ) : null}
          <label className="block text-sm text-text">
            Transcript
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              disabled={!canWrite || busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                setBusy(true);
                void uploadProfileFile({ caseId, purpose: "transcript", file }).then((result) => {
                  setBusy(false);
                  setMessage(result.ok ? "Transcript uploaded." : result.message);
                  if (result.ok && result.id) {
                    update(index, { evidenceId: result.id });
                  }
                });
              }}
            />
          </label>
        </section>
      ))}

      <Button
        type="button"
        variant="secondary"
        icon={<Plus aria-hidden className="size-5" />}
        onClick={() => setItems((current) => [...current, emptyRecord()])}
      >
        Add institution
      </Button>
      {message ? <p className="text-sm text-text-muted">{message}</p> : null}
      <Button type="submit" loading={busy} disabled={!canWrite}>
        Save and continue
      </Button>
    </form>
  );
}
