import {
  CommandError,
  type ErrorCode,
  messageForCode,
} from "../errors";

export interface SuccessEnvelope<T> {
  data: T;
  meta: {
    requestId: string;
    version: 1;
  };
}

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    retryable: boolean;
    fields: { path: string; code: string }[];
    details?: Record<string, unknown>;
  };
}

export function successEnvelope<T>(
  data: T,
  requestId: string,
): SuccessEnvelope<T> {
  return { data, meta: { requestId, version: 1 } };
}

export function errorEnvelope(
  error: CommandError,
  requestId: string,
): ErrorEnvelope {
  return {
    error: {
      code: error.code,
      message: error.message || messageForCode(error.code),
      requestId,
      retryable: error.retryable,
      fields: error.fields,
      ...(error.details ? { details: error.details } : {}),
    },
  };
}

export function newRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "")}`;
}
