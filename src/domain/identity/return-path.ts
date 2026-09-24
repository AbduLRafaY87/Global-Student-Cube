export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }

  if (value.startsWith("/api") || value.startsWith("/auth/callback")) {
    return null;
  }

  return value;
}
