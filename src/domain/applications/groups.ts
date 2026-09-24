import { displayDeadline, NOT_PROVIDED } from "../catalog/display";
import { deadlineTone, type SemanticTone } from "../status";
import { isPublishedApplicationSystem } from "./systems";

export type DeadlineScope = "system" | "institution" | "program";
export type FeeAppliesTo = "system" | "group" | "choice";

export interface DeadlineFact {
  id: string;
  systemId: string;
  scope: DeadlineScope;
  universityId: string | null;
  programId: string | null;
  kind: string;
  precision: string;
  date: string | null;
  month: number | null;
}

export interface FeeRuleFact {
  id: string;
  appliesTo: FeeAppliesTo;
  kind: string;
  amount: number | null;
  currency: string | null;
  includedChoices: number | null;
}

export interface DocumentRequirementFact {
  id: string;
  purpose: string;
  required: boolean;
  certifyOnce: boolean;
  universityId: string | null;
  programId: string | null;
}

export interface ApplicationChoice {
  id: string;
  universityId: string;
  universityName: string;
  programId: string | null;
  status: string;
  preferenceOrder: number | null;
  version: number;
}

export interface DeadlineViewRow {
  key: string;
  layer: DeadlineScope;
  sourceLabel: string;
  when: string;
  urgencyDate: string | null;
}

export interface FeeLine {
  kind: string;
  appliesTo: FeeAppliesTo;
  amount: number | null;
  currency: string | null;
}

export interface FeeTotalView {
  lines: FeeLine[];
  totalAmount: number | null;
  currency: string | null;
  unknown: boolean;
  label: string;
}

export interface SharedDocumentItem {
  key: string;
  purpose: string;
  required: boolean;
  sharedOnce: boolean;
  copies: number;
}

export function deadlineSourceLabel(
  systemName: string,
  scope: DeadlineScope,
  kind: string,
): string {
  const kindLabel = kind.split("_").join(" ");
  if (scope === "system") {
    return `${systemName} · ${kindLabel}`;
  }
  if (scope === "institution") {
    return `Institution · ${kindLabel}`;
  }
  return `This course · ${kindLabel}`;
}

export function groupDeadlineRows(input: {
  systemName: string;
  deadlines: readonly DeadlineFact[];
}): DeadlineViewRow[] {
  const rows: DeadlineViewRow[] = [];
  const seen = new Set<string>();
  for (const fact of input.deadlines) {
    const key = `${fact.scope}:${fact.kind}:${fact.universityId ?? ""}:${fact.programId ?? ""}:${fact.date ?? ""}:${fact.month ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push({
      key,
      layer: fact.scope,
      sourceLabel: deadlineSourceLabel(input.systemName, fact.scope, fact.kind),
      when: displayDeadline({
        precision: fact.precision,
        date: fact.date,
        month: fact.month,
      }),
      urgencyDate: fact.precision === "day" && fact.date ? fact.date : null,
    });
  }
  const order: Record<DeadlineScope, number> = {
    system: 0,
    institution: 1,
    program: 2,
  };
  return rows.sort((left, right) => {
    const layer = order[left.layer] - order[right.layer];
    if (layer !== 0) {
      return layer;
    }
    return left.sourceLabel.localeCompare(right.sourceLabel);
  });
}

export function systemDeadlineCount(rows: readonly DeadlineViewRow[]): number {
  return rows.filter((row) => row.layer === "system").length;
}

export function groupFeeTotal(input: {
  rules: readonly FeeRuleFact[];
  choiceCount: number;
}): FeeTotalView {
  const lines: FeeLine[] = [];
  let unknown = false;
  let total = 0;
  let currency: string | null = null;

  for (const rule of input.rules) {
    if (rule.appliesTo === "choice") {
      const included = rule.includedChoices ?? 0;
      const charged = Math.max(0, input.choiceCount - included);
      if (charged === 0) {
        continue;
      }
      if (rule.amount === null || !rule.currency) {
        unknown = true;
        lines.push({
          kind: rule.kind,
          appliesTo: rule.appliesTo,
          amount: null,
          currency: null,
        });
        continue;
      }
      const lineAmount = rule.amount * charged;
      lines.push({
        kind: rule.kind,
        appliesTo: rule.appliesTo,
        amount: lineAmount,
        currency: rule.currency,
      });
      if (currency && currency !== rule.currency) {
        unknown = true;
      } else {
        currency = rule.currency;
        total += lineAmount;
      }
      continue;
    }

    if (rule.amount === null || !rule.currency) {
      unknown = true;
      lines.push({
        kind: rule.kind,
        appliesTo: rule.appliesTo,
        amount: null,
        currency: null,
      });
      continue;
    }
    lines.push({
      kind: rule.kind,
      appliesTo: rule.appliesTo,
      amount: rule.amount,
      currency: rule.currency,
    });
    if (currency && currency !== rule.currency) {
      unknown = true;
    } else {
      currency = rule.currency;
      total += rule.amount;
    }
  }

  if (lines.length === 0) {
    return {
      lines,
      totalAmount: null,
      currency: null,
      unknown: true,
      label: NOT_PROVIDED,
    };
  }

  if (unknown) {
    return {
      lines,
      totalAmount: null,
      currency: null,
      unknown: true,
      label: NOT_PROVIDED,
    };
  }

  return {
    lines,
    totalAmount: total,
    currency,
    unknown: false,
    label: `${total.toFixed(2)} ${currency}`,
  };
}

export function sharedDocumentItems(
  requirements: readonly DocumentRequirementFact[],
  choiceCount: number,
): SharedDocumentItem[] {
  return requirements.map((requirement) => ({
    key: requirement.id,
    purpose: requirement.purpose.split("_").join(" "),
    required: requirement.required,
    sharedOnce: requirement.certifyOnce,
    copies: requirement.certifyOnce ? 1 : Math.max(choiceCount, 1),
  }));
}

export function publishedSystemLabel(code: string, name: string): string {
  if (!isPublishedApplicationSystem(code)) {
    return "Unmapped leftover (not a real platform)";
  }
  return name;
}

export function nextUrgentDeadlines(
  rows: readonly DeadlineViewRow[],
  nowMs: number,
  limit = 5,
): Array<DeadlineViewRow & { tone: SemanticTone; toneLabel: string }> {
  return rows
    .map((row) => {
      const tone = deadlineTone(row.urgencyDate, nowMs);
      return { ...row, tone: tone.tone, toneLabel: tone.label };
    })
    .sort((left, right) => {
      const leftDate = left.urgencyDate ?? "9999-12-31";
      const rightDate = right.urgencyDate ?? "9999-12-31";
      return leftDate.localeCompare(rightDate);
    })
    .slice(0, limit);
}
