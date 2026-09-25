import { PhoneVerifyForm } from "@/components/privacy/PhoneVerifyForm";
import { PublicChrome } from "@/components/public/PublicChrome";
import { PHONE_OTP_NOT_MFA } from "@/domain/privacy/otp";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verify phone" };

export default function VerifyPhonePage() {
  return (
    <PublicChrome>
      <div className="mx-auto w-full max-w-[320px] py-8 min-[600px]:max-w-sm">
        <h1 className="text-2xl font-semibold text-text">Verify your phone</h1>
        <p className="mt-2 text-sm text-text-muted">{PHONE_OTP_NOT_MFA}</p>
        <p className="mt-2 text-sm text-text-muted">
          A successful code cannot skip email verification or guardian
          requirements.
        </p>
        <div className="mt-6">
          <PhoneVerifyForm />
        </div>
        <Link
          className="mt-6 inline-flex text-sm text-primary underline-offset-2 hover:underline"
          href="/register/contact"
        >
          Change phone
        </Link>
      </div>
    </PublicChrome>
  );
}
