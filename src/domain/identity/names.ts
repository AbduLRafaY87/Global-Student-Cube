const NAME_PATTERN = /^[\p{L}][\p{L}\p{M}\s'’-]*$/u;
const MAX_NAME_LENGTH = 160;

export function validatePersonName(
  value: string,
  required: boolean,
): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return required ? "Enter this name." : null;
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return "Use at most 160 characters.";
  }

  if (!NAME_PATTERN.test(trimmed)) {
    return "Use letters, spaces, apostrophes or hyphens only.";
  }

  return null;
}

export function suggestFamilyName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return "";
  }

  return parts[parts.length - 1] ?? "";
}
