import { reportImportRows, type CatalogImportRow } from "@/domain/catalog/ingestion";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireAdminContext, requiredReason } from "@/server/modules/admin/http";
import { importCatalogRowsCommand } from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = ["kind", "rows", "csv", "dryRun", "reason"] as const;

interface Body {
  kind?: unknown;
  rows?: unknown;
  csv?: unknown;
  dryRun?: unknown;
  reason?: unknown;
}

function parseCsv(csv: string): CatalogImportRow[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    return [];
  }
  const headers = lines[0].split(",").map((part) => part.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((part) => part.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return row;
  });
}

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Body;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    const kind = body.kind === "csv" ? "csv" : "json";
    const rows = Array.isArray(body.rows)
      ? (body.rows as CatalogImportRow[])
      : typeof body.csv === "string"
        ? parseCsv(body.csv)
        : [];
    if (rows.length === 0) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const preview = reportImportRows(rows);
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await importCatalogRowsCommand(context, {
      kind,
      rows,
      dryRun: body.dryRun !== false,
      reason: requiredReason(body.reason),
    });
    return commandSuccess({ ...payload, preview }, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
