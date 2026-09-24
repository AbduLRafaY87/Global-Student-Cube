import { NextResponse } from "next/server";
import { CommandError } from "@/server/errors";
import { errorEnvelope, successEnvelope } from "@/server/http/envelope";
import { etagForVersion } from "@/server/http/headers";

export function commandSuccess<T>(
  data: T,
  requestId: string,
  options?: { status?: number; version?: number },
): NextResponse {
  const response = NextResponse.json(successEnvelope(data, requestId), {
    status: options?.status ?? 200,
  });
  if (options?.version !== undefined) {
    response.headers.set("ETag", etagForVersion(options.version));
  }
  return response;
}

export function commandFailure(
  error: unknown,
  requestId: string,
): NextResponse {
  const commandError =
    error instanceof CommandError
      ? error
      : new CommandError("INTERNAL_ERROR", "Something went wrong. Try again.");
  return NextResponse.json(errorEnvelope(commandError, requestId), {
    status: commandError.status,
  });
}
