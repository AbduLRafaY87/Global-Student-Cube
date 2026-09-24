interface Envelope<T> {
  data?: T;
  error?: { message?: string };
}

export async function postAdmin<T>(
  path: string,
  body: Record<string, unknown>,
  version?: number,
): Promise<{ ok: boolean; data?: T; message: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  };
  if (version !== undefined) {
    headers["If-Match"] = `"v${version}"`;
  }

  const response = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || !payload.data) {
    return {
      ok: false,
      message: payload.error?.message ?? "Something went wrong. Try again.",
    };
  }
  return { ok: true, data: payload.data, message: "" };
}
