import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  importsNeverAutoPublish,
  isBlockedCatalogHost,
  missingImportColumns,
  parsePublicHttpUrl,
  reportImportRows,
} from "./ingestion";

describe("catalog source URLs", () => {
  it("blocks private-network and localhost destinations", () => {
    assert.equal(isBlockedCatalogHost("localhost"), true);
    assert.equal(isBlockedCatalogHost("127.0.0.1"), true);
    assert.equal(isBlockedCatalogHost("10.0.0.8"), true);
    assert.equal(isBlockedCatalogHost("192.168.1.4"), true);
    assert.equal(isBlockedCatalogHost("169.254.169.254"), true);
    assert.equal(parsePublicHttpUrl("https://example.invalid/page")?.hostname, "example.invalid");
    assert.equal(parsePublicHttpUrl("https://127.0.0.1/secret"), null);
  });
});

describe("catalog import provenance", () => {
  it("rejects unsourced rows instead of guessing", () => {
    const reports = reportImportRows([
      {
        entity_type: "university",
        field_path: "name",
        value: "Guessed University",
      },
      {
        entity_type: "university",
        field_path: "name",
        value: "SYNTHETIC - not real",
        official_url: "https://example.invalid/synthetic",
        retrieved_at: "2026-09-24T00:00:00Z",
        content_hash: "abc",
        excerpt: "permitted excerpt",
        source_type: "official_university",
        next_review_at: "2026-12-24T00:00:00Z",
      },
    ]);

    assert.equal(reports[0]?.accepted, false);
    assert.ok(reports[0]?.reason?.includes("Missing provenance"));
    assert.equal(reports[1]?.accepted, true);
    assert.equal(importsNeverAutoPublish(), true);
    assert.deepEqual(missingImportColumns({ entity_type: "university" }), [
      "field_path",
      "value",
      "official_url",
      "retrieved_at",
      "content_hash",
      "excerpt",
      "source_type",
      "next_review_at",
    ]);
  });
});
