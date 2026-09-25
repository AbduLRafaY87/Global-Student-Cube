import { RecommendationForm } from "@/components/forms/RecommendationForm";
import { enforceParkedRoute } from "@/server/legacy/parked";
import { createClient } from "@/lib/supabase/server";
import {
  RECOMMENDATION_STATUSES,
  type Recommendation,
  type RecommendationStatus,
} from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recommendations",
};

function parseRecommendationStatus(value: unknown): RecommendationStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const status of RECOMMENDATION_STATUSES) {
    if (status === value) {
      return status;
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

function toRecommendation(row: {
  id: unknown;
  student_id: unknown;
  recommender_name: unknown;
  recommender_email: unknown;
  recommender_title: unknown;
  relationship: unknown;
  status: unknown;
  deadline: unknown;
  created_at: unknown;
}): Recommendation | null {
  const status = parseRecommendationStatus(row.status);

  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    typeof row.recommender_name !== "string" ||
    typeof row.recommender_email !== "string" ||
    typeof row.recommender_title !== "string" ||
    typeof row.relationship !== "string" ||
    !status
  ) {
    return null;
  }

  return {
    id: row.id,
    student_id: row.student_id,
    recommender_name: row.recommender_name,
    recommender_email: row.recommender_email,
    recommender_title: row.recommender_title,
    relationship: row.relationship,
    status,
    deadline: toDateOnly(row.deadline),
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

function statusBadgeClass(status: RecommendationStatus): string {
  if (status === "submitted") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  }

  if (status === "accepted") {
    return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300";
  }

  return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
}

function labelStatus(status: RecommendationStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function RecommendationsPage() {
  enforceParkedRoute();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const recommendations: Recommendation[] = [];

  if (user) {
    const { data } = await supabase
      .from("recommendations")
      .select(
        "id, student_id, recommender_name, recommender_email, recommender_title, relationship, status, deadline, created_at",
      )
      .eq("student_id", user.id)
      .order("deadline", { ascending: true });

    if (data) {
      for (const row of data) {
        const recommendation = toRecommendation(row);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Recommendation letters
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Request letters, watch status, and keep recommender deadlines in view.
        </p>
      </header>

      <RecommendationForm />

      {recommendations.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No recommendation requests yet. Add a recommender above.
        </p>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">
                Recommenders, letter status, and deadlines
              </caption>
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Recommender
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Deadline
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recommendations.map((recommendation) => {
                  const isOverdue =
                    recommendation.status !== "submitted" &&
                    recommendation.deadline !== "" &&
                    recommendation.deadline < today;

                  return (
                    <tr key={recommendation.id}>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-zinc-950 dark:text-zinc-50">
                          {recommendation.recommender_name}
                        </p>
                        <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
                          {recommendation.recommender_title}
                        </p>
                        <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
                          {recommendation.recommender_email}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {recommendation.relationship}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium tracking-wide uppercase ${statusBadgeClass(recommendation.status)}`}
                        >
                          {labelStatus(recommendation.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p
                          className={
                            isOverdue
                              ? "font-medium text-red-600 dark:text-red-400"
                              : "text-zinc-700 dark:text-zinc-300"
                          }
                        >
                          {recommendation.deadline || "—"}
                          {isOverdue ? " · Overdue" : null}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
