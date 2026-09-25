import { deleteOffer } from "@/app/(dashboard)/offers/actions";
import { enforceParkedRoute } from "@/server/legacy/parked";
import { OfferForm } from "@/components/forms/OfferForm";
import { createClient } from "@/lib/supabase/server";
import {
  OFFER_STATUSES,
  type AdmissionOffer,
  type OfferStatus,
  type University,
} from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offers",
};

interface OfferRow extends AdmissionOffer {
  university_name: string;
  university_country: string;
  net_cost: number;
}

function parseOfferStatus(value: unknown): OfferStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const status of OFFER_STATUSES) {
    if (status === value) {
      return status;
    }
  }

  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toDateOnly(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return "";
  }

  return value.slice(0, 10);
}

function toUniversityOption(row: {
  id: unknown;
  name: unknown;
  country: unknown;
}): Pick<University, "id" | "name" | "country"> | null {
  if (typeof row.id !== "string" || typeof row.name !== "string") {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    country: typeof row.country === "string" ? row.country : "",
  };
}

function formatMoney(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function labelStatus(status: OfferStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function toOfferRow(row: {
  id: unknown;
  student_id: unknown;
  university_id: unknown;
  financial_aid_amount: unknown;
  tuition_cost: unknown;
  deposit_deadline: unknown;
  status: unknown;
  created_at: unknown;
  universities: unknown;
}): OfferRow | null {
  const status = parseOfferStatus(row.status);
  const tuitionCost = toNumber(row.tuition_cost);
  const aidAmount = toNumber(row.financial_aid_amount) ?? 0;

  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    typeof row.university_id !== "string" ||
    tuitionCost === null ||
    !status
  ) {
    return null;
  }

  let universityName = "Unknown university";
  let universityCountry = "";

  if (
    typeof row.universities === "object" &&
    row.universities !== null &&
    !Array.isArray(row.universities)
  ) {
    if ("name" in row.universities && typeof row.universities.name === "string") {
      universityName = row.universities.name;
    }
    if (
      "country" in row.universities &&
      typeof row.universities.country === "string"
    ) {
      universityCountry = row.universities.country;
    }
  }

  return {
    id: row.id,
    student_id: row.student_id,
    university_id: row.university_id,
    financial_aid_amount: aidAmount,
    tuition_cost: tuitionCost,
    deposit_deadline: toDateOnly(row.deposit_deadline),
    status,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    university_name: universityName,
    university_country: universityCountry,
    net_cost: tuitionCost - aidAmount,
  };
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  enforceParkedRoute();
  const params = await searchParams;
  const editParam = params.edit;
  const editId = Array.isArray(editParam) ? editParam[0] : editParam;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const universities: Pick<University, "id" | "name" | "country">[] = [];
  const offers: OfferRow[] = [];

  const { data: universityRows } = await supabase
    .from("universities")
    .select("id, name, country")
    .order("name", { ascending: true })
    .limit(500);

  if (universityRows) {
    for (const row of universityRows) {
      const university = toUniversityOption(row);
      if (university) {
        universities.push(university);
      }
    }
  }

  if (user) {
    const { data: offerRows } = await supabase
      .from("admission_offers")
      .select(
        "id, student_id, university_id, financial_aid_amount, tuition_cost, deposit_deadline, status, created_at, universities(name, country)",
      )
      .eq("student_id", user.id)
      .order("deposit_deadline", { ascending: true });

    if (offerRows) {
      for (const row of offerRows) {
        const offer = toOfferRow(row);
        if (offer) {
          offers.push(offer);
        }
      }
    }
  }

  const editing = offers.find((offer) => offer.id === editId);
  const comparisonOffers = offers.filter(
    (offer) => offer.status === "pending" || offer.status === "accepted",
  );
  const lowestNet = comparisonOffers.reduce<number | null>((lowest, offer) => {
    if (lowest === null || offer.net_cost < lowest) {
      return offer.net_cost;
    }

    return lowest;
  }, null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Offer comparison
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Log admission offers, then compare tuition, aid, net cost, and deposit
          deadlines for pending and accepted schools.
        </p>
      </header>

      <OfferForm universities={universities} offer={editing ?? null} />

      {comparisonOffers.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No pending or accepted offers yet. Log one above to compare finances
          side by side.
        </p>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">
              Side-by-side financial comparison of pending and accepted offers
            </caption>
            <thead className="border-b border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Metric</th>
                {comparisonOffers.map((offer) => (
                  <th
                    key={offer.id}
                    className="min-w-40 px-4 py-3 font-medium text-zinc-950 dark:text-zinc-50"
                  >
                    <p>{offer.university_name}</p>
                    <p className="mt-1 text-xs font-normal text-zinc-500">
                      {labelStatus(offer.status)}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                  Tuition
                </th>
                {comparisonOffers.map((offer) => (
                  <td
                    key={`${offer.id}-tuition`}
                    className="px-4 py-3 text-zinc-700 dark:text-zinc-300"
                  >
                    {formatMoney(offer.tuition_cost)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                  Financial aid
                </th>
                {comparisonOffers.map((offer) => (
                  <td
                    key={`${offer.id}-aid`}
                    className="px-4 py-3 text-zinc-700 dark:text-zinc-300"
                  >
                    {formatMoney(offer.financial_aid_amount)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                  Net cost
                </th>
                {comparisonOffers.map((offer) => (
                  <td
                    key={`${offer.id}-net`}
                    className={
                      lowestNet !== null && offer.net_cost === lowestNet
                        ? "px-4 py-3 font-medium text-emerald-700 dark:text-emerald-400"
                        : "px-4 py-3 text-zinc-700 dark:text-zinc-300"
                    }
                  >
                    {formatMoney(offer.net_cost)}
                    {lowestNet !== null && offer.net_cost === lowestNet
                      ? " · Lowest"
                      : ""}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                  Deposit deadline
                </th>
                {comparisonOffers.map((offer) => (
                  <td
                    key={`${offer.id}-deadline`}
                    className="px-4 py-3 text-zinc-700 dark:text-zinc-300"
                  >
                    {offer.deposit_deadline || "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                  Actions
                </th>
                {comparisonOffers.map((offer) => (
                  <td key={`${offer.id}-actions`} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/offers?edit=${offer.id}`}
                        className="text-xs font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
                      >
                        Edit
                      </Link>
                      <form action={deleteOffer}>
                        <input type="hidden" name="id" value={offer.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
