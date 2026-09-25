import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { ContentEditor } from "@/app/(dashboard)/admin/content/ContentEditor";
import { resolveRequestContext } from "@/server/context";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New content" };

export default async function NewContentPage() {
  const context = await resolveRequestContext();
  const canPublish = context.role === "admin";

  return (
    <AdminChrome
      title="New content item"
      description="Save a draft first. Counselors submit for review. Publishers expose LRN, news, tour or Gold+ destinations."
    >
      <ContentEditor
        canPublish={canPublish}
        initial={{
          kind: "course",
          title: "",
          topic: "",
          category: "",
          audience: "overall",
          summary: "",
          body: "",
          author: "Global Student Cube",
          captions: "",
          transcript: "",
          mediaUrl: "",
          libraryType: "",
          eventInformation: "",
          consentEvidence: "",
          namedConsent: false,
          universitySupplied: false,
          provenanceVerified: false,
          state: "draft",
        }}
      />
    </AdminChrome>
  );
}
