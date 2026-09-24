"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RequirementsEditorProps {
  programId: string;
}

export function RequirementsEditor({ programId }: RequirementsEditorProps) {
  const router = useRouter();
  const [criterionKey, setCriterionKey] = useState("minimum_grade");
  const [kind, setKind] = useState("academic");
  const [requirement, setRequirement] = useState('{"scale":"unknown","minimum":"Not provided"}');
  const [mandatory, setMandatory] = useState(true);
  const [weight, setWeight] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(requirement) as Record<string, unknown>;
        } catch {
          setMessage("Requirement JSON is not valid.");
          return;
        }
        setBusy(true);
        void postAdmin(`/api/v1/admin/catalog/programs/${programId}/criteria`, {
          criterionKey,
          kind,
          requirement: parsed,
          mandatory,
          weight: weight === "" ? undefined : Number(weight),
          reason,
        }).then((result) => {
          setBusy(false);
          setMessage(result.ok ? "Draft criterion saved. Publishing versions the rules." : result.message);
          if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <h2 className="text-lg font-semibold text-text">Entry criterion</h2>
      <p className="text-sm text-text-muted">
        Unsupported conversions cannot be stored as a universal rule. Missing
        values stay “Not provided”. Equal-weight fallback applies when weights
        are omitted.
      </p>
      <TextField
        id="crit-key"
        label="Criterion key"
        required
        value={criterionKey}
        onChange={(event) => setCriterionKey(event.target.value)}
      />
      <SelectField
        id="crit-kind"
        label="Kind"
        required
        value={kind}
        onChange={(event) => setKind(event.target.value)}
        options={[
          { value: "academic", label: "Academic" },
          { value: "language", label: "Language" },
          { value: "test", label: "Test" },
          { value: "document", label: "Document" },
          { value: "conditional", label: "Conditional" },
        ]}
      />
      <label className="flex flex-col text-sm text-text" htmlFor="crit-req">
        Requirement JSON
        <textarea
          id="crit-req"
          required
          value={requirement}
          onChange={(event) => setRequirement(event.target.value)}
          className="mt-2 min-h-32 w-full rounded-[var(--radius-control)] border border-control-border bg-surface p-3"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={mandatory}
          onChange={(event) => setMandatory(event.target.checked)}
        />
        Mandatory / hard requirement
      </label>
      <TextField
        id="crit-weight"
        label="Weight"
        optional
        type="number"
        value={weight}
        onChange={(event) => setWeight(event.target.value)}
        hint="Leave blank for equal-weight fallback. Hard requirements override a high weighted score."
      />
      <TextField
        id="crit-reason"
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
