import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { UniversityEditor } from "@/app/(dashboard)/admin/_components/catalog/UniversityEditor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New university",
};

export default function AdminNewUniversityPage() {
  return (
    <AdminChrome
      title="New university"
      description="Save a draft first. Every published field needs a source, reviewer and next-review date. There is no acceptance-rate field."
    >
      <UniversityEditor
        initial={{
          name: "",
          slug: "",
          country: "GB",
          city: "",
          type: "public",
          websiteUrl: "",
          aliases: "",
        }}
      />
    </AdminChrome>
  );
}
