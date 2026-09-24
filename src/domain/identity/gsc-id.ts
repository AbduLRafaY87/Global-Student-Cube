const NUMERIC_LIMIT = 999_999;

export function formatGscId(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("GSC sequence must be a positive integer.");
  }

  if (sequence <= NUMERIC_LIMIT) {
    return `GSC-${String(sequence).padStart(6, "0")}`;
  }

  const rolled = sequence - NUMERIC_LIMIT;
  const letterIndex = Math.floor((rolled - 1) / NUMERIC_LIMIT);
  const remainder = ((rolled - 1) % NUMERIC_LIMIT) + 1;

  if (letterIndex > 25) {
    throw new Error("GSC identifier namespace is exhausted.");
  }

  const letter = String.fromCharCode(65 + letterIndex);
  return `GSC-${letter}${String(remainder).padStart(6, "0")}`;
}

export function isGscId(value: string): boolean {
  return /^GSC-(?:\d{6}|[A-Z]\d{6})$/.test(value);
}
