const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;
const CODE_COUNT = 8;

export function generateRecoveryCodes(
  randomBytes: (size: number) => Uint8Array,
): string[] {
  const codes: string[] = [];

  let attempts = 0;
  while (codes.length < CODE_COUNT) {
    attempts += 1;
    if (attempts > CODE_COUNT * 20) {
      throw new Error("Unable to generate unique recovery codes.");
    }
    const bytes = randomBytes(CODE_LENGTH);
    let code = "";
    for (let index = 0; index < CODE_LENGTH; index += 1) {
      const byte = (bytes[index] ?? 0) + codes.length + index;
      code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
    if (!codes.includes(code)) {
      codes.push(code);
    }
  }

  return codes;
}

export function normalizeRecoveryCode(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}
