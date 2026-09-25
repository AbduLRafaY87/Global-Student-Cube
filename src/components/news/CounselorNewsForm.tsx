"use client";

import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { NEWS_TOPIC_LABELS, NEWS_TOPICS } from "@/domain/news/news";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CounselorNewsFormProps {
  id?: string;
  initial: {
    title: string;
    summary: string;
    topic: string;
    body: string;
    sourceUrl: string;
    captions: string;
    rightsDeclaration: string;
    state: string;
    revisionReason: string;
  };
}

export function CounselorNewsForm({ id, initial }: CounselorNewsFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [topic, setTopic] = useState(initial.topic || NEWS_TOPICS[0]);
  const [body, setBody] = useState(initial.body);
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [captions, setCaptions] = useState(initial.captions);
  const [rights, setRights] = useState(initial.rightsDeclaration);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(submit: boolean) {
    setBusy(true);
    try {
      const response = await fetch("/api/v1/news/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          id,
          title,
          summary,
          topic,
          body,
          sourceUrl,
          captions,
          rightsDeclaration: rights,
          submit,
        }),
      });
      const payload = (await response.json()) as {
        data?: { id?: string; state?: string };
        error?: { message?: string };
      };
      setBusy(false);
      if (!response.ok || !payload.data?.id) {
        setMessage(payload.error?.message ?? "The draft could not be saved.");
        return;
      }
      setMessage(submit ? "Submitted for review. Publication status is not yours to set." : "Draft saved.");
      if (!id) {
        router.push(`/news/submit/${payload.data.id}`);
      } else {
        router.refresh();
      }
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
    >
      {initial.state === "changes_requested" && initial.revisionReason ? (
        <p className="rounded-[var(--radius-card)] border border-warning bg-surface p-4 text-sm text-text">
          Revision requested: {initial.revisionReason}
        </p>
      ) : null}
      <SelectField
        id="news-topic"
        label="Topic"
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        options={NEWS_TOPICS.map((item) => ({
          value: item,
          label: NEWS_TOPIC_LABELS[item],
        }))}
      />
      <TextField
        id="news-title"
        label="Headline"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      <label className="block text-sm text-text" htmlFor="news-summary">
        Two-to-three-line summary
        <textarea
          id="news-summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          maxLength={280}
          rows={3}
          className="mt-2 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
          required
        />
      </label>
      <TextField
        id="news-source"
        label="Source URL"
        value={sourceUrl}
        onChange={(event) => setSourceUrl(event.target.value)}
      />
      <label className="block text-sm text-text" htmlFor="news-body">
        Full body
        <textarea
          id="news-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={8}
          className="mt-2 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
        />
      </label>
      <TextField
        id="news-captions"
        label="Captions or rights note"
        value={captions}
        onChange={(event) => setCaptions(event.target.value)}
      />
      <TextField
        id="news-rights"
        label="Rights declaration"
        value={rights}
        onChange={(event) => setRights(event.target.value)}
      />
      <p className="text-sm text-text-muted">
        Review status: {initial.state || "draft"}. A counselor cannot publish this item.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="secondary" loading={busy}>
          Save draft
        </Button>
        <Button loading={busy} onClick={() => void save(true)}>
          Submit for review
        </Button>
        {id ? (
          <a
            className="inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
            href={`/news/${id}`}
          >
            Preview
          </a>
        ) : null}
      </div>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
