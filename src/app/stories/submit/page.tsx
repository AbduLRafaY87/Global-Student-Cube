import { StorySubmitForm } from "@/components/news/StorySubmitForm";
import { PublicChrome } from "@/components/public/PublicChrome";
import { resolveRequestContext } from "@/server/context";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Share your journey" };

export default async function StorySubmitPage() {
  try {
    await resolveRequestContext();
  } catch {
    redirect("/register");
  }

  return (
    <PublicChrome>
      <h1 className="text-2xl font-semibold text-text">Share your journey</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">
        Publication, name, image and spotlight consents are independent. Admin approval
        cannot publish without your publication consent. Private milestones never notify
        a mentor.
      </p>
      <div className="mt-6 max-w-2xl">
        <StorySubmitForm />
      </div>
      <Link className="mt-6 inline-flex text-primary underline-offset-2 hover:underline" href="/stories">
        Back to stories
      </Link>
    </PublicChrome>
  );
}
