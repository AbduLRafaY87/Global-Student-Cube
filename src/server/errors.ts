export const ERROR_STATUS = {
  INVALID_REQUEST: 400,
  AUTH_REQUIRED: 401,
  MFA_REQUIRED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA: 415,
  VALIDATION_FAILED: 422,
  PRECONDITION_REQUIRED: 428,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  DEPENDENCY_UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export interface ErrorField {
  path: string;
  code: string;
}

export class CommandError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly fields: ErrorField[];
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      fields?: ErrorField[];
      details?: Record<string, unknown>;
      retryable?: boolean;
    },
  ) {
    super(message);
    this.name = "CommandError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.retryable = options?.retryable ?? code === "DEPENDENCY_UNAVAILABLE";
    this.fields = options?.fields ?? [];
    this.details = options?.details;
  }
}

const KNOWN_CODES = new Set<string>(Object.keys(ERROR_STATUS));

export function isErrorCode(value: string): value is ErrorCode {
  return KNOWN_CODES.has(value);
}

export function commandErrorFromCode(
  code: string,
  fallbackMessage: string,
): CommandError {
  if (isErrorCode(code)) {
    return new CommandError(code, messageForCode(code));
  }
  return new CommandError("INTERNAL_ERROR", fallbackMessage);
}

function postgresCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const first = error.message.split(":")[0]?.trim() ?? "";
    if (isErrorCode(first)) {
      return first;
    }
    if (isErrorCode(error.message)) {
      return error.message;
    }
  }
  return null;
}

export function isConnectFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const record = error as { code?: string; message?: string };
  const code = record.code ?? "";
  const message = (record.message ?? "").toLowerCase();
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ECONNRESET" ||
    message.includes("timeout expired") ||
    message.includes("connection terminated") ||
    message.includes("connect etimedout")
  );
}

export function mapExecutorError(error: unknown): CommandError {
  if (error instanceof CommandError) {
    return error;
  }
  if (isConnectFailure(error)) {
    return new CommandError(
      "INTERNAL_ERROR",
      "The command database is unavailable.",
    );
  }
  const code = postgresCode(error);
  if (code) {
    return commandErrorFromCode(code, "Something went wrong. Try again.");
  }
  return new CommandError("INTERNAL_ERROR", "Something went wrong. Try again.");
}

export function messageForCode(code: ErrorCode): string {
  switch (code) {
    case "INVALID_REQUEST":
      return "The request is not valid.";
    case "AUTH_REQUIRED":
      return "Sign in to continue.";
    case "MFA_REQUIRED":
      return "Confirm your authenticator to continue.";
    case "FORBIDDEN":
      return "You cannot perform this action.";
    case "NOT_FOUND":
      return "That record was not found.";
    case "VERSION_CONFLICT":
      return "This record changed. Refresh and try again.";
    case "IDEMPOTENCY_CONFLICT":
      return "This request does not match the original.";
    case "PAYLOAD_TOO_LARGE":
      return "The request is too large.";
    case "UNSUPPORTED_MEDIA":
      return "Unsupported content type.";
    case "VALIDATION_FAILED":
      return "Check the highlighted fields.";
    case "PRECONDITION_REQUIRED":
      return "This change needs a current version.";
    case "RATE_LIMITED":
      return "Too many attempts. Try again shortly.";
    case "DEPENDENCY_UNAVAILABLE":
      return "A required service is unavailable.";
    case "INTERNAL_ERROR":
      return "Something went wrong. Try again.";
  }
}
