"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  GUIDANCE_LEVELS,
  VISA_CATEGORIES,
  VISA_CATEGORY_LABELS,
} from "@/domain/catalog/guidance";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface GuidanceEditorProps {
  guidanceId?: string;
  initial: {
    country: string;
    studyLevel: string;
    visaCategory: string;
    nationalityApplicability: string;
    officialUrl: string;
    officialAuthority: string;
    sourceDate: string;
    applicationFeeAmount: string;
    applicationFeeCurrency: string;
    visaFeeAmount: string;
    visaFeeCurrency: string;
    paymentNotes: string;
    processingMin: string;
    processingMax: string;
    processingUnit: string;
    documents: string;
    countryRules: string;
    workHoursValue: string;
    workHoursPeriod: string;
    workHoursConditions: string;
    workHoursSource: string;
    workHoursSourceDate: string;
    faq: string;
    reapplicationNotes: string;
    studentAdvice: string;
    counselorNotes: string;
    nextReviewAt: string;
  };
}

export function GuidanceEditor({ guidanceId, initial }: GuidanceEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(key: keyof typeof initial, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void postAdmin<{ id: string }>("/api/v1/admin/catalog/guidance", {
          id: guidanceId,
          country: form.country,
          studyLevel: form.studyLevel,
          visaCategory: form.visaCategory,
          nationalityApplicability: form.nationalityApplicability,
          officialUrl: form.officialUrl || undefined,
          officialAuthority: form.officialAuthority || undefined,
          sourceDate: form.sourceDate || undefined,
          applicationFeeAmount: form.applicationFeeAmount
            ? Number(form.applicationFeeAmount)
            : undefined,
          applicationFeeCurrency: form.applicationFeeCurrency || undefined,
          visaFeeAmount: form.visaFeeAmount ? Number(form.visaFeeAmount) : undefined,
          visaFeeCurrency: form.visaFeeCurrency || undefined,
          paymentNotes: form.paymentNotes || undefined,
          processingMin: form.processingMin ? Number(form.processingMin) : undefined,
          processingMax: form.processingMax ? Number(form.processingMax) : undefined,
          processingUnit: form.processingUnit || undefined,
          documents: form.documents
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .map((key) => ({ key })),
          countryRules: form.countryRules || undefined,
          workHoursValue: form.workHoursValue ? Number(form.workHoursValue) : undefined,
          workHoursPeriod: form.workHoursPeriod || undefined,
          workHoursConditions: form.workHoursConditions || undefined,
          workHoursSource: form.workHoursSource || undefined,
          workHoursSourceDate: form.workHoursSourceDate || undefined,
          faq: form.faq
            ? [{ question: "FAQ", answer: form.faq }]
            : [],
          reapplicationNotes: form.reapplicationNotes || undefined,
          studentAdvice: form.studentAdvice || undefined,
          counselorNotes: form.counselorNotes || undefined,
          nextReviewAt: form.nextReviewAt || undefined,
          reason,
        }).then((result) => {
          setBusy(false);
          setMessage(
            result.ok
              ? "Draft saved. Counselor notes stay private. Publish updates JRN-02 only after sources and a review date."
              : result.message,
          );
          if (result.ok && result.data?.id && !guidanceId) {
            router.push(`/admin/visa/${result.data.id}`);
          } else if (result.ok) {
            router.refresh();
          }
        });
      }}
    >
      <h2 className="text-lg font-semibold text-text">Destination guidance</h2>
      <p className="text-sm text-text-muted">
        Editorial content per country. Do not invent official fees or processing
        times. Unknown stays Unknown. Counselor notes are never official requirements.
      </p>
      <TextField
        id="guide-country"
        label="Destination country"
        required
        value={form.country}
        onChange={(event) => update("country", event.target.value.toUpperCase())}
      />
      <SelectField
        id="guide-level"
        label="Study level"
        required
        value={form.studyLevel}
        onChange={(event) => update("studyLevel", event.target.value)}
        options={GUIDANCE_LEVELS.map((value) => ({ value, label: value }))}
      />
      <SelectField
        id="guide-category"
        label="Visa category"
        required
        value={form.visaCategory}
        onChange={(event) => update("visaCategory", event.target.value)}
        options={VISA_CATEGORIES.map((value) => ({
          value,
          label: VISA_CATEGORY_LABELS[value],
        }))}
      />
      <TextField
        id="guide-nationality"
        label="Nationality applicability"
        optional
        value={form.nationalityApplicability}
        onChange={(event) => update("nationalityApplicability", event.target.value)}
        hint="ISO country codes, comma-separated. Leave blank for all nationalities."
      />
      <TextField
        id="guide-url"
        label="Official URL"
        optional
        type="url"
        value={form.officialUrl}
        onChange={(event) => update("officialUrl", event.target.value)}
      />
      <TextField
        id="guide-authority"
        label="Official authority"
        optional
        value={form.officialAuthority}
        onChange={(event) => update("officialAuthority", event.target.value)}
      />
      <TextField
        id="guide-source-date"
        label="Source date"
        optional
        type="date"
        value={form.sourceDate}
        onChange={(event) => update("sourceDate", event.target.value)}
      />
      <TextField
        id="guide-app-fee"
        label="Application fee amount"
        optional
        value={form.applicationFeeAmount}
        onChange={(event) => update("applicationFeeAmount", event.target.value)}
      />
      <TextField
        id="guide-app-currency"
        label="Application fee currency"
        optional
        value={form.applicationFeeCurrency}
        onChange={(event) => update("applicationFeeCurrency", event.target.value.toUpperCase())}
      />
      <TextField
        id="guide-visa-fee"
        label="Visa fee amount"
        optional
        value={form.visaFeeAmount}
        onChange={(event) => update("visaFeeAmount", event.target.value)}
        hint="Recorded separately from the application fee. Do not double-count."
      />
      <TextField
        id="guide-visa-currency"
        label="Visa fee currency"
        optional
        value={form.visaFeeCurrency}
        onChange={(event) => update("visaFeeCurrency", event.target.value.toUpperCase())}
      />
      <TextField
        id="guide-payment"
        label="Payment notes"
        optional
        value={form.paymentNotes}
        onChange={(event) => update("paymentNotes", event.target.value)}
      />
      <TextField
        id="guide-proc-min"
        label="Processing range minimum"
        optional
        value={form.processingMin}
        onChange={(event) => update("processingMin", event.target.value)}
      />
      <TextField
        id="guide-proc-max"
        label="Processing range maximum"
        optional
        value={form.processingMax}
        onChange={(event) => update("processingMax", event.target.value)}
      />
      <SelectField
        id="guide-proc-unit"
        label="Processing unit"
        optional
        value={form.processingUnit}
        onChange={(event) => update("processingUnit", event.target.value)}
        options={[
          { value: "", label: "Not provided" },
          { value: "days", label: "Days" },
          { value: "weeks", label: "Weeks" },
        ]}
      />
      <TextField
        id="guide-docs"
        label="Documents"
        optional
        value={form.documents}
        onChange={(event) => update("documents", event.target.value)}
        hint="Keys: passport, offer_letter, financial_proof, photos, visa_form, medical, insurance, other."
      />
      <TextField
        id="guide-rules"
        label="Country rules"
        optional
        value={form.countryRules}
        onChange={(event) => update("countryRules", event.target.value)}
      />
      <TextField
        id="guide-work-value"
        label="Work hours value"
        optional
        value={form.workHoursValue}
        onChange={(event) => update("workHoursValue", event.target.value)}
        hint="No default hour count. Leave blank when unknown."
      />
      <TextField
        id="guide-work-period"
        label="Work hours period"
        optional
        value={form.workHoursPeriod}
        onChange={(event) => update("workHoursPeriod", event.target.value)}
      />
      <TextField
        id="guide-work-conditions"
        label="Work conditions"
        optional
        value={form.workHoursConditions}
        onChange={(event) => update("workHoursConditions", event.target.value)}
      />
      <TextField
        id="guide-work-source"
        label="Work-hours source"
        optional
        value={form.workHoursSource}
        onChange={(event) => update("workHoursSource", event.target.value)}
      />
      <TextField
        id="guide-work-date"
        label="Work-hours source date"
        optional
        type="date"
        value={form.workHoursSourceDate}
        onChange={(event) => update("workHoursSourceDate", event.target.value)}
      />
      <TextField
        id="guide-faq"
        label="FAQ / reapplication notes"
        optional
        value={form.faq}
        onChange={(event) => update("faq", event.target.value)}
      />
      <TextField
        id="guide-reapp"
        label="Reapplication"
        optional
        value={form.reapplicationNotes}
        onChange={(event) => update("reapplicationNotes", event.target.value)}
      />
      <TextField
        id="guide-advice"
        label="Student-facing advice"
        optional
        value={form.studentAdvice}
        onChange={(event) => update("studentAdvice", event.target.value)}
      />
      <TextField
        id="guide-counselor"
        label="Counselor notes (private)"
        optional
        value={form.counselorNotes}
        onChange={(event) => update("counselorNotes", event.target.value)}
        hint="Never shown as official requirements on JRN-02."
      />
      <TextField
        id="guide-review"
        label="Next review date"
        optional
        type="date"
        value={form.nextReviewAt}
        onChange={(event) => update("nextReviewAt", event.target.value)}
      />
      <TextField
        id="guide-reason"
        label="Reason"
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button type="submit" loading={busy}>
        Save guidance draft
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
