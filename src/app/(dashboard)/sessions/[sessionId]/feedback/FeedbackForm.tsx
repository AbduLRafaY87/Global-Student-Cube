"use client";

import { Button } from "@/components/ui/Button";
import {
  COUNSELOR_FEEDBACK_FIELDS,
  FEEDBACK_ANCHORS,
  STUDENT_FEEDBACK_FIELDS,
} from "@/domain/counseling/feedback";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FeedbackFormProps {
  sessionId: string;
  direction: "student_to_counselor" | "counselor_to_student";
  returnTo: string;
}

export function FeedbackForm({ sessionId, direction, returnTo }: FeedbackFormProps) {
  const router = useRouter();
  const fields =
    direction === "student_to_counselor"
      ? STUDENT_FEEDBACK_FIELDS
      : COUNSELOR_FEEDBACK_FIELDS;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const missing = fields.filter((field) => !answers[field]);
    setErrors(missing);
    if (missing.length > 0) {
      return;
    }
    setBusy(true);
    const response = await fetch(`/api/v1/sessions/${sessionId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, answers, comment }),
    });
    setBusy(false);
    if (response.ok) {
      router.push(returnTo);
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {fields.map((field) => (
        <fieldset key={field} className="space-y-2">
          <legend className="text-sm font-medium text-text">{field.replaceAll("_", " ")}</legend>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className="flex h-12 flex-col items-center justify-center text-xs">
                <input
                  type="radio"
                  name={field}
                  value={value}
                  checked={answers[field] === value}
                  onChange={() => setAnswers((current) => ({ ...current, [field]: value }))}
                />
                <span>{value}</span>
                <span>{FEEDBACK_ANCHORS[value - 1]}</span>
              </label>
            ))}
          </div>
          {errors.includes(field) ? (
            <p className="text-sm text-critical">Answer this question to submit.</p>
          ) : null}
        </fieldset>
      ))}
      <label className="flex flex-col text-sm">
        Comment (optional)
        <textarea
          className="mt-2 min-h-24 rounded-[var(--radius-control)] border border-control-border p-3"
          maxLength={2000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>
      <Button type="submit" loading={busy}>
        Submit feedback
      </Button>
    </form>
  );
}
