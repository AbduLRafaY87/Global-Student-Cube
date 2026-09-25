import { studentVisibleAdvisory, type AdvisoryState } from "../counseling/advisory";
import { stripStaffOnlyFields } from "./safety";

export function canDeliverAdvisory(status: AdvisoryState): boolean {
  return status === "approved" || status === "delivered";
}

export function studentFacingAdvisory(input: {
  status: AdvisoryState;
  shareableBody: Record<string, unknown>;
}): { visible: boolean; body: Record<string, unknown> | null } {
  if (!studentVisibleAdvisory(input.status)) {
    return { visible: false, body: null };
  }
  return { visible: true, body: stripStaffOnlyFields(input.shareableBody) };
}

export function advisoryDeliveryNotice(input: {
  status: AdvisoryState;
  whatsappOptIn: boolean;
  reportPath: string;
  audience: "student" | "parent";
}): { emailSubject: string; emailText: string; whatsappText: string | null } | null {
  if (!canDeliverAdvisory(input.status)) {
    return null;
  }
  const emailSubject =
    input.audience === "parent"
      ? "Your child’s counseling report is now available."
      : "Your Final Advisory Report is ready.";
  const emailText = `${emailSubject} Open the authenticated link: ${input.reportPath}`;
  return {
    emailSubject,
    emailText,
    whatsappText: input.whatsappOptIn ? emailText : null,
  };
}

export function noticeContainsSensitivePayload(text: string): boolean {
  return /transcript|private notes|coaching|income|savings|financial/i.test(text);
}
