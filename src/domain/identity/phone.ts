const COUNTRY_CODE_PATTERN = /^\+?[1-9]\d{0,3}$/;
const NATIONAL_PATTERN = /^\d{6,14}$/;

export function normalizePhonePart(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

export function formatE164(countryCode: string, national: string): string {
  const code = normalizePhonePart(countryCode).replace(/^\+/, "");
  const number = normalizePhonePart(national).replace(/^\+/, "");
  return `+${code}${number}`;
}

export function validatePhoneParts(
  countryCode: string,
  national: string,
  required: boolean,
): string | null {
  const code = normalizePhonePart(countryCode);
  const number = normalizePhonePart(national);

  if (!code && !number) {
    return required ? "Enter a phone number." : null;
  }

  if (!COUNTRY_CODE_PATTERN.test(code.startsWith("+") ? code : `+${code}`)) {
    return "Enter a valid country code.";
  }

  if (!NATIONAL_PATTERN.test(number)) {
    return "Enter a valid phone number.";
  }

  return null;
}

export function phoneHashInput(e164: string): string {
  return e164.replace(/[^\d+]/g, "");
}
