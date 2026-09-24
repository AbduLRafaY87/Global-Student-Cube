"use client";

import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  defaultToeflScale,
  PROFILE_TEST_TYPES,
  TEST_SCALE_CODES,
  type ProfileTestType,
  type TestResultInput,
} from "@/domain/profile/tests";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveProfileSection, uploadProfileFile } from "./profile-api";

interface TestsFormProps {
  caseId: string;
  testsTaken: boolean | null;
  tests: TestResultInput[];
  canWrite: boolean;
}

function emptyTest(type: ProfileTestType): TestResultInput {
  const takenOn = "";
  const toefl = type === "TOEFL" ? defaultToeflScale("2025-01-01") : null;
  return {
    testType: type,
    testVariant: toefl?.testVariant ?? type.toLowerCase(),
    scaleCode:
      type === "IELTS"
        ? TEST_SCALE_CODES.IELTS_09
        : type === "SAT"
          ? TEST_SCALE_CODES.SAT_1600
          : type === "GRE"
            ? TEST_SCALE_CODES.GRE_V_Q_AW
            : type === "TOEFL"
              ? toefl?.scaleCode ?? TEST_SCALE_CODES.TOEFL_IBT_LEGACY_120
              : TEST_SCALE_CODES.OTHER_REPORTED,
    scaleVersion: type === "TOEFL" ? toefl?.scaleVersion ?? "legacy.1" : "1",
    score: null,
    reportedScore: "",
    subscores:
      type === "GRE"
        ? [
            { name: "quantitative", score: null, reported: "" },
            { name: "verbal", score: null, reported: "" },
            { name: "analytical_writing", score: null, reported: "" },
          ]
        : [],
    comparableTotal: null,
    takenOn,
    verification: type === "OTHER" ? "counselor_review" : "unverified",
  };
}

