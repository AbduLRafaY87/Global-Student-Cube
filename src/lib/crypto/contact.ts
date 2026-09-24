import { sha256Hex } from "@/domain/identity/hash";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function keyFromSecret(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );

  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
  ]);
}

export async function encryptContactValue(
  plaintext: string,
  secret: string,
): Promise<{ cipherHex: string; hash: string }> {
  const key = await keyFromSecret(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plaintext),
    ),
  );
  const packed = new Uint8Array(iv.length + ciphertext.length);
  packed.set(iv, 0);
  packed.set(ciphertext, iv.length);

  return {
    cipherHex: bytesToHex(packed),
    hash: await sha256Hex(plaintext),
  };
}

export function contactEncryptionSecret(): string {
  const secret = process.env.GSC_CONTACT_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("Missing GSC_CONTACT_ENCRYPTION_KEY.");
  }

  return secret;
}
