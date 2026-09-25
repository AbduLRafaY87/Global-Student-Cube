"use client";

import { Button } from "@/components/ui/Button";
import {
  ACTION_CLARITY_OPTIONS,
  AGREE_OPTIONS,
  CHALLENGE_OPTIONS,
  CLARITY_OPTIONS,
  ENGAGEMENT_OPTIONS,
  OVERALL_OPTIONS,
  PARENT_CLARITY_OPTIONS,
  PARENT_PRACTICALITY_OPTIONS,
  PARENT_RECOMMENDATION_OPTIONS,
  PARENT_USEFULNESS_OPTIONS,
  PREPARATION_OPTIONS,
  SATISFACTION_OPTIONS,
  SCOPE_OPTIONS,
  SESSION_TYPES,
  TECHNICAL_OPTIONS,
} from "@/domain/mentorship/feedback";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface MentoringSummaryFormProps {
  bookingId: string;
  isMentor: boolean;
  isParentMentee: boolean;
  sessionState: string;
}

function Choice({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-text">{label}</legend>
      {options.map((option) => (
        <label key={option} className="flex min-h-12 items-center gap-2 text-sm">
          <input
            type="radio"
            name={id}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          {option}
        </label>
      ))}
    </fieldset>
  );
}

export function MentoringSummaryForm({
  bookingId,
  isMentor,
  isParentMentee,
  sessionState,
}: MentoringSummaryFormProps) {
  const router = useRouter();
  const [sessionType, setSessionType] = useState("career");
  const [goodPoint, setGoodPoint] = useState("");
  const [improvementPoint, setImprovementPoint] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [challenges, setChallenges] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      if (isMentor) {
        const log = await fetch(`/api/v1/bookings/${bookingId}/mentor-log`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({ sessionType, goodPoint, improvementPoint }),
        });
        if (!log.ok) {
          const payload = (await log.json()) as { error?: { message?: string } };
          setBusy(false);
          setMessage(payload.error?.message ?? "That summary was not saved.");
          return;
        }
      }
      const questionnaire = isMentor
        ? "mentor"
        : isParentMentee
          ? "parent_mentee"
          : "alumni_mentee";
      const response = await fetch(`/api/v1/bookings/${bookingId}/mentor-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          questionnaire,
          answers: isMentor || isParentMentee ? answers : { ...answers, challenges },
        }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      setBusy(false);
      if (!response.ok) {
        setMessage(payload.error?.message ?? "That feedback was not saved.");
        return;
      }
      router.refresh();
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  if (sessionState !== "completed") {
    return (
      <p className="text-sm text-text-muted">
        An unfinished meeting cannot earn points. Complete the session first.
      </p>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {isMentor ? (
        <>
          <label className="block space-y-2 text-sm" htmlFor="session-type">
            <span className="font-medium text-text">Session type</span>
            <select
              id="session-type"
              className="h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
              value={sessionType}
              onChange={(event) => setSessionType(event.target.value)}
            >
              {SESSION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm" htmlFor="good-point">
            <span className="font-medium text-text">One good point</span>
            <textarea
              id="good-point"
              required
              maxLength={600}
              className="min-h-24 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
              value={goodPoint}
              onChange={(event) => setGoodPoint(event.target.value)}
            />
          </label>
          <label className="block space-y-2 text-sm" htmlFor="challenge-point">
            <span className="font-medium text-text">One challenge</span>
            <textarea
              id="challenge-point"
              required
              maxLength={600}
              className="min-h-24 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3 py-2"
              value={improvementPoint}
              onChange={(event) => setImprovementPoint(event.target.value)}
            />
          </label>
          <Choice id="preparation" label="Preparation" options={PREPARATION_OPTIONS} value={answers.preparation ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, preparation: value }))} />
          <Choice id="engagement" label="Engagement" options={ENGAGEMENT_OPTIONS} value={answers.engagement ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, engagement: value }))} />
          <Choice id="likelyFollowthrough" label="Likely follow-through" options={AGREE_OPTIONS} value={answers.likelyFollowthrough ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, likelyFollowthrough: value }))} />
          <Choice id="overallExperience" label="Overall experience" options={OVERALL_OPTIONS} value={answers.overallExperience ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, overallExperience: value }))} />
          <Choice id="technicalIssues" label="Technical issues" options={TECHNICAL_OPTIONS} value={answers.technicalIssues ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, technicalIssues: value }))} />
          <Choice id="scopeDifficulty" label="Scope difficulty" options={SCOPE_OPTIONS} value={answers.scopeDifficulty ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, scopeDifficulty: value }))} />
        </>
      ) : isParentMentee ? (
        <>
          <Choice id="clarity" label="Clarity" options={PARENT_CLARITY_OPTIONS} value={answers.clarity ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, clarity: value }))} />
          <Choice id="usefulness" label="Usefulness" options={PARENT_USEFULNESS_OPTIONS} value={answers.usefulness ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, usefulness: value }))} />
          <Choice id="organization" label="Organization" options={AGREE_OPTIONS} value={answers.organization ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, organization: value }))} />
          <Choice id="practicality" label="Practicality" options={PARENT_PRACTICALITY_OPTIONS} value={answers.practicality ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, practicality: value }))} />
          <Choice id="recommendation" label="Recommendation" options={PARENT_RECOMMENDATION_OPTIONS} value={answers.recommendation ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, recommendation: value }))} />
        </>
      ) : (
        <>
          <Choice id="clarity" label="Clarity" options={CLARITY_OPTIONS} value={answers.clarity ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, clarity: value }))} />
          <Choice id="relevance" label="Relevance" options={AGREE_OPTIONS} value={answers.relevance ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, relevance: value }))} />
          <Choice id="preparedKnowledgeable" label="Prepared and knowledgeable" options={AGREE_OPTIONS} value={answers.preparedKnowledgeable ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, preparedKnowledgeable: value }))} />
          <Choice id="actionClarity" label="Action clarity" options={ACTION_CLARITY_OPTIONS} value={answers.actionClarity ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, actionClarity: value }))} />
          <Choice id="satisfaction" label="Satisfaction" options={SATISFACTION_OPTIONS} value={answers.satisfaction ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, satisfaction: value }))} />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-text">Challenges</legend>
            {CHALLENGE_OPTIONS.map((option) => (
              <label key={option} className="flex min-h-12 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={challenges.includes(option)}
                  onChange={() => {
                    if (option === "None") {
                      setChallenges(challenges.includes("None") ? [] : ["None"]);
                      return;
                    }
                    const next = challenges.includes(option)
                      ? challenges.filter((item) => item !== option)
                      : [...challenges.filter((item) => item !== "None"), option];
                    setChallenges(next);
                  }}
                />
                {option}
              </label>
            ))}
          </fieldset>
        </>
      )}
      {message ? (
        <p className="text-sm text-critical" role="alert">
          {message}
        </p>
      ) : null}
      <Button type="submit" loading={busy}>
        Submit summary and feedback
      </Button>
    </form>
  );
}
