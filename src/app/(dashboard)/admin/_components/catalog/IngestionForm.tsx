"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { INGESTION_SOURCE_TYPES } from "@/domain/catalog/ingestion";
import { Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ProposedRow {
  path: string;
  value: string;
}

export function IngestionForm() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<(typeof INGESTION_SOURCE_TYPES)[number]>(
    "official_url",
  );
  const [entityType, setEntityType] = useState("university");
  const [entityId, setEntityId] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [permissionBasis, setPermissionBasis] = useState("official_public_page");
  const [licenseRef, setLicenseRef] = useState("");
  const [contentHash, setContentHash] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [reason, setReason] = useState("");
  const [fields, setFields] = useState<ProposedRow[]>([
    { path: "name", value: "" },
    { path: "city", value: "" },
  ]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function proposedFields(): Record<string, string> {
    const next: Record<string, string> = {};
    for (const field of fields) {
      if (field.path.trim() !== "" && field.value.trim() !== "") {
        next[field.path.trim()] = field.value.trim();
      }
    }
    return next;
  }

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void postAdmin<{ id: string }>("/api/v1/admin/catalog/ingestion", {
          sourceType,
          canonicalUrl,
          permissionBasis,
          licenseRef: licenseRef || undefined,
          entityType,
          entityId: entityId || undefined,
          proposedFields: proposedFields(),
          contentHash: contentHash || undefined,
          excerpt: excerpt || undefined,
          reason,
        }).then((result) => {
          setBusy(false);
          setMessage(result.ok ? "Extraction queued. It is not published." : result.message);
          if (result.ok && result.data?.id) {
            router.push(`/admin/ingestion/${result.data.id}/review`);
          }
        });
      }}
    >
      <SelectField
        id="ingestion-source-type"
        label="Source type"
        required
        value={sourceType}
        onChange={(event) =>
          setSourceType(event.target.value as (typeof INGESTION_SOURCE_TYPES)[number])
        }
        options={INGESTION_SOURCE_TYPES.map((value) => ({ value, label: value }))}
      />
      <SelectField
        id="ingestion-entity-type"
        label="Catalog entity"
        required
        value={entityType}
        onChange={(event) => setEntityType(event.target.value)}
        options={[
          { value: "university", label: "University" },
          { value: "program", label: "Program" },
          { value: "scholarship", label: "Scholarship" },
          { value: "accommodation", label: "Accommodation" },
        ]}
      />
      <TextField
        id="ingestion-entity-id"
        label="Existing entity id"
        optional
        value={entityId}
        onChange={(event) => setEntityId(event.target.value)}
        hint="Required to reconcile against current values. Leave blank only for a new draft context."
      />
      <TextField
        id="ingestion-url"
        label="Exact official URL"
        type="url"
        required
        value={canonicalUrl}
        onChange={(event) => setCanonicalUrl(event.target.value)}
        hint="Private-network and non-allowlisted hosts are rejected."
      />
      <SelectField
        id="ingestion-permission"
        label="Allowlist / retrieval permission"
        required
        value={permissionBasis}
        onChange={(event) => setPermissionBasis(event.target.value)}
        options={[
          { value: "official_public_page", label: "Official public page" },
          { value: "licensed", label: "Licensed feed" },
          { value: "partner_grant", label: "Partner grant" },
          { value: "fair_dealing_excerpt", label: "Fair-dealing excerpt" },
        ]}
      />
      {sourceType === "licensed_feed" ? (
        <TextField
          id="ingestion-license"
          label="License or permission reference"
          required
          value={licenseRef}
          onChange={(event) => setLicenseRef(event.target.value)}
          hint="Ranking and licensed feeds need a documented license, not an assumed open API."
        />
      ) : null}
      {sourceType !== "official_url" ? (
        <>
          <TextField
            id="ingestion-hash"
            label="Content hash"
            required
            value={contentHash}
            onChange={(event) => setContentHash(event.target.value)}
          />
          <TextField
            id="ingestion-excerpt"
            label="Permitted excerpt"
            required
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
          />
        </>
      ) : (
        <p className="text-sm text-text-muted">
          Official URL retrieval stores a timestamp, content hash and a permitted
          excerpt only. If retrieval fails, switch to manual sourced entry.
        </p>
      )}
      <fieldset className="space-y-3">
        <legend className="text-label font-medium text-text">Proposed fields</legend>
        {fields.map((field, index) => (
          <div key={index} className="grid gap-3 min-[720px]:grid-cols-2">
            <TextField
              id={`ingestion-field-path-${index}`}
              label={`Field path ${index + 1}`}
              value={field.path}
              onChange={(event) => {
                const next = [...fields];
                next[index] = { ...field, path: event.target.value };
                setFields(next);
              }}
            />
            <TextField
              id={`ingestion-field-value-${index}`}
              label={`Proposed value ${index + 1}`}
              value={field.value}
              onChange={(event) => {
                const next = [...fields];
                next[index] = { ...field, value: event.target.value };
                setFields(next);
              }}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setFields([...fields, { path: "", value: "" }])}
        >
          Add proposed field
        </Button>
      </fieldset>
      <TextField
        id="ingestion-reason"
        label="Reason"
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-col gap-3 min-[720px]:flex-row">
        <Button type="submit" loading={busy} icon={<LinkIcon aria-hidden className="size-5" />}>
          Queue extraction
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/admin/universities/new")}
        >
          Enter manually
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
