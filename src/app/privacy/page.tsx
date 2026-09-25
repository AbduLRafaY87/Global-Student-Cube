import { PrivacyActions } from "@/components/privacy/PrivacyActions";
import { DATA_USE_POLICY_VERSION } from "@/domain/identity/consent";
import { createClient } from "@/lib/supabase/server";
import { loadPrivacyWorkspace } from "@/server/modules/privacy/load";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const workspace = user ? await loadPrivacyWorkspace() : null;
  const consents =
    workspace?.ok && Array.isArray(workspace.data.consents.items)
      ? workspace.data.consents.items
      : [];
  const requests =
    workspace?.ok && Array.isArray(workspace.data.requests.items)
      ? workspace.data.requests.items
      : [];

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
          Export is a 24-hour private package. Deletion suspends access
          immediately and processes for 30 days. A documented lawful hold
          restricts processing without promising immediate deletion. Recording
          consent withdrawal is separate from account deletion.
        </p>
      </section>

      {user ? (
        <section className="mt-8 space-y-4">
          <h2 className="text-base font-semibold text-text">Your privacy controls</h2>
          <p className="text-sm text-text-muted">
            Data export excludes another participant’s confidential notes.
          </p>
          {consents.length > 0 ? (
            <ul className="space-y-2 text-sm text-text">
              {consents.map((item, index) => {
                const row = item as Record<string, unknown>;
                return (
                  <li key={`${String(row.purpose)}-${index}`}>
                    {String(row.purpose)} · {row.decision === true ? "accepted" : "declined"} ·{" "}
                    {String(row.policyVersion)}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">No consent receipts yet.</p>
          )}
          {requests.length > 0 ? (
            <ul className="space-y-2 text-sm text-text">
              {requests.map((item) => {
                const row = item as Record<string, unknown>;
                return (
                  <li key={String(row.id)}>
                    {String(row.kind)} · {String(row.status)}
                    {row.hold === true ? " · lawful hold" : ""}
                  </li>
                );
              })}
            </ul>
          ) : null}
          <PrivacyActions />
          <Link
            className="inline-flex text-sm text-primary underline-offset-2 hover:underline"
            href="/family-links"
          >
            Manage family access
          </Link>
        </section>
      ) : null}

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
