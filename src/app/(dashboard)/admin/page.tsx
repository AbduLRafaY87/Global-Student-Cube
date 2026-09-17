import { AdminStatsCard } from "@/components/AdminStatsCard";
import { createClient } from "@/lib/supabase/server";
import { USER_ROLES, type AdminDashboardStats, type UserRole } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
};

function parseUserRole(value: unknown): UserRole | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const role of USER_ROLES) {
    if (role === value) {
      return role;
    }
  }

  return null;
}

async function countRows(
  query: PromiseLike<{ count: number | null }>,
): Promise<number> {
  const { count } = await query;
  return count ?? 0;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  const stats: AdminDashboardStats = {
    total_users: 0,
    active_applications: 0,
    university_count: 0,
  };

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    isAdmin = parseUserRole(profile?.role) === "admin";

    if (isAdmin) {
      const [totalUsers, activeApplications, universityCount] = await Promise.all(
        [
          countRows(
            supabase
              .from("user_profiles")
              .select("id", { count: "exact", head: true }),
          ),
          countRows(
            supabase
              .from("applications")
              .select("id", { count: "exact", head: true })
              .in("status", ["draft", "submitted"]),
          ),
          countRows(
            supabase
              .from("universities")
              .select("id", { count: "exact", head: true }),
          ),
        ],
      );

      stats.total_users = totalUsers;
      stats.active_applications = activeApplications;
      stats.university_count = universityCount;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          System administration
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Aggregated platform statistics for administrators.
        </p>
      </header>

      {!isAdmin ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400" role="alert">
          You do not have access to this page.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <AdminStatsCard label="Total users" value={stats.total_users} />
          </li>
          <li>
            <AdminStatsCard
              label="Active applications"
              value={stats.active_applications}
            />
          </li>
          <li>
            <AdminStatsCard
              label="Universities"
              value={stats.university_count}
            />
          </li>
        </ul>
      )}
    </div>
  );
}
