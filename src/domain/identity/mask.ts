export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 4) {
    return "your phone";
  }
  return `+***${digits.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");

  if (!local || !domain) {
    return "your email";
  }

  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
