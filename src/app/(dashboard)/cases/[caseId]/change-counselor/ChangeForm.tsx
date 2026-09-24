"use client";

import { Button } from "@/components/ui/Button";
import { CHANGE_CATEGORIES } from "@/domain/counseling/assignment";
import { ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ChangeFormProps {
  caseId: string;
}

export function ChangeForm({ caseId }: ChangeFormProps) {
  const router = useRouter();
  const [category, setCategory] = useState<(typeof CHANGE_CATEGORIES)[number]>("Service fit");
  const [detail, setDetail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const response = await fetch(`/api/v1/cases/${caseId}/change-counselor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, detail }),
    });
    const body = (await response.json()) as {
      data?: { duplicate?: boolean };
      error?: { message?: string };
    };
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error?.message ?? "Request was not saved.");
      return;
    }
    setMessage(
      body.data?.duplicate
        ? "A pending request is already open."
        : "Request submitted. A new counselor does not receive private notes.",
    );
    router.refresh();
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label className="flex flex-col text-sm">
        Reason category
        <select
          className="mt-2 h-12 rounded-[var(--radius-control)] border border-control-border px-3"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as (typeof CHANGE_CATEGORIES)[number])
          }
        >
          {CHANGE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-sm">
        Explanation
        <textarea
          className="mt-2 min-h-32 rounded-[var(--radius-control)] border border-control-border p-3"
          minLength={2}
          maxLength={2000}
          required
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
        />
      </label>
      {category === "Safety" ? (
        <p className="text-sm text-warning">
          A safety concern goes only to designated admin staff. It is not sent
          to the current counselor as an improvement summary.
        </p>
      ) : (
        <p className="text-sm text-text-muted">
          An ordinary reason summary can reach the previous counselor after
          handoff. It is not a confidential complaint.
        </p>
      )}
      {message ? <p className="text-sm text-text">{message}</p> : null}
      <Button type="submit" loading={busy} icon={<ArrowRightLeft className="size-5" aria-hidden />}>
        Request counselor change
      </Button>
    </form>
  );
}
