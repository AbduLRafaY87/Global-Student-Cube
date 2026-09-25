"use client";

import { Button } from "@/components/ui/Button";
import { useState } from "react";

interface ReferralShareProps {
  url: string;
}

export function ReferralShare({ url }: ReferralShareProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    } catch {
      setMessage("Copy the referral URL from the field.");
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={() => void copy()}>
        Copy referral link
      </Button>
      <div className="flex flex-col gap-2 text-sm">
        <a className="h-12 inline-flex items-center text-primary underline-offset-2 hover:underline" href={`https://wa.me/?text=${encodeURIComponent(url)}`}>
          WhatsApp
        </a>
        <a className="h-12 inline-flex items-center text-primary underline-offset-2 hover:underline" href={`mailto:?subject=Join%20Global%20Student%20Cube&body=${encodeURIComponent(url)}`}>
          Email
        </a>
        <a className="h-12 inline-flex items-center text-primary underline-offset-2 hover:underline" href={`sms:?body=${encodeURIComponent(url)}`}>
          SMS
        </a>
      </div>
      {message ? <p className="text-sm text-text">{message}</p> : null}
    </div>
  );
}
