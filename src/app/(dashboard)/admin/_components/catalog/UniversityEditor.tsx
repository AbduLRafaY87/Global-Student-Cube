"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UniversityEditorProps {
  universityId?: string;
  initial: {
    name: string;
    slug: string;
    country: string;
    city: string;
    type: string;
    websiteUrl: string;
    aliases: string;
  };
}

export function UniversityEditor({ universityId, initial }: UniversityEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [country, setCountry] = useState(initial.country);
  const [city, setCity] = useState(initial.city);
  const [type, setType] = useState(initial.type || "public");
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl);
  const [aliases, setAliases] = useState(initial.aliases);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void postAdmin<{ id: string }>("/api/v1/admin/catalog/universities", {
          id: universityId,
          name,
          slug: slug || undefined,
          country,
          city: city || undefined,
          type,
          websiteUrl: websiteUrl || undefined,
          aliases: aliases
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          reason,
        }).then((result) => {
          setBusy(false);
          setMessage(result.ok ? "Draft saved. Attach a source before publish." : result.message);
          if (result.ok && result.data?.id && !universityId) {
            router.push(`/admin/universities/${result.data.id}`);
          } else if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <h2 className="text-lg font-semibold text-text">University</h2>
      <TextField id="uni-name" label="Name" required value={name} onChange={(event) => setName(event.target.value)} />
      <TextField id="uni-slug" label="Slug" optional value={slug} onChange={(event) => setSlug(event.target.value)} />
      <TextField
        id="uni-aliases"
        label="Aliases"
        optional
        value={aliases}
        onChange={(event) => setAliases(event.target.value)}
        hint="Comma-separated. At most 20."
      />
      <SelectField
        id="uni-type"
        label="Type"
        value={type}
        onChange={(event) => setType(event.target.value)}
        options={[
          { value: "public", label: "Public" },
          { value: "private", label: "Private" },
          { value: "research", label: "Research" },
          { value: "community_college", label: "Community college" },
        ]}
      />
      <TextField
        id="uni-country"
        label="Country"
        required
        value={country}
        onChange={(event) => setCountry(event.target.value.toUpperCase())}
        hint="ISO 3166-1 alpha-2, for example GB."
      />
      <TextField id="uni-city" label="City" optional value={city} onChange={(event) => setCity(event.target.value)} />
      <TextField
        id="uni-url"
        label="Public website URL"
        type="url"
        optional
        value={websiteUrl}
        onChange={(event) => setWebsiteUrl(event.target.value)}
      />
      <TextField
        id="uni-reason"
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
