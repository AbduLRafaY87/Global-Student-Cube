"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { controlClassName } from "@/components/ui/Field";
import { VERIFICATION_DECISIONS } from "@/domain/admin/verification";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ReviewActionsProps {
  caseId: string;
  version: number;
  canEscalate: boolean;
}

export function ReviewActions({
  caseId,
  version,
  canEscalate,
}: ReviewActionsProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<(typeof VERIFICATION_DECISIONS)[number]>(
    "approved",
  );
  const [reason, setReason] = useState("");
  const [applicantMessage, setApplicantMessage] = useState("");
  const [comment, setComment] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(
    path: string,
    body: Record<string, unknown>,
    withVersion = true,
  ) {
    setBusy(true);
    setMessage(null);
    const result = await postAdmin(path, body, withVersion ? version : undefined);
    setBusy(false);
    setMessage(result.message || (result.ok ? "Saved." : null));
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(`/api/v1/admin/verifications/${caseId}/decision`, {
            decision,
            reason,
            applicantMessage,
            version,
          });
        }}
      >
        <SelectField
          id="decision"
          label="Decision"
          required
          value={decision}
          onChange={(event) =>
            setDecision(event.target.value as (typeof VERIFICATION_DECISIONS)[number])
          }
          options={VERIFICATION_DECISIONS.map((value) => ({
            value,
            label: value.split("_").join(" "),
          }))}
        />
        <TextField
          id="reason"
          label="Decision reason"
          required={decision !== "needs_information"}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="flex flex-col">
          <label htmlFor="applicantMessage" className="text-label font-medium text-text">
            Applicant-facing message
          </label>
          <textarea
            id="applicantMessage"
            className={`${controlClassName()} mt-2 min-h-24 py-3`}
            value={applicantMessage}
            onChange={(event) => setApplicantMessage(event.target.value)}
          />
        </div>
        <Button type="submit" loading={busy}>
          Record decision
        </Button>
      </form>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(`/api/v1/admin/verifications/${caseId}/comment`, {
            comment,
            version,
          });
        }}
      >
        <TextField
          id="internal-comment"
          label="Internal comment"
          required
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
        <Button type="submit" variant="secondary" loading={busy}>
          Save internal comment
        </Button>
      </form>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(`/api/v1/admin/verifications/${caseId}/assign`, {
            reviewerId,
            reason: reason || "Assigned for review",
            version,
          });
        }}
      >
        <TextField
          id="reviewer-id"
          label="Assign reviewer (account UUID)"
          required
          value={reviewerId}
          onChange={(event) => setReviewerId(event.target.value)}
        />
        <Button type="submit" variant="secondary" loading={busy}>
          Assign reviewer
        </Button>
      </form>

      {canEscalate ? (
        <Button
          variant="destructive"
          loading={busy}
          onClick={() =>
            void run(`/api/v1/admin/verifications/${caseId}/escalate`, {
              reason: reason || "Seven-day supervisor escalation",
              version,
            })
          }
        >
          Escalate to supervisor
        </Button>
      ) : null}

      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
