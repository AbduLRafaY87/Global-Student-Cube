"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SourceFactFormProps {
  entityType: string;
  entityId: string;
  defaultFieldPath?: string;
  onCreated?: (factId: string) => void;
}

export function SourceFactForm({
  entityType,
  entityId,
  defaultFieldPath = "name",
  onCreated,
}: SourceFactFormProps) {
  const router = useRouter();
  const [fieldPath, setFieldPath] = useState(defaultFieldPath);
  const [value, setValue] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [contentHash, setContentHash] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [sourceType, setSourceType] = useState("official_university");
  const [nextReviewAt, setNextReviewAt] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void postAdmin<{ id: string }>("/api/v1/admin/catalog/source-facts", {
          entityType,
          entityId,
          fieldPath,
          value,
          canonicalUrl,
          contentHash,
          excerpt,
          sourceType,
          nextReviewAt,
          reason,
        }).then((result) => {
          setBusy(false);
          setMessage(result.ok ? `Source recorded. Fact ${result.data?.id ?? ""}.` : result.message);
          if (result.ok && result.data?.id) {
            onCreated?.(result.data.id);
            router.refresh();
          }
        });
      }}
    >
      <h2 className="text-lg font-semibold text-text">Field source</h2>
      <p className="text-sm text-text-muted">
        Every published field needs a source URL, permitted excerpt, content hash,
        reviewer and next-review date. Missing data stays “Not provided”.
      </p>
      <TextField
        id={`${entityType}-source-field`}
        label="Field path"
        required
        value={fieldPath}
        onChange={(event) => setFieldPath(event.target.value)}
      />
      <TextField
        id={`${entityType}-source-value`}
        label="Sourced value"
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <TextField
        id={`${entityType}-source-url`}
        label="Official URL"
        type="url"
        required
        value={canonicalUrl}
        onChange={(event) => setCanonicalUrl(event.target.value)}
      />
      <TextField
        id={`${entityType}-source-hash`}
        label="Content hash"
        required
        value={contentHash}
        onChange={(event) => setContentHash(event.target.value)}
      />
      <TextField
        id={`${entityType}-source-excerpt`}
        label="Permitted excerpt"
        required
        value={excerpt}
        onChange={(event) => setExcerpt(event.target.value)}
        hint="Store an excerpt only. Full-page snapshots are not kept."
      />
      <SelectField
        id={`${entityType}-source-type`}
        label="Source type"
        required
        value={sourceType}
        onChange={(event) => setSourceType(event.target.value)}
        options={[
          { value: "official_university", label: "Official university" },
          { value: "government", label: "Government" },
          { value: "ranking_provider", label: "Ranking provider (licensed)" },
          { value: "university_partner", label: "University partner" },
        ]}
      />
      <TextField
        id={`${entityType}-next-review`}
        label="Next review date"
        type="date"
        required
        value={nextReviewAt}
        onChange={(event) => setNextReviewAt(event.target.value)}
      />
      <TextField
        id={`${entityType}-source-reason`}
        label="Reason"
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button type="submit" loading={busy}>
        Record source
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
