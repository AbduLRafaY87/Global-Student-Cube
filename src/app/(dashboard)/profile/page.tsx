import { StudentProfileForm } from "@/components/forms/StudentProfileForm";
import { createClient } from "@/lib/supabase/server";
import type { StudentProfile } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student profile",
};

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

function toTestScores(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const scores: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    scores[key] = entry;
  }

  return scores;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Pick<
    StudentProfile,
    "target_major" | "target_country" | "graduation_year" | "gpa" | "test_scores"
  > | null = null;

  if (user) {
    const { data } = await supabase
      .from("student_profiles")
      .select("target_major, target_country, graduation_year, gpa, test_scores")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const graduationYear = toNumber(data.graduation_year);
      const gpa = toNumber(data.gpa);

      profile = {
        target_major:
          typeof data.target_major === "string" ? data.target_major : "",
        target_country:
          typeof data.target_country === "string" ? data.target_country : "",
        graduation_year: graduationYear ?? 0,
        gpa: gpa ?? 0,
        test_scores: toTestScores(data.test_scores),
      };
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-md">
        <StudentProfileForm profile={profile} />
      </div>
    </div>
  );
}
