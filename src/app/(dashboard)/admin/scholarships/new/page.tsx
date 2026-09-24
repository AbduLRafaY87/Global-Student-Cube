import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { ScholarshipEditor } from "@/app/(dashboard)/admin/_components/catalog/ScholarshipEditor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New scholarship",
};

export default function AdminNewScholarshipPage() {
  return (
    <AdminChrome
      title="New scholarship"
      description="Minimal metadata plus an official URL. Extended details are optional. There is no in-app application form."
    >
      <ScholarshipEditor
        initial={{
          name: "",
          providerName: "",
          officialUrl: "",
          providerType: "university",
          countryCodes: "GB",
          levels: "undergraduate",
          fieldIds: "20000000-0000-4000-8000-000000000001",
          availability: "unknown",
          deadlinePrecision: "unknown",
          deadlineDate: "",
          deadlineMonth: "",
        }}
      />
    </AdminChrome>
  );
}
