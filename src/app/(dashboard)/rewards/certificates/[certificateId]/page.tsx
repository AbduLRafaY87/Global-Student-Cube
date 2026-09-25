import { ShareCertificate } from "@/components/rewards/ShareCertificate";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadCertificates } from "@/server/modules/rewards/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Certificate" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "Not provided";
}

function asCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  const loaded = await loadCertificates(certificateId);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const cert = loaded.data.selected;
  if (!cert) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <EmptyState title="Document not found" message="This certificate is not available." />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-text">{asString(cert.kind)}</h1>
      {cert.state === "withdrawn" ? (
        <p className="text-sm text-critical">This certificate is withdrawn.</p>
      ) : null}
      <p className="text-sm text-text">{asString(cert.displayName)}</p>
      <p className="text-sm text-text-muted">
        {asString(cert.dateFrom)} to {asString(cert.dateTo)} · {asString(cert.hoursLabel)} (
        {asCount(cert.minutes)} minutes)
      </p>
      <p className="text-sm text-text-muted">
        Issue {asString(cert.issueId)} · {asString(cert.issuedOn)}
      </p>
      <a
        className="inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
        href={`/api/v1/rewards/certificates/${certificateId}/download`}
      >
        Download PDF
      </a>
      <ShareCertificate issueId={asString(cert.issueId)} />
      <Link className="text-primary underline-offset-2 hover:underline" href="/help">
        Request correction
      </Link>
    </div>
  );
}
