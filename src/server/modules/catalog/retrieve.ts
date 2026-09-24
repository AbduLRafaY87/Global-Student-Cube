import { createHash } from "node:crypto";
import { parsePublicHttpUrl } from "@/domain/catalog/ingestion";

export interface RetrievedCatalogSource {
  host: string;
  path: string;
  retrievedAt: string;
  contentHash: string;
  excerpt: string;
}

export async function retrievePermittedExcerpt(
  rawUrl: string,
): Promise<RetrievedCatalogSource | null> {
  const parsed = parsePublicHttpUrl(rawUrl);
  if (!parsed) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "text/html,text/plain,application/json" },
    });
    if (response.status >= 300 && response.status < 400) {
      return null;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const text = bytes.toString("utf8").replace(/\s+/g, " ").trim();
    return {
      host: parsed.hostname.toLowerCase(),
      path: parsed.pathname || "/",
      retrievedAt: new Date().toISOString(),
      contentHash: createHash("sha256").update(bytes).digest("hex"),
      excerpt: text.slice(0, 500),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
