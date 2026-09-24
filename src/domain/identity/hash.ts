export function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  return crypto.subtle.digest("SHA-256", encoded).then((buffer) => {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  });
}
