import { DATA_USE_POLICY_VERSION } from "@/domain/identity/consent";
import { Shield } from "lucide-react";
import Link from "next/link";

interface PrivacyPageProps {
  searchParams: Promise<{ document?: string }>;
}

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
  const params = await searchParams;
  const documentId = params.document === "data-use" || !params.document
    ? "data-use"
    : params.document;

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-8">
      <Shield className="size-8 text-primary" aria-hidden />
      <h1 className="mt-3 text-2xl font-semibold text-text">
        Privacy and data use
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Public policy document. Version {DATA_USE_POLICY_VERSION}. Effective
        19 September 2026. Controller contact: Not provided.
      </p>

      {documentId !== "data-use" ? (
        <p className="mt-4 text-sm text-text" role="status">
          That document is not published. Showing the current data-use policy.
        </p>
      ) : null}

      <section className="mt-6 space-y-4 text-sm leading-6 text-text">
        <h2 className="text-base font-semibold">Purposes</h2>
        <p>
          We use the details you enter to create a student account, verify your
          email, calculate age from your date of birth, and operate the service
          you asked for. Optional email or WhatsApp notices are stored only when
          you opt in. Marketing is not bundled into the required data-use
          acceptance.
        </p>
        <h2 className="text-base font-semibold">Recipients, subprocessors and regions</h2>
        <p>Not provided.</p>
        <h2 className="text-base font-semibold">Consent receipts</h2>
        <p>
          Creating an account writes an immutable consent receipt with this
          policy version and an evidence hash. You cannot edit that row later.
          Recording-consent withdrawal, if offered later, is separate from
          account deletion.
        </p>
        <h2 className="text-base font-semibold">Export and deletion</h2>
        <p>
          Export and deletion requests are not available on this public page.
          They require a signed-in account. A lawful hold can restrict
          processing without promising immediate deletion.
        </p>
      </section>

      <p className="mt-8 text-sm">
        <Link
          href="/register/review"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Return to registration
        </Link>
        {" · "}
        <Link
          href="/"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Guest home
        </Link>
      </p>
    </main>
  );
}
