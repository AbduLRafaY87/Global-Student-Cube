"use client";

import { postAdmin } from "@/app/(dashboard)/admin/_components/admin-api";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PrivacyActions() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(kind: "export" | "delete") {
    setBusy(true);
    const result = await postAdmin("/api/v1/me/data-requests", {
      kind,
      reason: kind === "export" ? "Account holder export" : "Account holder deletion",
      confirm: kind === "delete" ? true : undefined,
    });
    setBusy(false);
    if (result.ok && kind === "export" && result.data) {
      const pkg = (result.data as { package?: unknown }).package;
      if (pkg) {
        const blob = new Blob([JSON.stringify(pkg, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "gsc-data-export.json";
        link.click();
        URL.revokeObjectURL(url);
      }
    }
    setMessage(
      result.ok
        ? kind === "export"
          ? "Export is ready for 24 hours. Other people’s private notes are excluded."
          : "Deletion started. Access is suspended. Processing takes up to 30 days unless a lawful hold applies."
        : result.message,
    );
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        loading={busy}
        onClick={() => void run("export")}
      >
        Request my data export
      </Button>
      <label className="flex items-start gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={confirmDelete}
          onChange={(event) => setConfirmDelete(event.target.checked)}
        />
        I understand deletion suspends access immediately and takes up to 30 days.
        A documented legal hold can delay erasure.
      </label>
      <Button
        type="button"
        variant="destructive"
        loading={busy}
        disabled={!confirmDelete}
        onClick={() => void run("delete")}
      >
        Request account deletion
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
