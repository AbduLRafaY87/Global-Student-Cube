import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CommandError,
  commandErrorFromCode,
  ERROR_STATUS,
  mapExecutorError,
  messageForCode,
} from "./errors";

describe("command error envelope mapping", () => {
  it("maps spec codes to the documented status numbers", () => {
    assert.equal(ERROR_STATUS.INVALID_REQUEST, 400);
    assert.equal(ERROR_STATUS.AUTH_REQUIRED, 401);
    assert.equal(ERROR_STATUS.FORBIDDEN, 403);
    assert.equal(ERROR_STATUS.NOT_FOUND, 404);
    assert.equal(ERROR_STATUS.VERSION_CONFLICT, 409);
    assert.equal(ERROR_STATUS.IDEMPOTENCY_CONFLICT, 409);
    assert.equal(ERROR_STATUS.VALIDATION_FAILED, 422);
    assert.equal(ERROR_STATUS.PRECONDITION_REQUIRED, 428);
    assert.equal(ERROR_STATUS.INTERNAL_ERROR, 500);
  });

  it("keeps a postgres VERSION_CONFLICT as 409", () => {
    const error = commandErrorFromCode("VERSION_CONFLICT", "fallback");
    assert.equal(error.status, 409);
    assert.equal(error.code, "VERSION_CONFLICT");
    assert.equal(error.message, messageForCode("VERSION_CONFLICT"));
  });

  it("maps a pooler timeout to INTERNAL_ERROR", () => {
    const mapped = mapExecutorError({
      code: "ETIMEDOUT",
      message: "timeout expired",
    });
    assert.ok(mapped instanceof CommandError);
    assert.equal(mapped.code, "INTERNAL_ERROR");
    assert.equal(mapped.status, 500);
  });
});
