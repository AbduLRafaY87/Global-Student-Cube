const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateLoginEmail(email: string): string | null {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return "Enter your email.";
  }

  if (!EMAIL_PATTERN.test(normalized) || normalized.includes(" ")) {
    return "Enter a valid email address.";
  }

  return null;
}
