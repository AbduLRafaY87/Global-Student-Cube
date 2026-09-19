import { CounselorProfileCard } from "@/components/CounselorProfileCard";
import { createClient } from "@/lib/supabase/server";
import {
  USER_ROLES,
  type CounselorAssignment,
  type UserProfile,
  type UserRole,
} from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Counselor",
};

interface ContactRecord {
  profile: Pick<UserProfile, "first_name" | "last_name" | "phone" | "role">;
  email: string | null;
}

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

function toDateOnly(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return "";
  }

  return value.slice(0, 10);
}

function toCounselorAssignment(row: {
  id: unknown;
  student_id: unknown;
  counselor_id: unknown;
  assigned_at: unknown;
}): CounselorAssignment | null {
  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    typeof row.counselor_id !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    student_id: row.student_id,
    counselor_id: row.counselor_id,
    assigned_at: toDateOnly(row.assigned_at),
  };
}

function toContactProfile(row: {
  id: unknown;
  first_name: unknown;
  last_name: unknown;
  phone: unknown;
  role: unknown;
}): (Pick<UserProfile, "first_name" | "last_name" | "phone" | "role"> & {
  id: string;
}) | null {
  const role = parseUserRole(row.role);

  if (
    typeof row.id !== "string" ||
    typeof row.first_name !== "string" ||
    typeof row.last_name !== "string" ||
    !role
  ) {
    return null;
  }

  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: typeof row.phone === "string" ? row.phone : null,
    role,
  };
}

export default async function CounselorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isCounselor = false;
  const assignments: CounselorAssignment[] = [];
  const contacts = new Map<string, ContactRecord>();

  if (user) {
    const { data: ownProfile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    isCounselor = parseUserRole(ownProfile?.role) === "counselor";

    const assignmentQuery = supabase
      .from("counselor_assignments")
      .select("id, student_id, counselor_id, assigned_at")
      .order("assigned_at", { ascending: false });

    const { data: assignmentRows } = isCounselor
      ? await assignmentQuery.eq("counselor_id", user.id)
      : await assignmentQuery.eq("student_id", user.id).maybeSingle();

    const rows = Array.isArray(assignmentRows)
      ? assignmentRows
      : assignmentRows
        ? [assignmentRows]
        : [];

    for (const row of rows) {
      const assignment = toCounselorAssignment(row);
      if (assignment) {
        assignments.push(assignment);
      }
    }

    const contactIds = [
      ...new Set(
        assignments.map((assignment) =>
          isCounselor ? assignment.student_id : assignment.counselor_id,
        ),
      ),
    ];

    if (contactIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, phone, role")
        .in("id", contactIds);

      if (profileRows) {
        for (const row of profileRows) {
          const profile = toContactProfile(row);
          if (profile) {
            contacts.set(profile.id, {
              profile: {
                first_name: profile.first_name,
                last_name: profile.last_name,
                phone: profile.phone,
                role: profile.role,
              },
              email: null,
            });
          }
        }
      }
    }
  }

  const heading = isCounselor ? "Assigned students" : "Your counselor";
  const description = isCounselor
    ? "Review students matched to you and reach them by email."
    : "View your assigned counselor and send a message directly.";
  const emptyMessage = isCounselor
    ? "No students assigned yet."
    : "No counselor assigned yet.";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {heading}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </header>

      {assignments.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{emptyMessage}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => {
            const contactId = isCounselor
              ? assignment.student_id
              : assignment.counselor_id;
            const contact = contacts.get(contactId);

            return (
              <li key={assignment.id}>
                <CounselorProfileCard
                  kicker={isCounselor ? "Student" : "Counselor"}
                  profile={
                    contact?.profile ?? {
                      first_name: "",
                      last_name: "",
                      phone: null,
                      role: isCounselor ? "student" : "counselor",
                    }
                  }
                  email={contact?.email ?? null}
                  assignedAt={assignment.assigned_at}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
