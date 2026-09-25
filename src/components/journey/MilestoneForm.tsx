"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  INTERNSHIP_RELEVANCE,
  MILESTONE_KINDS,
  MILESTONE_LABELS,
  SEMESTER_STANDING,
} from "@/domain/journey/milestones";
import { INDUSTRY_GROUPS } from "@/domain/mentorship/taxonomy";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface MilestoneFormProps {
  caseId: string;
}

export function MilestoneForm({ caseId }: MilestoneFormProps) {
  const router = useRouter();
  const [kind, setKind] = useState<(typeof MILESTONE_KINDS)[number]>("admission_outcome");
  const [occurredOn, setOccurredOn] = useState("");
  const [exceptionNote, setExceptionNote] = useState("");
  const [gradeValue, setGradeValue] = useState("");
  const [gradeScale, setGradeScale] = useState("");
  const [standing, setStanding] = useState("");
  const [internshipDetails, setInternshipDetails] = useState("");
  const [relevance, setRelevance] = useState("");
  const [position, setPosition] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [influenced, setInfluenced] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const industryOptions = INDUSTRY_GROUPS.flatMap((group) =>
    group.leaves.map((item) => ({ value: item.id, label: `${group.label} · ${item.label}` })),
  );

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const details: Record<string, unknown> = {};
        if (kind === "first_semester") {
          details.gradeValue = gradeValue || null;
          details.gradeScale = gradeScale || null;
          details.standing = standing || null;
        }
        if (kind === "internship") {
          details.details = internshipDetails;
          details.relevance = relevance || null;
        }
        if (kind === "first_job") {
          details.position = position;
          details.company = company;
          details.industry = industry || null;
        }
        if (influenced) {
          details.platformInfluenced = influenced;
        }
        setBusy(true);
        void postAdmin(`/api/v1/cases/${caseId}/journey`, {
          kind,
          occurredOn: occurredOn || undefined,
          details,
          exceptionNote: exceptionNote || undefined,
        }).then((result) => {
          setBusy(false);
          setMessage(
            result.ok
              ? "Private milestone saved. It is self-reported and not published."
              : result.message,
          );
          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <h2 className="text-lg font-semibold text-text">Save a private milestone</h2>
      <p className="text-sm text-text-muted">
        Edit one milestone at a time. Dates stay private. Public consent is a separate step.
      </p>
      <SelectField
        id="milestone-kind"
        label="Milestone"
        required
        value={kind}
        onChange={(event) =>
          setKind(event.target.value as (typeof MILESTONE_KINDS)[number])
        }
        options={MILESTONE_KINDS.map((value) => ({
          value,
          label: MILESTONE_LABELS[value],
        }))}
      />
      <TextField
        id="milestone-date"
        label="Date"
        optional
        type="date"
        value={occurredOn}
        onChange={(event) => setOccurredOn(event.target.value)}
        hint="Past or current dates only. Unknown outcomes may stay empty."
      />
      {kind === "first_semester" ? (
        <>
          <TextField
            id="milestone-grade"
            label="Grade value"
            optional
            value={gradeValue}
            onChange={(event) => setGradeValue(event.target.value)}
          />
          <TextField
            id="milestone-scale"
            label="Grade scale"
            optional
            value={gradeScale}
            onChange={(event) => setGradeScale(event.target.value)}
          />
          <SelectField
            id="milestone-standing"
            label="Standing"
            optional
            value={standing}
            onChange={(event) => setStanding(event.target.value)}
            options={[
              { value: "", label: "Not provided" },
              ...SEMESTER_STANDING.map((value) => ({ value, label: value })),
            ]}
          />
        </>
      ) : null}
      {kind === "internship" ? (
        <>
          <label className="block text-sm text-text" htmlFor="milestone-internship">
            Internship details
            <span className="ml-1 text-text-muted">(optional)</span>
            <textarea
              id="milestone-internship"
              value={internshipDetails}
              onChange={(event) => setInternshipDetails(event.target.value)}
              maxLength={2000}
              rows={4}
              className="mt-2 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
            />
          </label>
          <SelectField
            id="milestone-relevance"
            label="Relevance"
            optional
            value={relevance}
            onChange={(event) => setRelevance(event.target.value)}
            options={[
              { value: "", label: "Not provided" },
              ...INTERNSHIP_RELEVANCE.map((value) => ({
                value,
                label: value.replaceAll("_", " "),
              })),
            ]}
          />
        </>
      ) : null}
      {kind === "first_job" ? (
        <>
          <TextField
            id="milestone-position"
            label="Position"
            optional
            value={position}
            onChange={(event) => setPosition(event.target.value)}
          />
          <TextField
            id="milestone-company"
            label="Company"
            optional
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
          <SelectField
            id="milestone-industry"
            label="Industry"
            optional
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            options={[{ value: "", label: "Not provided" }, ...industryOptions]}
          />
        </>
      ) : null}
      <SelectField
        id="milestone-influence"
        label="Did the platform influence this university outcome?"
        optional
        value={influenced}
        onChange={(event) => setInfluenced(event.target.value)}
        options={[
          { value: "", label: "Not provided" },
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
        hint="Never inferred. This is perceived influence, not causal attribution."
      />
      <TextField
        id="milestone-exception"
        label="Chronology exception"
        optional
        value={exceptionNote}
        onChange={(event) => setExceptionNote(event.target.value)}
        hint="Required only when dates are flagged and you still want to keep them."
      />
      <Button type="submit" loading={busy}>
        Save private milestone
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
