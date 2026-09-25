"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function StorySubmitForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [country, setCountry] = useState("");
  const [publicationConsent, setPublicationConsent] = useState(false);
  const [nameConsent, setNameConsent] = useState(false);
  const [imageConsent, setImageConsent] = useState(false);
  const [spotlightConsent, setSpotlightConsent] = useState(false);
  const [mentorNamed, setMentorNamed] = useState(false);
  const [mentorConsent, setMentorConsent] = useState(false);
  const [parentNamed, setParentNamed] = useState(false);
  const [parentConsent, setParentConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(submit: boolean) {
    setBusy(true);
    try {
      const response = await fetch("/api/v1/stories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          title,
          body,
          country,
          topic: "alumni_success",
          publicationConsent,
          nameConsent,
          imageConsent,
          spotlightConsent,
          mentorNamed,
          mentorConsent,
          parentNamed,
          parentConsent,
          submit,
        }),
      });
      const payload = (await response.json()) as {
        data?: { id?: string };
        error?: { message?: string };
      };
      setBusy(false);
      if (!response.ok) {
        setMessage(payload.error?.message ?? "The story could not be saved.");
        return;
      }
      setMessage(submit ? "Submitted for review. It is not public yet." : "Draft saved.");
      router.refresh();
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
      <TextField
        id="story-title"
        label="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      <label className="block text-sm text-text" htmlFor="story-body">
        Story
        <textarea
          id="story-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={3000}
          rows={10}
          className="mt-2 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
          required
        />
      </label>
      <TextField
        id="story-country"
        label="Country"
        value={country}
        onChange={(event) => setCountry(event.target.value.toUpperCase())}
      />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Independent consents</legend>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={publicationConsent}
            onChange={(event) => setPublicationConsent(event.target.checked)}
          />
          I consent to public publication of this story. Admin approval is still required.
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={nameConsent}
            onChange={(event) => setNameConsent(event.target.checked)}
          />
          I consent to showing my name. This is separate from publication.
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={imageConsent}
            onChange={(event) => setImageConsent(event.target.checked)}
          />
          I consent to showing an image. This is separate from publication.
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={spotlightConsent}
            onChange={(event) => setSpotlightConsent(event.target.checked)}
          />
          I consent to a named spotlight. Spotlight is a separate choice.
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={mentorNamed}
            onChange={(event) => setMentorNamed(event.target.checked)}
          />
          A mentor is named in this story.
        </label>
        {mentorNamed ? (
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={mentorConsent}
              onChange={(event) => setMentorConsent(event.target.checked)}
            />
            The named mentor has given separate consent.
          </label>
        ) : null}
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={parentNamed}
            onChange={(event) => setParentNamed(event.target.checked)}
          />
          A parent is named in this story.
        </label>
        {parentNamed ? (
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={parentConsent}
              onChange={(event) => setParentConsent(event.target.checked)}
            />
            The named parent has given separate consent.
          </label>
        ) : null}
      </fieldset>
      <p className="text-sm text-text-muted">
        Saving a private milestone does not publish it or notify a mentor.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="secondary" loading={busy}>
          Save draft
        </Button>
        <Button loading={busy} onClick={() => void save(true)}>
          Submit success story
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
