import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { ImportForm } from "@/app/(dashboard)/admin/_components/catalog/ImportForm";
import { IngestionForm } from "@/app/(dashboard)/admin/_components/catalog/IngestionForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data ingestion",
};

export default function AdminIngestionNewPage() {
  return (
    <AdminChrome
      title="Data ingestion submission"
      description="Allowlisted official URLs only. Retrieval stores a timestamp, content hash and a permitted excerpt. Extraction never publishes."
    >
      <IngestionForm />
      <ImportForm />
    </AdminChrome>
  );
}
