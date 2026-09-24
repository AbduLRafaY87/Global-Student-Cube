"use client";

import { Button } from "@/components/ui/Button";
import {
  EXIT_WARNING,
  HANDOFF_DOES_NOT_SUBMIT,
  NO_SUBMIT_COPY,
  PROVIDER_DECIDES_CAVEAT,
} from "@/domain/scholarships/scholarships";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

interface ProviderHandoffProps {
  officialUrl: string;
  withdrawn: boolean;
}

export function ProviderHandoff({ officialUrl, withdrawn }: ProviderHandoffProps) {
  const [showExit, setShowExit] = useState(false);

  if (withdrawn || !officialUrl) {
    return (
      <p className="text-sm text-text-muted">
        Official destination is unavailable. Report information is not available yet.
      </p>
    );
  }

  if (!showExit) {
    return (
      <Button
        type="button"
        icon={<ExternalLink className="size-4" aria-hidden />}
        onClick={() => setShowExit(true)}
      >
        Visit official scholarship information
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <p className="font-medium text-text">{EXIT_WARNING}</p>
      <p className="text-sm text-text">{PROVIDER_DECIDES_CAVEAT}</p>
      <p className="text-sm text-text">{NO_SUBMIT_COPY}</p>
      <p className="text-sm text-text-muted">{HANDOFF_DOES_NOT_SUBMIT}</p>
      <a
        className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-surface"
        href={officialUrl}
        rel="noreferrer"
        target="_blank"
      >
        <ExternalLink className="size-4" aria-hidden />
        Continue to provider
      </a>
    </div>
  );
}
