"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { CATALOG_FIELD_OPTIONS } from "@/app/(dashboard)/admin/_components/catalog/display";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ProgramEditorProps {
  programId?: string;
  initial: {
    universityId: string;
    name: string;
    level: string;
    fieldId: string;
    durationValue: string;
    durationUnit: string;
    studyModes: string;
    generalUrl: string;
    internationalRatio: string;
  };
}

export function ProgramEditor({ programId, initial }: ProgramEditorProps) {
  const router = useRouter();
  const [universityId, setUniversityId] = useState(initial.universityId);
  const [name, setName] = useState(initial.name);
  const [level, setLevel] = useState(initial.level || "undergraduate");
  const [fieldId, setFieldId] = useState(initial.fieldId || CATALOG_FIELD_OPTIONS[0].value);
  const [durationValue, setDurationValue] = useState(initial.durationValue || "1");
  const [durationUnit, setDurationUnit] = useState(initial.durationUnit || "years");
  const [studyModes, setStudyModes] = useState(initial.studyModes || "on_campus");
  const [generalUrl, setGeneralUrl] = useState(initial.generalUrl);
  const [internationalRatio, setInternationalRatio] = useState(initial.internationalRatio);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void postAdmin<{ id: string }>("/api/v1/admin/catalog/programs", {
          id: programId,
          universityId,
          name,
          level,
          fieldId,
          durationValue: Number(durationValue),
          durationUnit,
          studyModes: studyModes.split(",").map((value) => value.trim()).filter(Boolean),
          generalUrl: generalUrl || undefined,
          internationalRatio:
            internationalRatio === "" ? undefined : Number(internationalRatio),
          reason,
        }).then((result) => {
          setBusy(false);
          setMessage(result.ok ? "Draft saved. Attach sources before publish." : result.message);
          if (result.ok && result.data?.id && !programId) {
            router.push(`/admin/programs/${result.data.id}`);
          } else if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <h2 className="text-lg font-semibold text-text">Program</h2>
      <TextField
        id="prog-university"
        label="University id"
        required
        value={universityId}
        onChange={(event) => setUniversityId(event.target.value)}
      />
      <TextField id="prog-name" label="Name" required value={name} onChange={(event) => setName(event.target.value)} />
      <SelectField
        id="prog-level"
        label="Level"
        required
        value={level}
        onChange={(event) => setLevel(event.target.value)}
        options={[
          { value: "undergraduate", label: "Undergraduate" },
          { value: "masters", label: "Masters" },
          { value: "phd", label: "PhD" },
          { value: "certificate", label: "Certificate" },
        ]}
      />
      <SelectField
        id="prog-field"
        label="Field"
        required
        value={fieldId}
        onChange={(event) => setFieldId(event.target.value)}
        options={[...CATALOG_FIELD_OPTIONS]}
      />
      <TextField
        id="prog-duration"
        label="Duration"
        type="number"
        required
        value={durationValue}
        onChange={(event) => setDurationValue(event.target.value)}
      />
      <SelectField
        id="prog-unit"
        label="Duration unit"
        required
        value={durationUnit}
        onChange={(event) => setDurationUnit(event.target.value)}
        options={[
          { value: "years", label: "Years" },
          { value: "months", label: "Months" },
          { value: "semesters", label: "Semesters" },
        ]}
      />
      <TextField
        id="prog-modes"
        label="Study modes"
        required
        value={studyModes}
        onChange={(event) => setStudyModes(event.target.value)}
        hint="Comma-separated: on_campus, online."
      />
      <TextField
        id="prog-url"
        label="Public information URL"
        type="url"
        optional
        value={generalUrl}
        onChange={(event) => setGeneralUrl(event.target.value)}
      />
      <TextField
        id="prog-ratio"
        label="International ratio"
        optional
        type="number"
        value={internationalRatio}
        onChange={(event) => setInternationalRatio(event.target.value)}
      />
      <TextField
        id="prog-reason"
        label="Reason"
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button type="submit" loading={busy}>
        Save draft
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
