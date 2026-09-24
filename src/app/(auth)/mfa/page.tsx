"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Copy, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface FactorSummary {
  id: string;
  status: string;
}

interface Envelope<T> {
  data?: T;
  error?: { message?: string };
}

export default function MfaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"enroll" | "challenge" | "recovery" | "codes">(
    "enroll",
  );
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void bootstrap();
    // First paint only: status decides enroll vs challenge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function readJson<T>(response: Response): Promise<Envelope<T>> {
    return (await response.json()) as Envelope<T>;
  }

  async function bootstrap() {
    const response = await fetch("/api/v1/auth/mfa/status");
    const payload = await readJson<{
      currentLevel?: string;
      factors?: FactorSummary[];
    }>(response);
    const verified = payload.data?.factors?.find((factor) => factor.status === "verified");
    if (payload.data?.currentLevel === "aal2") {
      router.replace("/profile");
      return;
    }
    if (verified) {
      setFactorId(verified.id);
      setMode("challenge");
      await startChallenge(verified.id);
      return;
    }
    await startEnroll();
  }

  async function startEnroll() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/mfa/enroll", { method: "POST" });
      const payload = await readJson<{
        factorId: string;
        qrCode: string;
        secret: string;
      }>(response);
      if (!response.ok || !payload.data) {
        setError(payload.error?.message ?? "Unable to start authenticator setup.");
        return;
      }
      setFactorId(payload.data.factorId);
      setQrCode(payload.data.qrCode);
      setSecret(payload.data.secret);
      setMode("enroll");
      await startChallenge(payload.data.factorId);
    } catch {
      setError("You’re offline. Reconnect to continue.");
    } finally {
      setBusy(false);
    }
  }

  async function startChallenge(id: string) {
    const response = await fetch("/api/v1/auth/mfa/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factorId: id }),
    });
    const payload = await readJson<{ challengeId: string }>(response);
    if (payload.data?.challengeId) {
      setChallengeId(payload.data.challengeId);
    }
  }

  async function verifyTotp() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorId,
          challengeId,
          code,
          purpose: mode === "enroll" ? "enroll" : "challenge",
        }),
      });
      const payload = await readJson<{ recoveryCodes?: string[] }>(response);
      if (!response.ok) {
        setError(payload.error?.message ?? "That authenticator code is not valid.");
        return;
      }
      if (payload.data?.recoveryCodes && payload.data.recoveryCodes.length > 0) {
        setRecoveryCodes(payload.data.recoveryCodes);
        setMode("codes");
        return;
      }
      router.push("/profile");
      router.refresh();
    } catch {
      setError("You’re offline. Reconnect to continue.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyRecovery() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryCode }),
      });
      const payload = await readJson<{ reenroll?: boolean }>(response);
      if (!response.ok) {
        setError(payload.error?.message ?? "That recovery code is not valid.");
        return;
      }
      setRecoveryCode("");
      await startEnroll();
    } catch {
      setError("You’re offline. Reconnect to continue.");
    } finally {
      setBusy(false);
    }
  }

  async function copySecret() {
    if (!secret) {
      return;
    }
    await navigator.clipboard.writeText(secret);
  }

  return (
    <section className="mx-auto w-full max-w-[480px] rounded-[var(--radius-card)] border border-border bg-surface p-6">
      <ShieldCheck className="size-8 text-primary" aria-hidden />
      <h1 className="mt-3 text-2xl font-semibold text-text">
        Authenticator
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Staff and counselor accounts need an authenticator before privileged
        screens. Students are not required to enrol.
      </p>

      {mode === "enroll" ? (
        <div className="mt-6 space-y-4">
          {qrCode ? (
            // Supabase returns a data-URL SVG; next/image is not used for that.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrCode}
              alt="Authenticator QR code"
              width={192}
              height={192}
              className="mx-auto size-48 min-[390px]:size-56"
            />
          ) : null}
          <div className="flex items-end gap-2">
            <TextField
              id="setup-key"
              label="Setup key"
              value={secret}
              readOnly
            />
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={() => void copySecret()}
              icon={<Copy className="size-5" aria-hidden />}
            >
              Copy setup key
            </Button>
          </div>
          <TextField
            id="totp"
            label="Authenticator code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button loading={busy} onClick={() => void verifyTotp()}>
            Verify authenticator
          </Button>
        </div>
      ) : null}

      {mode === "challenge" ? (
        <div className="mt-6 space-y-4">
          <TextField
            id="totp-challenge"
            label="Authenticator code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button loading={busy} onClick={() => void verifyTotp()}>
            Verify authenticator
          </Button>
          <Button variant="ghost" onClick={() => setMode("recovery")}>
            Use recovery code
          </Button>
        </div>
      ) : null}

      {mode === "recovery" ? (
        <div className="mt-6 space-y-4">
          <TextField
            id="recovery-code"
            label="Recovery code"
            value={recoveryCode}
            onChange={(event) => setRecoveryCode(event.target.value)}
          />
          <Button loading={busy} onClick={() => void verifyRecovery()}>
            Use recovery code
          </Button>
          <Button variant="ghost" onClick={() => setMode("challenge")}>
            Use authenticator
          </Button>
        </div>
      ) : null}

      {mode === "codes" ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-text">
            Save these recovery codes now. They are shown once and are never
            emailed.
          </p>
          <ul className="grid gap-2 font-mono text-sm">
            {recoveryCodes.map((item) => (
              <li key={item} className="rounded-[var(--radius-control)] bg-background px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
          <Button
            onClick={() => {
              router.push("/profile");
              router.refresh();
            }}
          >
            Continue
          </Button>
        </div>
      ) : null}

      <p className="mt-6 text-sm text-text-muted">
        Need help? Contact the person who invited you. This screen does not
        email recovery codes.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-critical" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
