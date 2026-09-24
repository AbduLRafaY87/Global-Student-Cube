import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CommandError } from "../errors";
import {
  etagForVersion,
  parseFormVersion,
  parseIfMatchVersion,
  requireIdempotencyKey,
} from "./headers";
import { rejectUnknownKeys } from "./body";
import { errorEnvelope, successEnvelope } from "./envelope";

describe("HTTP command conventions", () => {
  it("parses If-Match vN and rejects a missing header", () => {
    assert.equal(parseIfMatchVersion('"v3"'), 3);
    assert.equal(parseIfMatchVersion("v4"), 4);
    assert.throws(
      () => parseIfMatchVersion(null),
      (error: unknown) =>
        error instanceof CommandError && error.code === "PRECONDITION_REQUIRED",
    );
  });

  it("requires Idempotency-Key on create", () => {
    assert.equal(requireIdempotencyKey("abc"), "abc");
    assert.throws(
      () => requireIdempotencyKey(null),
      (error: unknown) =>
        error instanceof CommandError && error.code === "INVALID_REQUEST",
    );
  });

  it("rejects unknown JSON keys", () => {
    assert.throws(
      () => rejectUnknownKeys({ firstName: "Ada", extra: true }, ["firstName"]),
      (error: unknown) =>
        error instanceof CommandError && error.code === "INVALID_REQUEST",
    );
  });

  it("builds the spec success and error envelopes", () => {
    const ok = successEnvelope({ id: "1" }, "req_1");
    assert.deepEqual(ok.meta, { requestId: "req_1", version: 1 });
    assert.equal(etagForVersion(2), '"v2"');

    const fail = errorEnvelope(
      new CommandError("NOT_FOUND", "That record was not found."),
      "req_2",
    );
    assert.equal(fail.error.code, "NOT_FOUND");
    assert.equal(fail.error.requestId, "req_2");
    assert.equal(fail.error.retryable, false);
  });

  it("reads a form version or returns PRECONDITION_REQUIRED", () => {
    assert.equal(parseFormVersion("2"), 2);
    assert.throws(
      () => parseFormVersion(""),
      (error: unknown) =>
        error instanceof CommandError && error.code === "PRECONDITION_REQUIRED",
    );
  });
});
