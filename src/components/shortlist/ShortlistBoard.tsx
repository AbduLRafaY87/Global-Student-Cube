"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/States";
import { MICROCOPY } from "@/domain/microcopy";
import {
  CAP_REACHED_MESSAGE,
  RECOMMENDATION_NOT_SAVED_COPY,
  SAVED_PAIR_CAP,
  SAVED_SET_LABEL,
} from "@/domain/shortlist/shortlist";
import type { ShortlistCard } from "@/server/modules/shortlist/load";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface ShortlistBoardProps {
  caseId: string;
  canWrite: boolean;
  cards: ShortlistCard[];
  recommendationCount: number;
}

export function ShortlistBoard({
  caseId,
  canWrite,
  cards,
  recommendationCount,
}: ShortlistBoardProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const compareRows = useMemo(
    () => cards.filter((card) => selected.includes(card.id)),
    [cards, selected],
  );

  function toggleSelect(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id],
    );
  }

  async function toggleFlag(card: ShortlistCard) {
    if (!canWrite) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/cases/${caseId}/shortlist/${card.id}/flag`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged: !card.reviewFlagged }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      setBusy(false);
      setMessage(response.ok ? null : (payload.error?.message ?? "Flag was not updated."));
      if (response.ok) {
        router.refresh();
      }
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  async function removeSaved() {
    if (!removeId || !canWrite) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/cases/${caseId}/shortlist/${removeId}`, {
        method: "DELETE",
      });
      setBusy(false);
      setRemoveId(null);
      if (response.ok) {
        setSelected((current) => current.filter((id) => id !== removeId));
        router.refresh();
      } else {
        setMessage("The saved combination was not removed.");
      }
    } catch {
      setBusy(false);
      setMessage("You’re offline. Reconnect to continue.");
    }
  }

  async function copySummary() {
    const lines = cards.map(
      (card) =>
        `${card.universityName} / ${card.programName}: ${card.assessmentCopy}; ${card.comparisonCost}${card.reviewFlagged ? "; flagged for counselor review" : ""}`,
    );
    const text = [`${SAVED_SET_LABEL}: ${cards.length} of ${SAVED_PAIR_CAP}.`, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Summary copied.");
    } catch {
      setMessage(text);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-text">{SAVED_SET_LABEL}</h1>
        <p className="mt-2 text-sm text-text">
          {cards.length} of {SAVED_PAIR_CAP} saved.
        </p>
        <Link
          className="mt-2 inline-flex min-h-12 items-center text-sm font-medium text-primary underline"
          href="/explore/universities?view=recommendations"
        >
          {recommendationCount} of {RECOMMENDATION_NOT_SAVED_COPY}
        </Link>
      </header>
      {cards.length >= SAVED_PAIR_CAP ? (
        <p className="text-sm text-text-muted">{CAP_REACHED_MESSAGE}</p>
      ) : null}
      {cards.length === 0 ? (
        <EmptyState title="No saved combinations" message={MICROCOPY.emptySaved} />
      ) : (
        <ul className="grid gap-3 min-[768px]:grid-cols-2 min-[1100px]:grid-cols-3">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4"
            >
              <label className="flex items-start gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={selected.includes(card.id)}
                  onChange={() => toggleSelect(card.id)}
                />
                Compare this combination
              </label>
              <p className="font-medium text-text">{card.universityName}</p>
              <p className="text-sm text-text">{card.programName}</p>
              <p className="text-sm text-text-muted">{card.assessmentCopy}</p>
              <p className="text-sm text-text">Comparison cost: {card.comparisonCost}</p>
              <label className="flex min-h-12 items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={card.reviewFlagged}
                  disabled={!canWrite || busy}
                  onChange={() => void toggleFlag(card)}
                />
                For counselor review
              </label>
              <Link
                className="text-sm text-primary underline-offset-2 hover:underline"
                href={`/cases/${caseId}/assessment/${card.programId}`}
              >
                Open self-check
              </Link>
              <Button
                type="button"
                variant="destructive"
                disabled={!canWrite}
                onClick={() => setRemoveId(card.id)}
              >
                Remove saved combination
              </Button>
            </li>
          ))}
        </ul>
      )}
      {compareRows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">Compare selected details</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-left text-sm text-text">
              <thead>
                <tr>
                  <th className="pb-2 font-medium">University</th>
                  <th className="pb-2 font-medium">Program</th>
                  <th className="pb-2 font-medium">Self-check</th>
                  <th className="pb-2 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((card) => (
                  <tr key={card.id} className="border-t border-border">
                    <td className="py-2">{card.universityName}</td>
                    <td className="py-2">{card.programName}</td>
                    <td className="py-2">{card.assessmentCopy}</td>
                    <td className="py-2">{card.comparisonCost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <div className="flex flex-col gap-3 min-[600px]:flex-row">
        <Button type="button" variant="secondary" onClick={() => void copySummary()}>
          Share summary
        </Button>
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-control-border px-4 text-sm"
          href="/counselor"
        >
          Review with counselor
        </Link>
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-control-border px-4 text-sm"
          href="/explore/universities"
        >
          Explore recommendations
        </Link>
      </div>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
      <Dialog
        open={removeId !== null}
        title="Remove saved combination"
        onClose={() => setRemoveId(null)}
      >
        <p className="text-sm text-text">
          This deletes the saved university and program pair. Its counselor-review flag is removed
          with it.
        </p>
        <div className="mt-4 flex flex-col gap-2 min-[600px]:flex-row">
          <Button type="button" variant="destructive" loading={busy} onClick={() => void removeSaved()}>
            Remove
          </Button>
          <Button type="button" variant="secondary" onClick={() => setRemoveId(null)}>
            Keep it
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
