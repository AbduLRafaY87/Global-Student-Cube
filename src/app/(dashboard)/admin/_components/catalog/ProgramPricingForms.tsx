"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ProgramPricingFormsProps {
  programId: string;
}

export function ProgramPricingForms({ programId }: ProgramPricingFormsProps) {
  const router = useRouter();
  const [academicYear, setAcademicYear] = useState("2026/27");
  const [feeBasis, setFeeBasis] = useState("annual");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [sourceFactId, setSourceFactId] = useState("");
  const [intakeYear, setIntakeYear] = useState("2026");
  const [intakeMonth, setIntakeMonth] = useState("");
  const [deadlinePrecision, setDeadlinePrecision] = useState("unknown");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineMonth, setDeadlineMonth] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function finish(ok: boolean, text: string) {
    setBusy(false);
    setMessage(ok ? text : text);
    if (ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          void postAdmin(`/api/v1/admin/catalog/programs/${programId}/costs`, {
            academicYear,
            feeBasis,
            amount: Number(amount),
            currency,
            sourceFactId,
            reason,
          }).then((result) =>
            finish(result.ok, result.ok ? "Fee period saved. Annual and full-program stay separate." : result.message),
          );
        }}
      >
        <h2 className="text-lg font-semibold text-text">Sourced fee period</h2>
        <TextField id="fee-year" label="Academic year" required value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} />
        <SelectField
          id="fee-basis"
          label="Fee basis"
          required
          value={feeBasis}
          onChange={(event) => setFeeBasis(event.target.value)}
          options={[
            { value: "annual", label: "Annual" },
            { value: "full_program", label: "Full program" },
          ]}
        />
        <TextField id="fee-amount" label="Amount" type="number" required value={amount} onChange={(event) => setAmount(event.target.value)} />
        <TextField id="fee-currency" label="Original currency" required value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
        <TextField
          id="fee-source"
          label="Source fact id"
          required
          value={sourceFactId}
          onChange={(event) => setSourceFactId(event.target.value)}
          hint="Record a source on this program first, then paste the fact id."
        />
        <TextField id="fee-reason" label="Reason" required value={reason} onChange={(event) => setReason(event.target.value)} />
        <Button type="submit" loading={busy}>
          Add sourced fee period
        </Button>
      </form>

      <form
        className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          void postAdmin(`/api/v1/admin/catalog/programs/${programId}/intakes`, {
            intakeYear: Number(intakeYear),
            intakeMonth: intakeMonth === "" ? undefined : Number(intakeMonth),
            deadlinePrecision,
            deadlineDate: deadlinePrecision === "day" ? deadlineDate : undefined,
            deadlineMonth: deadlinePrecision === "month" ? Number(deadlineMonth) : undefined,
            reason,
          }).then((result) =>
            finish(result.ok, result.ok ? "Intake saved. A month-only deadline is not given a last day." : result.message),
          );
        }}
      >
        <h2 className="text-lg font-semibold text-text">Intake and deadline</h2>
        <TextField id="intake-year" label="Intake year" type="number" required value={intakeYear} onChange={(event) => setIntakeYear(event.target.value)} />
        <TextField id="intake-month" label="Intake month" optional type="number" value={intakeMonth} onChange={(event) => setIntakeMonth(event.target.value)} />
        <SelectField
          id="deadline-precision"
          label="Deadline precision"
          required
          value={deadlinePrecision}
          onChange={(event) => setDeadlinePrecision(event.target.value)}
          options={[
            { value: "day", label: "Day" },
            { value: "month", label: "Month" },
            { value: "unknown", label: "Unknown" },
          ]}
        />
        {deadlinePrecision === "day" ? (
          <TextField id="deadline-date" label="Deadline date" type="date" required value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} />
        ) : null}
        {deadlinePrecision === "month" ? (
          <TextField id="deadline-month" label="Deadline month" type="number" required value={deadlineMonth} onChange={(event) => setDeadlineMonth(event.target.value)} />
        ) : null}
        <TextField id="intake-reason" label="Reason" required value={reason} onChange={(event) => setReason(event.target.value)} />
        <Button type="submit" loading={busy}>
          Save intake
        </Button>
      </form>

      <form
        className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          void postAdmin(`/api/v1/admin/catalog/programs/${programId}/action-link`, {
            applicationUrl,
            reason,
          }).then((result) =>
            finish(result.ok, result.ok ? "Gated application URL saved. It is excluded from public catalog payloads." : result.message),
          );
        }}
      >
        <h2 className="text-lg font-semibold text-text">Gated application URL</h2>
        <TextField
          id="apply-url"
          label="Application URL"
          type="url"
          required
          value={applicationUrl}
          onChange={(event) => setApplicationUrl(event.target.value)}
        />
        <TextField id="apply-reason" label="Reason" required value={reason} onChange={(event) => setReason(event.target.value)} />
        <Button type="submit" loading={busy}>
          Save application URL
        </Button>
      </form>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
