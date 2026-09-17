"use client";

import { useActionState } from "react";
import { logOffer, updateOffer } from "@/app/(dashboard)/offers/actions";
import {
  OFFER_STATUSES,
  type AdmissionOffer,
  type University,
} from "@/types";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

interface OfferFormProps {
  universities: Pick<University, "id" | "name" | "country">[];
  offer?: AdmissionOffer | null;
}

function labelStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

export function OfferForm({ universities, offer }: OfferFormProps) {
  const isEditing = Boolean(offer);
  const [state, formAction, isPending] = useActionState(
    isEditing ? updateOffer : logOffer,
    null,
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {isEditing ? "Edit offer" : "Log an offer"}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Record tuition, aid, and the deposit deadline so you can compare pending
        and accepted offers.
      </p>

      <form className="mt-6 space-y-4" action={formAction} noValidate>
        {offer ? <input type="hidden" name="id" value={offer.id} /> : null}

        <div>
          <label
            htmlFor="university_id"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            University
          </label>
          <select
            id="university_id"
            name="university_id"
            defaultValue={offer?.university_id ?? ""}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.university_id)}
            aria-describedby={
              state?.fieldErrors?.university_id ? "university-error" : undefined
            }
            className={inputClassName}
          >
            <option value="">Select a university</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
                {university.country ? ` · ${university.country}` : ""}
              </option>
            ))}
          </select>
          {state?.fieldErrors?.university_id ? (
            <p
              id="university-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.university_id}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="tuition_cost"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Tuition cost
            </label>
            <input
              id="tuition_cost"
              name="tuition_cost"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={offer?.tuition_cost ?? ""}
              disabled={isPending}
              aria-invalid={Boolean(state?.fieldErrors?.tuition_cost)}
              aria-describedby={
                state?.fieldErrors?.tuition_cost ? "tuition-error" : undefined
              }
              className={inputClassName}
            />
            {state?.fieldErrors?.tuition_cost ? (
              <p
                id="tuition-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {state.fieldErrors.tuition_cost}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="financial_aid_amount"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Financial aid
            </label>
            <input
              id="financial_aid_amount"
              name="financial_aid_amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={offer?.financial_aid_amount ?? 0}
              disabled={isPending}
              aria-invalid={Boolean(state?.fieldErrors?.financial_aid_amount)}
              aria-describedby={
                state?.fieldErrors?.financial_aid_amount
                  ? "aid-error"
                  : undefined
              }
              className={inputClassName}
            />
            {state?.fieldErrors?.financial_aid_amount ? (
              <p
                id="aid-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {state.fieldErrors.financial_aid_amount}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label
            htmlFor="deposit_deadline"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Deposit deadline
          </label>
          <input
            id="deposit_deadline"
            name="deposit_deadline"
            type="date"
            defaultValue={
              offer ? toDateOnly(offer.deposit_deadline) : ""
            }
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.deposit_deadline)}
            aria-describedby={
              state?.fieldErrors?.deposit_deadline
                ? "deadline-error"
                : undefined
            }
            className={inputClassName}
          />
          {state?.fieldErrors?.deposit_deadline ? (
            <p
              id="deadline-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.deposit_deadline}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={offer?.status ?? "pending"}
            disabled={isPending}
            aria-invalid={Boolean(state?.fieldErrors?.status)}
            aria-describedby={
              state?.fieldErrors?.status ? "status-error" : undefined
            }
            className={inputClassName}
          >
            {OFFER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {labelStatus(status)}
              </option>
            ))}
          </select>
          {state?.fieldErrors?.status ? (
            <p
              id="status-error"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.fieldErrors.status}
            </p>
          ) : null}
        </div>

        {state?.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}

        {state?.success ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status">
            Offer saved.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "Saving..." : isEditing ? "Save offer" : "Log offer"}
        </button>
      </form>
    </section>
  );
}
