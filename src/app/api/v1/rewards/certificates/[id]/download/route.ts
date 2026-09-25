import { generateRecognitionPdf } from "@/domain/rewards/pdf";
import { resolveRequestContext } from "@/server/context";
import { requireUuid } from "@/server/modules/admin/http";
import { getCertificateSql } from "@/server/modules/rewards/commands";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  requireUuid(id, "id");
  const context = await resolveRequestContext();
  const cert = await getCertificateSql(context, id);
  const kind = asString(cert.kind) === "letter" ? "letter" : "certificate";
  const pdf = generateRecognitionPdf({
    kind,
    displayName: asString(cert.displayName),
    issueId: asString(cert.issueId),
    issuedOn: asString(cert.issuedOn),
    dateFrom: asString(cert.dateFrom),
    dateTo: asString(cert.dateTo),
    minutes: asNumber(cert.minutes),
    hoursLabel: asString(cert.hoursLabel),
  });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asString(cert.issueId)}.pdf"`,
    },
  });
}
