export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RULES = [
  {
    id: "length",
    label: "12–128 characters",
  },
  {
    id: "upper",
    label: "An uppercase letter",
  },
  {
    id: "lower",
    label: "A lowercase letter",
  },
  {
    id: "number",
    label: "A number",
  },
  {
    id: "symbol",
    label: "A symbol",
  },
] as const;

export interface PasswordRuleState {
  id: (typeof PASSWORD_RULES)[number]["id"];
  label: string;
  met: boolean;
}

const HAS_UPPER = /[A-Z]/;
const HAS_LOWER = /[a-z]/;
const HAS_NUMBER = /\d/;
const HAS_SYMBOL = /[^A-Za-z0-9\s]/;

export function passwordRuleStates(password: string): PasswordRuleState[] {
  return [
    {
      id: "length",
      label: "12–128 characters",
      met:
        password.length >= PASSWORD_MIN_LENGTH &&
        password.length <= PASSWORD_MAX_LENGTH,
    },
    {
      id: "upper",
      label: "An uppercase letter",
      met: HAS_UPPER.test(password),
    },
    {
      id: "lower",
      label: "A lowercase letter",
      met: HAS_LOWER.test(password),
    },
    {
      id: "number",
      label: "A number",
      met: HAS_NUMBER.test(password),
    },
    {
      id: "symbol",
      label: "A symbol",
      met: HAS_SYMBOL.test(password),
    },
  ];
}

export function isPasswordPolicyMet(password: string): boolean {
  return passwordRuleStates(password).every((rule) => rule.met);
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Use at least 12 characters.";
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return "Use at most 128 characters.";
  }

  if (!isPasswordPolicyMet(password)) {
    return "Use upper and lower case letters, a number and a symbol.";
  }

  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  if (password !== confirmation) {
    return "Those passwords do not match.";
  }

  return null;
}
