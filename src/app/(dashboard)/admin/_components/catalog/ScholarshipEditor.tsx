"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ScholarshipEditorProps {
  scholarshipId?: string;
  initial: {
    name: string;
    providerName: string;
    officialUrl: string;
    providerType: string;
    countryCodes: string;
    levels: string;
    fieldIds: string;
    availability: string;
    deadlinePrecision: string;
    deadlineDate: string;
    deadlineMonth: string;
  };
}

export function ScholarshipEditor({ scholarshipId, initial }: ScholarshipEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [providerName, setProviderName] = useState(initial.providerName);
  const [officialUrl, setOfficialUrl] = useState(initial.officialUrl);
  const [providerType, setProviderType] = useState(initial.providerType || "university");
  const [countryCodes, setCountryCodes] = useState(initial.countryCodes);
  const [levels, setLevels] = useState(initial.levels);
  const [fieldIds, setFieldIds] = useState(initial.fieldIds);
  const [availability, setAvailability] = useState(initial.availability || "unknown");
  const [deadlinePrecision, setDeadlinePrecision] = useState(initial.deadlinePrecision || "unknown");
  const [deadlineDate, setDeadlineDate] = useState(initial.deadlineDate);
  const [deadlineMonth, setDeadlineMonth] = useState(initial.deadlineMonth);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void postAdmin<{ id: string }>("/api/v1/admin/catalog/scholarships", {
          id: scholarshipId,
          name,
          providerName,
          officialUrl,
          providerType,
          countryCodes: countryCodes.split(",").map((value) => value.trim()).filter(Boolean),
          levels: levels.split(",").map((value) => value.trim()).filter(Boolean),
          fieldIds: fieldIds.split(",").map((value) => value.trim()).filter(Boolean),
          availability,
          deadlinePrecision,
          deadlineDate: deadlinePrecision === "day" ? deadlineDate : undefined,
          deadlineMonth: deadlinePrecision === "month" ? Number(deadlineMonth) : undefined,
          reason,
        }).then((result) => {
          setBusy(false);
          setMessage(result.ok ? "Draft saved. There is no in-app scholarship submission schema." : result.message);
          if (result.ok && result.data?.id && !scholarshipId) {
            router.push(`/admin/scholarships/${result.data.id}`);
          } else if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <h2 className="text-lg font-semibold text-text">Scholarship metadata</h2>
      <TextField id="sch-name" label="Name" required value={name} onChange={(event) => setName(event.target.value)} />
      <TextField id="sch-provider" label="Provider" required value={providerName} onChange={(event) => setProviderName(event.target.value)} />
      <TextField
        id="sch-url"
        label="Official URL"
        type="url"
        required
        value={officialUrl}
        onChange={(event) => setOfficialUrl(event.target.value)}
      />
      {officialUrl ? (
        <a
          className="inline-flex items-center gap-2 text-sm text-primary underline-offset-2 hover:underline"
          href={officialUrl}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="size-4" aria-hidden />
          Check destination
        </a>
      ) : null}
      <SelectField
        id="sch-provider-type"
        label="Provider type"
        required
        value={providerType}
        onChange={(event) => setProviderType(event.target.value)}
        options={[
          { value: "university", label: "University" },
          { value: "government", label: "Government" },
          { value: "private_foundation", label: "Private foundation" },
          { value: "ngo", label: "NGO" },
        ]}
      />
      <TextField
        id="sch-countries"
        label="Country codes"
        required
        value={countryCodes}
        onChange={(event) => setCountryCodes(event.target.value)}
        hint="Comma-separated ISO codes."
      />
      <TextField
        id="sch-levels"
        label="Levels"
        required
        value={levels}
        onChange={(event) => setLevels(event.target.value)}
        hint="undergraduate, masters, phd, certificate."
      />
      <TextField
        id="sch-fields"
        label="Field ids"
        required
        value={fieldIds}
        onChange={(event) => setFieldIds(event.target.value)}
        hint="Comma-separated taxonomy UUIDs."
      />
      <SelectField
        id="sch-availability"
        label="Availability"
        required
        value={availability}
        onChange={(event) => setAvailability(event.target.value)}
        options={[
          { value: "open", label: "Open" },
          { value: "closed", label: "Closed" },
          { value: "upcoming", label: "Upcoming" },
          { value: "unknown", label: "Unknown" },
        ]}
      />
      <SelectField
        id="sch-precision"
        label="Deadline precision"
        required
        value={deadlinePrecision}
        onChange={(event) => setDeadlinePrecision(event.target.value)}
        options={[
          { value: "day", label: "Day" },
          { value: "month", label: "Month" },
          { value: "unknown", label: "Unknown" },
        ]}
      />
      {deadlinePrecision === "day" ? (
        <TextField id="sch-date" label="Deadline date" type="date" required value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} />
      ) : null}
      {deadlinePrecision === "month" ? (
        <TextField id="sch-month" label="Deadline month" type="number" required value={deadlineMonth} onChange={(event) => setDeadlineMonth(event.target.value)} />
      ) : null}
      <TextField id="sch-reason" label="Reason" required value={reason} onChange={(event) => setReason(event.target.value)} />
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
