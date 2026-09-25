"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import {
  ALUMNI_TOPIC_GROUPS,
  INDUSTRY_GROUPS,
  INDUSTRY_OTHER_ID,
} from "@/domain/mentorship/taxonomy";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export interface AlumniMentorFormValues {
  studyStatus: string;
  universityAttended: string;
  course: string;
  graduationYear: string;
  graduationIsAnticipated: boolean;
  topics: string[];
  industries: string[];
  industriesOther: string;
  currentOrganization: string;
  role: string;
  employerBusinessUrl: string;
  professionalLink: string;
  monthlyAvailabilityHours: string;
  experienceYears: string;
  reflection: string;
}

interface AlumniMentorProfileFormProps {
  initial: AlumniMentorFormValues;
}

function toggle(list: string[], id: string, max: number): string[] {
  if (list.includes(id)) {
    return list.filter((item) => item !== id);
  }
  if (list.length >= max) {
    return list;
  }
  return [...list, id];
}

export function AlumniMentorProfileForm({ initial }: AlumniMentorProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(
    () => ({
      university: values.universityAttended || "Not provided",
      course: values.course || "Not provided",
      topics: values.topics,
    }),
    [values],
  );

  async function submit(asSubmit: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/me/mentor-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyStatus: values.studyStatus,
          universityAttended: values.universityAttended,
          course: values.course,
          graduationYear: Number(values.graduationYear),
          graduationIsAnticipated: values.graduationIsAnticipated,
          topics: values.topics,
          industries: values.industries,
          industriesOther: values.industriesOther,
          currentOrganization: values.currentOrganization,
          role: values.role,
          employerBusinessUrl: values.employerBusinessUrl,
          professionalLink: values.professionalLink,
          monthlyAvailabilityHours: Number(values.monthlyAvailabilityHours),
          experienceYears: Number(values.experienceYears),
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
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text">Study status</legend>
        <label className="flex min-h-12 items-center gap-2 text-sm">
          <input
            type="radio"
            name="studyStatus"
            checked={values.studyStatus === "currently_studying"}
            onChange={() =>
              setValues((current) => ({
                ...current,
                studyStatus: "currently_studying",
                graduationIsAnticipated: true,
              }))
            }
          />
          Currently studying
        </label>
        <label className="flex min-h-12 items-center gap-2 text-sm">
          <input
            type="radio"
            name="studyStatus"
            checked={values.studyStatus === "graduated"}
            onChange={() =>
              setValues((current) => ({
                ...current,
                studyStatus: "graduated",
                graduationIsAnticipated: false,
              }))
            }
          />
          Graduated
        </label>
      </fieldset>
      <TextField
        id="universityAttended"
        label="University"
        required
        value={values.universityAttended}
        onChange={(event) =>
          setValues((current) => ({ ...current, universityAttended: event.target.value }))
        }
      />
      <TextField
        id="course"
        label="Course"
        required
        value={values.course}
        onChange={(event) => setValues((current) => ({ ...current, course: event.target.value }))}
      />
      <TextField
        id="graduationYear"
        label={values.graduationIsAnticipated ? "Anticipated graduation year" : "Graduation year"}
        required
        inputMode="numeric"
        value={values.graduationYear}
        onChange={(event) =>
          setValues((current) => ({ ...current, graduationYear: event.target.value }))
        }
      />
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-text">Topics (choose exactly 3)</legend>
        {ALUMNI_TOPIC_GROUPS.map((group) => (
          <div key={group.id} className="space-y-2">
            <p className="text-sm font-medium text-text">{group.label}</p>
            {group.leaves.map((leaf) => (
              <label key={leaf.id} className="flex min-h-12 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={values.topics.includes(leaf.id)}
                  disabled={!values.topics.includes(leaf.id) && values.topics.length >= 3}
                  onChange={() =>
                    setValues((current) => ({
                      ...current,
                      topics: toggle(current.topics, leaf.id, 3),
                    }))
                  }
                />
                {leaf.label}
              </label>
            ))}
          </div>
        ))}
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-text">Industry sectors</legend>
        {INDUSTRY_GROUPS.map((group) => (
          <div key={group.id} className="space-y-2">
            <p className="text-sm font-medium text-text">{group.label}</p>
            {group.leaves.map((leaf) => (
              <label key={leaf.id} className="flex min-h-12 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={values.industries.includes(leaf.id)}
                  disabled={!values.industries.includes(leaf.id) && values.industries.length >= 10}
                  onChange={() =>
                    setValues((current) => ({
                      ...current,
                      industries: toggle(current.industries, leaf.id, 10),
                    }))
                  }
                />
                {leaf.label}
              </label>
            ))}
          </div>
        ))}
      </fieldset>
      {values.industries.includes(INDUSTRY_OTHER_ID) ? (
        <TextField
          id="industriesOther"
          label="Other industry"
          required
          value={values.industriesOther}
          onChange={(event) =>
            setValues((current) => ({ ...current, industriesOther: event.target.value }))
          }
        />
      ) : null}
      <TextField
        id="currentOrganization"
        label="Organization"
        optional
        value={values.currentOrganization}
        onChange={(event) =>
          setValues((current) => ({ ...current, currentOrganization: event.target.value }))
        }
      />
      <TextField
        id="role"
        label="Role"
        optional
        value={values.role}
        onChange={(event) => setValues((current) => ({ ...current, role: event.target.value }))}
      />
      <TextField
        id="employerBusinessUrl"
        label="Employer URL"
        optional
        type="url"
        value={values.employerBusinessUrl}
        onChange={(event) =>
          setValues((current) => ({ ...current, employerBusinessUrl: event.target.value }))
        }
      />
      <TextField
        id="professionalLink"
        label="LinkedIn or portfolio"
        optional
        type="url"
        value={values.professionalLink}
        onChange={(event) =>
          setValues((current) => ({ ...current, professionalLink: event.target.value }))
        }
      />
      <TextField
        id="monthlyAvailabilityHours"
        label="Hours per month"
        required
        hint="Minimum 2, in 0.5-hour increments."
        value={values.monthlyAvailabilityHours}
        onChange={(event) =>
          setValues((current) => ({ ...current, monthlyAvailabilityHours: event.target.value }))
        }
      />
      <TextField
        id="experienceYears"
        label="Experience years"
        required
        value={values.experienceYears}
        onChange={(event) =>
          setValues((current) => ({ ...current, experienceYears: event.target.value }))
        }
      />
      <label className="block space-y-2 text-sm" htmlFor="reflection">
        <span className="font-medium text-text">What I wish I knew (50 words max)</span>
        <textarea
          id="reflection"
          className="min-h-24 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
          value={values.reflection}
          onChange={(event) =>
            setValues((current) => ({ ...current, reflection: event.target.value }))
          }
        />
      </label>
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Publishable preview</h2>
        <p className="mt-2 text-sm text-text">{preview.university}</p>
        <p className="text-sm text-text-muted">{preview.course}</p>
        <p className="mt-2 text-sm text-text-muted">
          {preview.topics.length === 3 ? "Three topics selected" : "Choose exactly 3 topics"}
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
          Submit mentor profile
        </Button>
      </div>
    </form>
  );
}
