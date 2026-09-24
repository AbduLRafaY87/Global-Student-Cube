"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function GuardianCaseForm() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentDob, setStudentDob] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void fetch("/api/v1/parent/guardian-cases", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({ studentName, studentDob }),
        })
          .then(async (response) => {
            const payload = (await response.json()) as {
              data?: { caseId: string };
              error?: { message?: string };
            };
            setBusy(false);
            if (!response.ok || !payload.data) {
              setMessage(payload.error?.message ?? "The case was not created.");
              return;
            }
            router.push(`/parent/home?caseId=${payload.data.caseId}`);
            router.refresh();
          })
          .catch(() => {
            setBusy(false);
            setMessage("You’re offline. Reconnect to continue.");
          });
      }}
    >
      <p className="text-sm text-text-muted">
        For a child under 13, open a guardian-operated case without creating child
        login credentials. The link waits in the admin verification queue.
      </p>
      <TextField
        id="guardian-student-name"
        label="Student name"
        required
        value={studentName}
        onChange={(event) => setStudentName(event.target.value)}
      />
      <TextField
        id="guardian-student-dob"
        label="Date of birth"
        type="date"
        required
        value={studentDob}
        onChange={(event) => setStudentDob(event.target.value)}
      />
      <Button type="submit" loading={busy}>
        Create guardian-operated case
      </Button>
      {message ? (
        <p className="text-sm text-critical" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
