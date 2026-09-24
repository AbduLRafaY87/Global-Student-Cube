export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");

  if (!local || !domain) {
    return "your email";
  }

  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
