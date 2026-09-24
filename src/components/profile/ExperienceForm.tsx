"use client";

import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  ACTIVITY_MAX,
  ACTIVITY_TYPES,
  type ActivityInput,
  type AwardInput,
  type RelativeInput,
} from "@/domain/profile/experience";
import { wordCount } from "@/domain/profile/preferences";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveProfileSection, uploadProfileFile } from "./profile-api";

interface ExperienceFormProps {
  caseId: string;
  careerGoal: string;
  activities: ActivityInput[];
  scholarshipReceived: boolean | null;
  scholarshipNotGranted: boolean | null;
  awards: AwardInput[];
  relative: RelativeInput;
  introFileId: string | null;
  canWrite: boolean;
}

function emptyActivity(ordinal: number): ActivityInput {
  return {
    ordinal,
    type: "academic",
    otherType: "",
    name: "",
    role: "",
    durationMonths: null,
    durationText: "",
    hoursWeek: null,
    achievements: "",
  };
}

export function ExperienceForm({
  caseId,
  careerGoal,
  activities,
  scholarshipReceived,
  scholarshipNotGranted,
  awards,
  relative,
  introFileId,
  canWrite,
}: ExperienceFormProps) {
  const router = useRouter();
  const [goal, setGoal] = useState(careerGoal);
  const [items, setItems] = useState(activities);
  const [received, setReceived] = useState(scholarshipReceived);
  const [notGranted, setNotGranted] = useState(scholarshipNotGranted);
  const [awardRows, setAwardRows] = useState(awards);
  const [relativeRow, setRelativeRow] = useState(relative);
  const [introId, setIntroId] = useState(introFileId);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const count = wordCount(goal);

  function updateActivity(index: number, patch: Partial<ActivityInput>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  return (
    <form
      className="space-y-6 max-[899px]:-mx-4 max-[899px]:px-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canWrite) {
          return;
        }
        setBusy(true);
        void saveProfileSection(`/api/v1/cases/${caseId}/profile/experience`, {
          careerGoal: goal,
          activities: items.map((item, index) => ({ ...item, ordinal: index + 1 })),
          scholarshipReceived: received,
          scholarshipNotGranted: notGranted,
          awards: awardRows,
          relative: relativeRow,
          introFileId: introId,
        }).then((result) => {
          setBusy(false);
          setMessage(result.ok ? "Saved." : result.message);
          if (result.ok) {
            router.push(`/cases/${caseId}/profile/finances`);
            router.refresh();
          }
        });
      }}
    >
      <label className="block text-sm font-medium text-text" htmlFor="career-goal">
        Career goal and interests
        <textarea
          id="career-goal"
          required
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          className="mt-2 min-h-32 w-full rounded-[var(--radius-control)] border border-control-border bg-surface p-3"
        />
        <span className={`mt-1 block text-sm ${count > 200 ? "text-critical" : "text-text-muted"}`}>
          {count} / 200 words
        </span>
      </label>

      {items.map((item, index) => (
        <section key={`activity-${index}`} className="space-y-4 rounded-[var(--radius-card)] border border-border p-4">
          <h2 className="text-lg font-semibold text-text">Activity {index + 1}</h2>
          <SelectField
            id={`activity-type-${index}`}
            label="Type"
            required
            value={item.type}
            onChange={(event) => updateActivity(index, { type: event.target.value as ActivityInput["type"] })}
            options={ACTIVITY_TYPES.map((value) => ({
              value,
              label: value.charAt(0).toUpperCase() + value.slice(1),
            }))}
          />
          {item.type === "other" ? (
            <TextField
              id={`activity-other-${index}`}
              label="Other type"
              required
              value={item.otherType}
              onChange={(event) => updateActivity(index, { otherType: event.target.value })}
            />
          ) : null}
          <TextField
            id={`activity-name-${index}`}
            label="Name"
            required
            maxLength={160}
            value={item.name}
            onChange={(event) => updateActivity(index, { name: event.target.value })}
          />
          <TextField
            id={`activity-role-${index}`}
            label="Role"
            optional
            maxLength={160}
            value={item.role}
            onChange={(event) => updateActivity(index, { role: event.target.value })}
          />
          <TextField
            id={`activity-duration-${index}`}
            label="Duration in months"
            optional
            inputMode="numeric"
            value={item.durationMonths === null ? "" : String(item.durationMonths)}
            onChange={(event) =>
              updateActivity(index, {
                durationMonths: event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />
          <TextField
            id={`activity-duration-text-${index}`}
            label="Duration description"
            optional
            hint="Use this when dates would be invented."
            maxLength={80}
            value={item.durationText}
            onChange={(event) => updateActivity(index, { durationText: event.target.value })}
          />
          <TextField
            id={`activity-hours-${index}`}
            label="Hours each week"
            optional
            value={item.hoursWeek === null ? "" : String(item.hoursWeek)}
            onChange={(event) =>
              updateActivity(index, {
                hoursWeek: event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />
          <TextField
            id={`activity-achievements-${index}`}
            label="Achievements"
            optional
            maxLength={600}
            value={item.achievements}
            onChange={(event) => updateActivity(index, { achievements: event.target.value })}
          />
        </section>
      ))}

      <Button
        type="button"
        variant="secondary"
        icon={<Plus aria-hidden className="size-5" />}
        disabled={items.length >= ACTIVITY_MAX}
        onClick={() => setItems((current) => [...current, emptyActivity(current.length + 1)])}
      >
        Add activity
      </Button>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Scholarship received?</legend>
        <label className="flex min-h-12 items-center gap-2">
          <input type="radio" checked={received === true} onChange={() => setReceived(true)} />
          Yes
        </label>
        <label className="flex min-h-12 items-center gap-2">
          <input type="radio" checked={received === false} onChange={() => setReceived(false)} />
          No
        </label>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Applied and not granted?</legend>
        <label className="flex min-h-12 items-center gap-2">
          <input type="radio" checked={notGranted === true} onChange={() => setNotGranted(true)} />
          Yes
        </label>
        <label className="flex min-h-12 items-center gap-2">
          <input type="radio" checked={notGranted === false} onChange={() => setNotGranted(false)} />
          No
        </label>
      </fieldset>

      {awardRows.map((award, index) => (
        <section key={`award-${index}`} className="space-y-4 rounded-[var(--radius-card)] border border-border p-4">
          <TextField
            id={`award-name-${index}`}
            label="Scholarship name"
            required
            value={award.name}
            onChange={(event) =>
              setAwardRows((current) =>
                current.map((row, rowIndex) =>
                  rowIndex === index ? { ...row, name: event.target.value } : row,
                ),
              )
            }
          />
          <SelectField
            id={`award-outcome-${index}`}
            label="Outcome"
            value={award.outcome}
            onChange={(event) =>
              setAwardRows((current) =>
                current.map((row, rowIndex) =>
                  rowIndex === index
                    ? { ...row, outcome: event.target.value as AwardInput["outcome"] }
                    : row,
                ),
              )
            }
            options={[
              { value: "received", label: "Received" },
              { value: "not_granted", label: "Applied, not granted" },
            ]}
          />
          <TextField
            id={`award-year-${index}`}
            label="Year"
            required
            value={award.year === null ? "" : String(award.year)}
            onChange={(event) =>
              setAwardRows((current) =>
                current.map((row, rowIndex) =>
                  rowIndex === index
                    ? { ...row, year: event.target.value === "" ? null : Number(event.target.value) }
                    : row,
                ),
              )
            }
          />
          <TextField
            id={`award-amount-${index}`}
            label="Original amount"
            optional
            value={award.amount === null ? "" : String(award.amount)}
            onChange={(event) =>
              setAwardRows((current) =>
                current.map((row, rowIndex) =>
                  rowIndex === index
                    ? { ...row, amount: event.target.value === "" ? null : Number(event.target.value) }
                    : row,
                ),
              )
            }
          />
          <TextField
            id={`award-currency-${index}`}
            label="Currency"
            optional
            maxLength={3}
            value={award.currency ?? ""}
            onChange={(event) =>
              setAwardRows((current) =>
                current.map((row, rowIndex) =>
                  rowIndex === index
                    ? { ...row, currency: event.target.value === "" ? null : event.target.value.toUpperCase() }
                    : row,
                ),
              )
            }
          />
          <TextField
            id={`award-reason-${index}`}
            label="Evidence unavailable reason"
            optional
            value={award.evidenceUnavailableReason}
            onChange={(event) =>
              setAwardRows((current) =>
                current.map((row, rowIndex) =>
                  rowIndex === index
                    ? { ...row, evidenceUnavailableReason: event.target.value }
                    : row,
                ),
              )
            }
          />
        </section>
      ))}
      {received || notGranted ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setAwardRows((current) => [
              ...current,
              {
                name: "",
                outcome: received ? "received" : "not_granted",
                year: null,
                amount: null,
                currency: null,
                evidenceUnavailableReason: "",
              },
            ])
          }
        >
          Add scholarship record
        </Button>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Relative abroad?</legend>
        <label className="flex min-h-12 items-center gap-2">
          <input
            type="radio"
            checked={relativeRow.hasRelative}
            onChange={() => setRelativeRow((current) => ({ ...current, hasRelative: true }))}
          />
          Yes
        </label>
        <label className="flex min-h-12 items-center gap-2">
          <input
            type="radio"
            checked={!relativeRow.hasRelative}
            onChange={() =>
              setRelativeRow({ hasRelative: false, relationship: "", country: "", city: "" })
            }
          />
          No
        </label>
      </fieldset>
      {relativeRow.hasRelative ? (
        <>
          <TextField
            id="relative-relationship"
            label="Relationship"
            required
            hint="No relative name or contact is collected."
            value={relativeRow.relationship}
            onChange={(event) =>
              setRelativeRow((current) => ({ ...current, relationship: event.target.value }))
            }
          />
          <TextField
            id="relative-country"
            label="Country"
            required
            maxLength={2}
            value={relativeRow.country}
            onChange={(event) =>
              setRelativeRow((current) => ({ ...current, country: event.target.value.toUpperCase() }))
            }
          />
          <TextField
            id="relative-city"
            label="City"
            required
            value={relativeRow.city}
            onChange={(event) =>
              setRelativeRow((current) => ({ ...current, city: event.target.value }))
            }
          />
        </>
      ) : null}

      <label className="block text-sm text-text">
        Optional 60-second introduction
        <input
          className="mt-2 block w-full text-sm"
          type="file"
          accept="video/mp4"
          disabled={!canWrite || busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            setBusy(true);
            void uploadProfileFile({
              caseId,
              purpose: "introduction_media",
              file,
            }).then((result) => {
              setBusy(false);
              setMessage(result.ok ? "Introduction uploaded." : result.message);
              if (result.ok && result.id) {
                setIntroId(result.id);
              }
            });
          }}
        />
      </label>
      <p className="text-sm text-text-muted">
        No video never lowers service priority. Skip optional details if you prefer.
      </p>

      {message ? <p className="text-sm text-text-muted">{message}</p> : null}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(`/cases/${caseId}/profile/preferences`)}
        >
          Back
        </Button>
        <Button type="submit" loading={busy} disabled={!canWrite}>
          Save and continue
        </Button>
      </div>
    </form>
  );
}
