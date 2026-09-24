import {
  groupDeadlineRows,
  groupFeeTotal,
  nextUrgentDeadlines,
  publishedSystemLabel,
  sharedDocumentItems,
  type ApplicationChoice,
  type DeadlineFact,
  type DeadlineScope,
  type DeadlineViewRow,
  type DocumentRequirementFact,
  type FeeAppliesTo,
  type FeeRuleFact,
  type FeeTotalView,
  type SharedDocumentItem,
} from "@/domain/applications/groups";
import type { SemanticTone } from "@/domain/status";
import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

export interface ApplicationGroupView {
  id: string;
  caseId: string | null;
  state: string;
  migrationSource: string | null;
  systemCode: string;
  systemName: string;
  choiceModel: string;
  documentModel: string;
  choices: ApplicationChoice[];
  deadlines: Array<DeadlineViewRow & { tone: SemanticTone; toneLabel: string }>;
  fees: FeeTotalView;
  documents: SharedDocumentItem[];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asScope(value: string): DeadlineScope {
  if (value === "institution" || value === "program") {
    return value;
  }
  return "system";
}

function asAppliesTo(value: string): FeeAppliesTo {
  if (value === "group" || value === "choice") {
    return value;
  }
  return "system";
}

function mapChoice(raw: unknown): ApplicationChoice | null {
  const row = asRecord(raw);
  const id = asString(row.id);
  const universityId = asString(row.universityId);
  if (!id || !universityId) {
    return null;
  }
  return {
    id,
    universityId,
    universityName: asString(row.universityName) || "Not provided",
    programId: asStringOrNull(row.programId),
    status: asString(row.status) || "draft",
    preferenceOrder: asNumber(row.preferenceOrder),
    version: asNumber(row.version) ?? 1,
  };
}

function mapDeadline(raw: unknown): DeadlineFact | null {
  const row = asRecord(raw);
  const id = asString(row.id);
  const systemId = asString(row.systemId);
  if (!id || !systemId) {
    return null;
  }
  return {
    id,
    systemId,
    scope: asScope(asString(row.scope)),
    universityId: asStringOrNull(row.universityId),
    programId: asStringOrNull(row.programId),
    kind: asString(row.kind) || "deadline",
    precision: asString(row.precision) || "unknown",
    date: asStringOrNull(row.date),
    month: asNumber(row.month),
  };
}

function mapFeeRule(raw: unknown): FeeRuleFact | null {
  const row = asRecord(raw);
  const id = asString(row.id);
  if (!id) {
    return null;
  }
  return {
    id,
    appliesTo: asAppliesTo(asString(row.appliesTo)),
    kind: asString(row.kind) || "fee",
    amount: asNumber(row.amount),
    currency: asStringOrNull(row.currency),
    includedChoices: asNumber(row.includedChoices),
  };
}

function mapDocument(raw: unknown): DocumentRequirementFact | null {
  const row = asRecord(raw);
  const id = asString(row.id);
  if (!id) {
    return null;
  }
  return {
    id,
    purpose: asString(row.purpose) || "other",
    required: asBoolean(row.required),
    certifyOnce: asBoolean(row.certifyOnce),
    universityId: asStringOrNull(row.universityId),
    programId: asStringOrNull(row.programId),
  };
}

export function mapApplicationWorkspace(
  payload: unknown,
  viewedAt = 0,
): ApplicationGroupView[] {
  const root = asRecord(payload);
  const groups = Array.isArray(root.groups) ? root.groups : [];
  const views: ApplicationGroupView[] = [];
  for (const raw of groups) {
    const row = asRecord(raw);
    const id = asString(row.id);
    const system = asRecord(row.system);
    const code = asString(system.code);
    const name = asString(system.name);
    if (!id || !code) {
      continue;
    }
    const choices = (Array.isArray(row.choices) ? row.choices : [])
      .map(mapChoice)
      .filter((item): item is ApplicationChoice => item !== null);
    const deadlines = (Array.isArray(row.deadlines) ? row.deadlines : [])
      .map(mapDeadline)
      .filter((item): item is DeadlineFact => item !== null);
    const feeRules = (Array.isArray(row.feeRules) ? row.feeRules : [])
      .map(mapFeeRule)
      .filter((item): item is FeeRuleFact => item !== null);
    const documents = (Array.isArray(row.documentRequirements) ? row.documentRequirements : [])
      .map(mapDocument)
      .filter((item): item is DocumentRequirementFact => item !== null);
    const deadlineRows = groupDeadlineRows({
      systemName: publishedSystemLabel(code, name),
      deadlines,
    });
    views.push({
      id,
      caseId: asStringOrNull(row.caseId),
      state: asString(row.state) || "draft",
      migrationSource: asStringOrNull(row.migrationSource),
      systemCode: code,
      systemName: publishedSystemLabel(code, name),
      choiceModel: asString(system.choiceModel),
      documentModel: asString(system.documentModel),
      choices,
      deadlines: nextUrgentDeadlines(deadlineRows, viewedAt, deadlineRows.length),
      fees: groupFeeTotal({ rules: feeRules, choiceCount: choices.length }),
      documents: sharedDocumentItems(documents, choices.length),
    });
  }
  return views;
}

export async function loadApplicationWorkspace(
  context: RequestContext,
): Promise<ApplicationGroupView[]> {
  const row = await queryCommand<{ payload: unknown }>(
    context,
    `SELECT commands.application_workspace() AS payload`,
    [],
  );
  return mapApplicationWorkspace(row.payload, Date.now());
}
