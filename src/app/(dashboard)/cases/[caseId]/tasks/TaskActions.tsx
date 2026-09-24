"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface TaskActionsProps {
  caseId: string;
  taskId: string;
  status: string;
}

export function TaskActions({ caseId, taskId, status }: TaskActionsProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(path: string, body: Record<string, unknown>) {
    setBusy(true);
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-4">
      {status === "open" || status === "in_progress" || status === "changes_requested" ? (
        <Button
          loading={busy}
          onClick={() => void run(`/api/v1/tasks/${taskId}`, { event: "submit" })}
        >
          Submit evidence
        </Button>
      ) : null}
      {status === "submitted" ? (
        <Button
          loading={busy}
          onClick={() => void run(`/api/v1/tasks/${taskId}`, { event: "complete" })}
        >
          Accept and complete
        </Button>
      ) : null}
      <div className="space-y-2">
        <TextField
          id="eta"
          label="Need more time (new date)"
          type="date"
          value={nextDue}
          onChange={(event) => setNextDue(event.target.value)}
        />
        <TextField
          id="reason"
          label="Extension reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button
          variant="secondary"
          loading={busy}
          onClick={() =>
            void run(`/api/v1/tasks/${taskId}`, {
              event: "extend",
              nextDueAt: nextDue ? `${nextDue}T12:00:00.000Z` : "",
              reason,
            })
          }
        >
          Need more time
        </Button>
      </div>
      <div className="space-y-2 border-t border-border pt-4">
        <TextField
          id="new-title"
          label="Create task"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button
          variant="secondary"
          loading={busy}
          onClick={() =>
            void run(`/api/v1/cases/${caseId}/tasks`, {
              title,
              ownerRole: "Student",
              description: "",
            })
          }
        >
          Create task
        </Button>
      </div>
    </div>
  );
}
