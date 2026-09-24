import { ChangeForm } from "@/app/(dashboard)/cases/[caseId]/change-counselor/ChangeForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Change counselor" };

interface PageProps {
  params: Promise<{ caseId: string }>;
}

export default async function ChangeCounselorPage({ params }: PageProps) {
  const { caseId } = await params;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Counselor change</h1>
        <p className="mt-2 text-sm text-text-muted">
          Submitting a request does not give the next counselor historical
          private notes. An active meeting cannot be reassigned.
        </p>
      </header>
      <ChangeForm caseId={caseId} />
      <Link className="text-sm text-primary underline-offset-2 hover:underline" href="/home">
        Keep current counselor
      </Link>
      <Link className="text-sm text-primary underline-offset-2 hover:underline" href="/help">
        Protected safety concern
      </Link>
    </div>
  );
}
