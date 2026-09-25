import { AlumniMentorProfileForm } from "@/components/mentorship/AlumniMentorProfileForm";
import { ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadAlumniMentorProfile } from "@/server/modules/mentorship/load";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Alumni mentor profile" };

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function AlumniMentorProfilePage() {
  const loaded = await loadAlumniMentorProfile();
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
      <header>
        <h1 className="text-2xl font-semibold text-text">Alumni or current-student mentor profile</h1>
        <p className="mt-2 text-sm text-text-muted">
          Two hours of availability alone does not grant a verified badge. Current-student status
          never masquerades as graduation.
        </p>
      </header>
      <AlumniMentorProfileForm
        initial={{
          studyStatus: asString(data.studyStatus, "graduated"),
          universityAttended: asString(data.universityAttended),
          course: asString(data.course),
          graduationYear: data.graduationYear == null ? "" : String(data.graduationYear),
          graduationIsAnticipated: data.graduationIsAnticipated === true,
          topics: asArray(data.topics),
          industries: asArray(data.industries),
          industriesOther: asString(data.industriesOther),
          currentOrganization: asString(data.currentOrganization),
          role: asString(data.role),
          employerBusinessUrl: asString(data.employerBusinessUrl),
          professionalLink: asString(data.professionalLink),
          monthlyAvailabilityHours:
            data.monthlyAvailabilityHours == null ? "2" : String(data.monthlyAvailabilityHours),
          experienceYears: data.experienceYears == null ? "0" : String(data.experienceYears),
          reflection: asString(data.reflection),
        }}
      />
    </div>
  );
}
