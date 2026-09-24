import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { ProgramEditor } from "@/app/(dashboard)/admin/_components/catalog/ProgramEditor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New program",
};

interface PageProps {
  searchParams: Promise<{ universityId?: string }>;
}

export default async function AdminNewProgramPage({ searchParams }: PageProps) {
  const { universityId = "" } = await searchParams;
  return (
    <AdminChrome
      title="New program"
      description="Save a draft. Annual and full-program fees stay separate. Application URLs are gated and never appear on public catalog payloads."
    >
      <ProgramEditor
        initial={{
          universityId,
          name: "",
          level: "undergraduate",
          fieldId: "20000000-0000-4000-8000-000000000001",
          durationValue: "1",
          durationUnit: "years",
          studyModes: "on_campus",
          generalUrl: "",
          internationalRatio: "",
        }}
      />
    </AdminChrome>
  );
}
