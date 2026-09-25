interface InviteEmailInput {
  to: string;
  acceptUrl: string;
  role: string;
}

export async function sendInvitationEmail(
  input: InviteEmailInput,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "Your Global Student Cube invitation",
      text: [
        `You were invited to a ${input.role} account.`,
        `Open this link to accept: ${input.acceptUrl}`,
        "This link expires in seven days and can be used once.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error("Invitation email was not accepted by the provider.");
  }
}

export async function sendMinimalLinkEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });
  if (!response.ok) {
    throw new Error("Notice email was not accepted by the provider.");
  }
}
