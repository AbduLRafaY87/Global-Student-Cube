"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PARENT_TOPIC_GROUPS } from "@/domain/mentorship/taxonomy";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ParentMentorFormValues {
  educationLevel: string;
  topics: string[];
  monthlyAvailabilityHours: string;
  experienceYears: string;
  reflection: string;
}

interface ParentMentorProfileFormProps {
  initial: ParentMentorFormValues;
}

function toggle(list: string[], id: string): string[] {
  if (list.includes(id)) {
    return list.filter((item) => item !== id);
  }
  if (list.length >= 3) {
    return list;
  }
  return [...list, id];
}

export function ParentMentorProfileForm({ initial }: ParentMentorProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(asSubmit: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/me/parent-mentor-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          educationLevel: values.educationLevel,
          topics: values.topics,
          monthlyAvailabilityHours: Number(values.monthlyAvailabilityHours),
          experienceYears: values.experienceYears
            ? Number(values.experienceYears)
            : null,
          reflection: values.reflection,
          submit: asSubmit,
        }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      setBusy(false);
      if (!response.ok) {
        setMessage(payload.error?.message ?? "That change was not saved.");
        return;
      }
      if (asSubmit) {
        router.push("/mentor/home");
        return;
      }
      router.refresh();
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(true);
      }}
    >
      <label className="block space-y-2 text-sm" htmlFor="educationLevel">
        <span className="font-medium text-text">Education level</span>
        <select
          id="educationLevel"
          className="h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          value={values.educationLevel}
          onChange={(event) =>
            setValues((current) => ({ ...current, educationLevel: event.target.value }))
          }
        >
          <option value="high_school">High School</option>
          <option value="diploma">Diploma</option>
          <option value="undergraduate">Undergraduate</option>
          <option value="postgraduate">Postgraduate</option>
        </select>
      </label>
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-text">Topics (one to three)</legend>
        {PARENT_TOPIC_GROUPS.map((group) => (
          <div key={group.id} className="space-y-2">
            <p className="text-sm font-medium text-text">{group.label}</p>
            {group.leaves.map((leaf) => (
              <label key={leaf.id} className="flex min-h-12 items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={values.topics.includes(leaf.id)}
                  disabled={!values.topics.includes(leaf.id) && values.topics.length >= 3}
                  onChange={() =>
                    setValues((current) => ({
                      ...current,
                      topics: toggle(current.topics, leaf.id),
                    }))
                  }
                />
                <span>
                  {leaf.label}
                </span>
              </label>
            ))}
          </div>
        ))}
      </fieldset>
      <TextField
        id="monthlyAvailabilityHours"
        label="Hours per month"
        required
        hint="Default and minimum 2."
        value={values.monthlyAvailabilityHours}
        onChange={(event) =>
          setValues((current) => ({ ...current, monthlyAvailabilityHours: event.target.value }))
        }
      />
      <TextField
        id="experienceYears"
        label="Mentoring years"
        optional
        value={values.experienceYears}
        onChange={(event) =>
          setValues((current) => ({ ...current, experienceYears: event.target.value }))
        }
      />
      <label className="block space-y-2 text-sm" htmlFor="parent-reflection">
        <span className="font-medium text-text">Optional reflection (50 words max)</span>
        <textarea
          id="parent-reflection"
          className="min-h-24 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
          value={values.reflection}
          onChange={(event) =>
            setValues((current) => ({ ...current, reflection: event.target.value }))
          }
        />
      </label>
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Published profile preview</h2>
        <p className="mt-2 text-sm text-text-muted">
          Approved parent name and session topics only. A child’s name, education or finances are
          never shown here.
        </p>
      </section>
      {message ? (
        <p className="text-sm text-critical" role="alert">
          {message}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 min-[600px]:flex-row">
        <Button type="button" variant="secondary" loading={busy} onClick={() => void submit(false)}>
          Save draft
        </Button>
        <Button type="submit" loading={busy}>
          Submit parent mentor profile
        </Button>
      </div>
    </form>
  );
}
