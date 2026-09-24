interface Envelope<T> {
  data?: T;
  error?: { message?: string };
}

export async function saveProfileSection<T>(
  path: string,
  body: Record<string, unknown>,
  method: "PATCH" | "POST" = "PATCH",
  options?: { ifMatch?: string; idempotencyKey?: string },
): Promise<{ ok: boolean; data?: T; message: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options?.ifMatch) {
    headers["If-Match"] = options.ifMatch;
  }
  if (options?.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }
  const response = await fetch(path, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || !payload.data) {
    return {
      ok: false,
      message: payload.error?.message ?? "Changes weren’t saved. Retry before leaving.",
    };
  }
  return { ok: true, data: payload.data, message: "" };
}

export async function uploadProfileFile(input: {
  caseId: string;
  purpose: string;
  file: File;
  durationSeconds?: number;
}): Promise<{ ok: boolean; id?: string; message: string }> {
  const registered = await saveProfileSection<{ id: string; objectKey: string; bucket: string }>(
    "/api/v1/files/uploads",
    {
      caseId: input.caseId,
      purpose: input.purpose,
      sizeBytes: input.file.size,
      mime: input.file.type || "application/octet-stream",
    },
    "POST",
  );
  if (!registered.ok || !registered.data) {
    return { ok: false, message: registered.message };
  }

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(registered.data.bucket)
    .upload(registered.data.objectKey, input.file, {
      upsert: false,
      contentType: input.file.type || undefined,
    });
  if (error) {
    return { ok: false, message: error.message };
  }

  const completed = await saveProfileSection<{ id: string }>(
    `/api/v1/files/${registered.data.id}/complete`,
    {
      detectedMime: input.file.type || null,
      durationSeconds: input.durationSeconds ?? null,
    },
    "POST",
  );
  if (!completed.ok) {
    return { ok: false, message: completed.message };
  }
  return { ok: true, id: registered.data.id, message: "" };
}
