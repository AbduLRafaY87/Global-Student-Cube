"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  CONTENT_KINDS,
  LEARNING_AUDIENCES,
  LEARNING_CATEGORIES,
  LIBRARY_TYPES,
} from "@/domain/learning/learning";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ContentEditorProps {
  id?: string;
  canPublish: boolean;
  initial: {
    kind: string;
    title: string;
    topic: string;
    category: string;
    audience: string;
    summary: string;
    body: string;
    author: string;
    captions: string;
    transcript: string;
    mediaUrl: string;
    libraryType: string;
    eventInformation: string;
    consentEvidence: string;
    namedConsent: boolean;
    universitySupplied: boolean;
    provenanceVerified: boolean;
    state: string;
  };
}

export function ContentEditor({ id, canPublish, initial }: ContentEditorProps) {
  const router = useRouter();
  const [kind, setKind] = useState(initial.kind);
  const [title, setTitle] = useState(initial.title);
  const [topic, setTopic] = useState(initial.topic);
  const [category, setCategory] = useState(initial.category);
  const [audience, setAudience] = useState(initial.audience);
  const [summary, setSummary] = useState(initial.summary);
  const [body, setBody] = useState(initial.body);
  const [author, setAuthor] = useState(initial.author);
  const [captions, setCaptions] = useState(initial.captions);
  const [transcript, setTranscript] = useState(initial.transcript);
  const [mediaUrl, setMediaUrl] = useState(initial.mediaUrl);
  const [libraryType, setLibraryType] = useState(initial.libraryType);
  const [eventInformation, setEventInformation] = useState(initial.eventInformation);
  const [consentEvidence, setConsentEvidence] = useState(initial.consentEvidence);
  const [namedConsent, setNamedConsent] = useState(initial.namedConsent);
  const [universitySupplied, setUniversitySupplied] = useState(initial.universitySupplied);
  const [provenanceVerified, setProvenanceVerified] = useState(initial.provenanceVerified);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const result = await postAdmin<{ id: string }>("/api/v1/admin/content", {
      id,
      kind,
      title,
      topic,
      category: category || undefined,
      audience,
      summary,
      body,
      author,
      captions,
      transcript,
      mediaUrl,
      libraryType: libraryType || undefined,
      eventInformation,
      consentEvidence,
      namedConsent,
      universitySupplied,
      provenanceVerified,
    });
    setBusy(false);
    setMessage(result.ok ? "Draft saved." : result.message);
    if (result.ok && result.data?.id && !id) {
      router.push(`/admin/content/${result.data.id}`);
    } else if (result.ok) {
      router.refresh();
    }
  }

  async function decide(next: string) {
    if (!id) {
      return;
    }
    setBusy(true);
    const result = await postAdmin(`/api/v1/admin/content/${id}/decision`, { next, reason });
    setBusy(false);
    setMessage(result.ok ? `Moved to ${next}.` : result.message);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <SelectField
        id="content-kind"
        label="Type"
        required
        value={kind}
        onChange={(event) => setKind(event.target.value)}
        options={CONTENT_KINDS.map((item) => ({ value: item, label: item }))}
      />
      <TextField id="content-title" label="Title" required value={title} onChange={(event) => setTitle(event.target.value)} />
      <TextField id="content-topic" label="Topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
      <SelectField
        id="content-audience"
        label="Audience"
        required
        value={audience}
        onChange={(event) => setAudience(event.target.value)}
        options={LEARNING_AUDIENCES.map((item) => ({
          value: item,
          label: AUDIENCE_LABELS[item],
        }))}
      />
      <SelectField
        id="content-category"
        label="Category"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        options={[
          { value: "", label: "None" },
          ...LEARNING_CATEGORIES.map((item) => ({
            value: item,
            label: CATEGORY_LABELS[item],
          })),
        ]}
      />
      <label className="block space-y-2 text-sm" htmlFor="content-summary">
        <span className="font-medium text-text">Summary</span>
        <textarea
          id="content-summary"
          required
          className="min-h-24 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
      </label>
      <label className="block space-y-2 text-sm" htmlFor="content-body">
        <span className="font-medium text-text">Body</span>
        <textarea
          id="content-body"
          className="min-h-32 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <TextField id="content-author" label="Author attribution" value={author} onChange={(event) => setAuthor(event.target.value)} />
      <TextField id="content-media" label="Media URL" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} />
      <label className="block space-y-2 text-sm" htmlFor="content-captions">
        <span className="font-medium text-text">Captions</span>
        <textarea
          id="content-captions"
          className="min-h-20 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
          value={captions}
          onChange={(event) => setCaptions(event.target.value)}
        />
      </label>
      <label className="block space-y-2 text-sm" htmlFor="content-transcript">
        <span className="font-medium text-text">Transcript</span>
        <textarea
          id="content-transcript"
          className="min-h-20 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
        />
      </label>
      <SelectField
        id="content-library"
        label="Library type"
        value={libraryType}
        onChange={(event) => setLibraryType(event.target.value)}
        options={[
          { value: "", label: "None" },
          ...LIBRARY_TYPES.map((item) => ({ value: item, label: item })),
        ]}
      />
      <TextField
        id="content-event"
        label="Event information"
        value={eventInformation}
        onChange={(event) => setEventInformation(event.target.value)}
      />
      <TextField
        id="content-consent"
        label="Consent evidence for named people"
        value={consentEvidence}
        onChange={(event) => setConsentEvidence(event.target.value)}
      />
      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" checked={namedConsent} onChange={(event) => setNamedConsent(event.target.checked)} />
        Named-person consent recorded
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={universitySupplied}
          onChange={(event) => setUniversitySupplied(event.target.checked)}
        />
        University-supplied
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={provenanceVerified}
          onChange={(event) => setProvenanceVerified(event.target.checked)}
        />
        Provenance verified
      </label>
      <p className="text-sm text-text-muted">Current state: {initial.state}. Counselors cannot self-publish.</p>
      <Button loading={busy} type="submit">
        Save draft
      </Button>
      {id ? (
        <div className="space-y-3">
          <label className="block space-y-2 text-sm" htmlFor="content-reason">
            <span className="font-medium text-text">Audit reason</span>
            <textarea
              id="content-reason"
              className="min-h-20 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="flex flex-col gap-3 min-[600px]:flex-row">
            <Button type="button" variant="secondary" loading={busy} onClick={() => void decide("submitted")}>
              Submit for review
            </Button>
            {canPublish ? (
              <>
                <Button type="button" loading={busy} onClick={() => void decide("published")}>
                  Publish approved version
                </Button>
                <Button type="button" variant="secondary" loading={busy} onClick={() => void decide("archived")}>
                  Archive
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      {message ? <p className="text-sm text-text">{message}</p> : null}
    </form>
  );
}
