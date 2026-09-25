import { ParentMentorProfileForm } from "@/components/mentorship/ParentMentorProfileForm";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadParentMentorProfile } from "@/server/modules/mentorship/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Parent mentor profile" };

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function ParentMentorProfilePage() {
  const loaded = await loadParentMentorProfile();
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const data = loaded.data;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Link className="text-sm text-primary underline-offset-2 hover:underline" href="/parent/home">
        Back
      </Link>
      <header>
        <h1 className="text-2xl font-semibold text-text">Parent mentor profile</h1>
        <p className="mt-2 text-sm text-text-muted">
          Parent mentor status cannot grant access to unrelated student cases. Public cards never
          show a child’s education or finances.
        </p>
      </header>
      <ParentMentorProfileForm
        initial={{
          educationLevel: asString(data.educationLevel, "undergraduate"),
          topics: asArray(data.topics),
          monthlyAvailabilityHours:
            data.monthlyAvailabilityHours == null ? "2" : String(data.monthlyAvailabilityHours),
          experienceYears: data.experienceYears == null ? "" : String(data.experienceYears),
          reflection: asString(data.reflection),
        }}
      />
    </div>
  );
}