export function TestsForm({ caseId, testsTaken, tests, canWrite }: TestsFormProps) {
  const router = useRouter();
  const [taken, setTaken] = useState<boolean | null>(testsTaken);
  const [items, setItems] = useState<TestResultInput[]>(tests);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(index: number, patch: Partial<TestResultInput>) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }
        const next = { ...item, ...patch };
        if (patch.takenOn && next.testType === "TOEFL") {
          const defaults = defaultToeflScale(patch.takenOn);
          next.scaleCode = defaults.scaleCode;
          next.scaleVersion = defaults.scaleVersion;
          next.testVariant = defaults.testVariant;
        }
        return next;
      }),
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
        void saveProfileSection(`/api/v1/cases/${caseId}/profile/tests`, {
          testsTaken: taken,
          tests: taken ? items : [],
        }).then((result) => {
          setBusy(false);
          setMessage(result.ok ? "Saved." : result.message);
          if (result.ok) {
            router.push(`/cases/${caseId}/profile/preferences`);
            router.refresh();
          }
        });
      }}
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Have you taken standardized tests?</legend>
        <label className="flex min-h-12 items-center gap-2">
          <input
            type="radio"
            name="tests-taken"
            checked={taken === true}
            onChange={() => {
              setTaken(true);
              setConfirmClear(false);
            }}
          />
          Yes
        </label>
        <label className="flex min-h-12 items-center gap-2">
          <input
            type="radio"
            name="tests-taken"
            checked={taken === false}
            onChange={() => {
              if (items.length > 0) {
                setConfirmClear(true);
                return;
              }
              setTaken(false);
            }}
          />
          No
        </label>
      </fieldset>

      {confirmClear ? (
        <div className="rounded-[var(--radius-card)] border border-warning bg-warning-bg p-4">
          <p className="text-sm text-text">Choosing No removes the results you already entered.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setItems([]);
                setTaken(false);
                setConfirmClear(false);
              }}
            >
              Remove results
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmClear(false)}>
              Keep results
            </Button>
          </div>
        </div>
      ) : null}

      {taken ? (
        <div className="grid gap-3 min-[600px]:grid-cols-2">
          {PROFILE_TEST_TYPES.map((type) => (
            <Button
              key={type}
              type="button"
              variant="secondary"
              onClick={() => setItems((current) => [...current, emptyTest(type)])}
            >
              Add {type}
            </Button>
          ))}
        </div>
      ) : null}

      {taken
        ? items.map((item, index) => (
            <section
              key={`${item.testType}-${index}`}
              className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text">{item.testType}</h2>
                <Button
                  type="button"
                  variant="ghost"
                  icon={<Trash2 aria-hidden className="size-5" />}
                  onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Remove test
                </Button>
              </div>
              <p className="text-sm text-text-muted">
                Scale {item.scaleCode} {item.scaleVersion}. Unlike scales are never converted.
              </p>
              <TextField
                id={`taken-${index}`}
                label="Test date"
                type="date"
                required
                value={item.takenOn}
                onChange={(event) => update(index, { takenOn: event.target.value })}
              />
              {item.testType === "GRE" ? (
                <>
                  <TextField
                    id={`gre-q-${index}`}
                    label="Quantitative"
                    inputMode="numeric"
                    value={item.subscores.find((row) => row.name === "quantitative")?.reported ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      update(index, {
                        score: null,
                        subscores: item.subscores.map((row) =>
                          row.name === "quantitative"
                            ? { ...row, reported: value, score: value === "" ? null : Number(value) }
                            : row,
                        ),
                      });
                    }}
                  />
                  <TextField
                    id={`gre-v-${index}`}
                    label="Verbal"
                    inputMode="numeric"
                    value={item.subscores.find((row) => row.name === "verbal")?.reported ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      update(index, {
                        score: null,
                        subscores: item.subscores.map((row) =>
                          row.name === "verbal"
                            ? { ...row, reported: value, score: value === "" ? null : Number(value) }
                            : row,
                        ),
                      });
                    }}
                  />
                  <TextField
                    id={`gre-aw-${index}`}
                    label="Analytical writing"
                    value={item.subscores.find((row) => row.name === "analytical_writing")?.reported ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      update(index, {
                        score: null,
                        subscores: item.subscores.map((row) =>
                          row.name === "analytical_writing"
                            ? { ...row, reported: value, score: value === "" ? null : Number(value) }
                            : row,
                        ),
                      });
                    }}
                  />
                </>
              ) : (
                <TextField
                  id={`score-${index}`}
                  label={item.testType === "OTHER" ? "Reported score" : "Score"}
                  value={item.testType === "OTHER" ? item.reportedScore : item.score === null ? "" : String(item.score)}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (item.testType === "OTHER") {
                      update(index, { reportedScore: value, score: null });
                      return;
                    }
                    update(index, {
                      score: value === "" ? null : Number(value),
                      reportedScore: value,
                    });
                  }}
                />
              )}
              {item.scaleCode === TEST_SCALE_CODES.TOEFL_IBT_BAND_2026 ? (
                <TextField
                  id={`comparable-${index}`}
                  label="Report-provided comparable total (optional)"
                  hint="Stored separately. Never overwrites the 1–6 band score."
                  value={item.comparableTotal === null ? "" : String(item.comparableTotal)}
                  onChange={(event) =>
                    update(index, {
                      comparableTotal: event.target.value === "" ? null : Number(event.target.value),
                    })
                  }
                />
              ) : null}
              {item.testType === "OTHER" ? (
                <SelectField
                  id={`other-scale-${index}`}
                  label="Reported scale"
                  value={item.scaleCode}
                  onChange={(event) => update(index, { scaleCode: event.target.value })}
                  options={[{ value: TEST_SCALE_CODES.OTHER_REPORTED, label: "Original reported scale" }]}
                />
              ) : null}
              <label className="block text-sm text-text">
                Result evidence
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
                    void uploadProfileFile({ caseId, purpose: "test_result", file }).then((result) => {
                      setBusy(false);
                      setMessage(result.ok ? "Evidence uploaded." : result.message);
                      if (result.ok && result.id) {
                        update(index, { evidenceId: result.id, verification: "evidence_attached" });
                      }
                    });
                  }}
                />
              </label>
            </section>
          ))
        : null}

      {message ? <p className="text-sm text-text-muted">{message}</p> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => router.push(`/cases/${caseId}/profile/education`)}>
          Back
        </Button>
        <Button type="submit" loading={busy} disabled={!canWrite}>
          Save and continue
        </Button>
      </div>
    </form>
  );
}
