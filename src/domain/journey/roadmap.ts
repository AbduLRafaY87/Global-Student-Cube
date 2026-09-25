export const ROADMAP_PHASES = [
  "documents",
  "tests",
  "essays",
  "fees",
  "deadlines",
  "counselor",
] as const;
export type RoadmapPhase = (typeof ROADMAP_PHASES)[number];

export const ROADMAP_OWNERS = ["Student", "Counselor"] as const;
export type RoadmapOwner = (typeof ROADMAP_OWNERS)[number];

export interface RoadmapCriterion {
  key: string;
  kind: string;
  revision: number;
  mandatory: boolean;
}

export interface ApplicationSystemModel {
  code: string;
  name: string;
  feeModel: "per_system" | "per_choice" | "per_group" | "hybrid" | "unknown";
  deadlineModel: "system" | "institution" | "both" | "unknown";
  essayModel:
    | "one_statement_many_courses"
    | "shared_core_plus_supplements"
    | "per_choice"
    | "system_prompts"
    | "none";
  documentModel: "system_certification" | "per_institution" | "both" | "none";
}

export interface RoadmapDeadline {
  scope: "system" | "institution" | "program";
  kind: string;
  precision: "day" | "month" | "unknown";
  date: string | null;
  month: number | null;
}

export interface RoadmapDocument {
  purpose: string;
  required: boolean;
  certifyOnce: boolean;
}

export interface DerivedRoadmapTask {
  sourceKey: string;
  title: string;
  phase: RoadmapPhase;
  ownerRole: RoadmapOwner;
  duePrecision: "day" | "month" | "unknown" | null;
  dueDate: string | null;
  dueMonth: number | null;
  description: string;
}

export function canUnlockRoadmap(args: {
  counselingCompleted: boolean;
  hasSelectedTarget: boolean;
}): boolean {
  return args.counselingCompleted && args.hasSelectedTarget;
}

export function roadmapLockReason(args: {
  counselingCompleted: boolean;
  hasSelectedTarget: boolean;
}): string | null {
  if (canUnlockRoadmap(args)) {
    return null;
  }
  return "Application actions unlock after completed counseling and an explicit target selection.";
}

export function openingOfficialSiteCompletesSubmission(): boolean {
  return false;
}

export function missingDeadlineLabel(): string {
  return "Not specified";
}

export const ROADMAP_PHASE_LABELS: Record<RoadmapPhase, string> = {
  documents: "Documents",
  tests: "Tests",
  essays: "Essays",
  fees: "Fees",
  deadlines: "Deadlines",
  counselor: "Counselor",
};

export function phaseFromSourceKey(sourceKey: string): RoadmapPhase {
  if (sourceKey.startsWith("essay:")) {
    return "essays";
  }
  if (sourceKey.startsWith("fee:")) {
    return "fees";
  }
  if (sourceKey.startsWith("deadline:")) {
    return "deadlines";
  }
  if (sourceKey.startsWith("document:")) {
    return "documents";
  }
  if (sourceKey.startsWith("criterion:")) {
    const key = sourceKey.slice("criterion:".length);
    if (key.includes("test") || key.includes("language")) {
      return "tests";
    }
    if (key.includes("document")) {
      return "documents";
    }
  }
  return "counselor";
}

export function deriveRoadmapTasks(args: {
  system: ApplicationSystemModel;
  criteria: readonly RoadmapCriterion[];
  documents: readonly RoadmapDocument[];
  deadlines: readonly RoadmapDeadline[];
  criteriaRevision: number;
}): DerivedRoadmapTask[] {
  const tasks: DerivedRoadmapTask[] = [];

  if (args.system.essayModel === "one_statement_many_courses") {
    tasks.push({
      sourceKey: `essay:one_statement:${args.system.code}`,
      title: `${args.system.name} personal statement`,
      phase: "essays",
      ownerRole: "Student",
      duePrecision: null,
      dueDate: null,
      dueMonth: null,
      description: "One statement covers every course choice in this system.",
    });
  }
  if (args.system.essayModel === "shared_core_plus_supplements") {
    tasks.push({
      sourceKey: `essay:shared_core:${args.system.code}`,
      title: `${args.system.name} shared essay`,
      phase: "essays",
      ownerRole: "Student",
      duePrecision: null,
      dueDate: null,
      dueMonth: null,
      description: "Shared core essay. Supplements are listed separately.",
    });
    tasks.push({
      sourceKey: `essay:supplement:${args.system.code}`,
      title: `${args.system.name} supplement`,
      phase: "essays",
      ownerRole: "Student",
      duePrecision: null,
      dueDate: null,
      dueMonth: null,
      description: "Institution supplement. This is not the shared core essay.",
    });
  }
  if (args.system.essayModel === "per_choice") {
    tasks.push({
      sourceKey: `essay:per_choice:${args.system.code}`,
      title: `${args.system.name} per-choice essay`,
      phase: "essays",
      ownerRole: "Student",
      duePrecision: null,
      dueDate: null,
      dueMonth: null,
      description: "Write the essay required for this choice.",
    });
  }
  if (args.system.essayModel === "system_prompts") {
    tasks.push({
      sourceKey: `essay:system_prompts:${args.system.code}`,
      title: `${args.system.name} system prompts`,
      phase: "essays",
      ownerRole: "Student",
      duePrecision: null,
      dueDate: null,
      dueMonth: null,
      description: "Answer the system prompts for this application.",
    });
  }

  if (args.system.feeModel === "per_system" || args.system.feeModel === "hybrid") {
    tasks.push({
      sourceKey: `fee:system:${args.system.code}`,
      title: `${args.system.name} system fee`,
      phase: "fees",
      ownerRole: "Student",
      duePrecision: null,
      dueDate: null,
      dueMonth: null,
      description: "Pay the system fee once. Do not charge it again per university.",
    });
  }
  if (args.system.feeModel === "per_choice" || args.system.feeModel === "hybrid") {
    tasks.push({
      sourceKey: `fee:choice:${args.system.code}`,
      title: `${args.system.name} choice fee`,
      phase: "fees",
      ownerRole: "Student",
      duePrecision: null,
      dueDate: null,
      dueMonth: null,
      description: "Additional choice-scoped fee after included choices.",
    });
  }
  if (args.system.feeModel === "per_group") {
    tasks.push({
      sourceKey: `fee:group:${args.system.code}`,
      title: `${args.system.name} group fee`,
      phase: "fees",
      ownerRole: "Student",
      duePrecision: null,
      dueDate: null,
      dueMonth: null,
      description: "Fee assessed on the application group.",
    });
  }

  const includeSystemDeadline =
    args.system.deadlineModel === "system" || args.system.deadlineModel === "both";
  const includeInstitutionDeadline =
    args.system.deadlineModel === "institution" || args.system.deadlineModel === "both";
  for (const deadline of args.deadlines) {
    const include =
      (deadline.scope === "system" && includeSystemDeadline) ||
      ((deadline.scope === "institution" || deadline.scope === "program") &&
        includeInstitutionDeadline);
    if (!include) {
      continue;
    }
    tasks.push({
      sourceKey: `deadline:${deadline.scope}:${deadline.kind}:${args.system.code}`,
      title: `${args.system.name} ${deadline.scope} deadline`,
      phase: "deadlines",
      ownerRole: "Student",
      duePrecision: deadline.precision,
      dueDate: deadline.precision === "day" ? deadline.date : null,
      dueMonth: deadline.precision === "month" ? deadline.month : null,
      description:
        deadline.precision === "unknown"
          ? "Deadline is not specified. A last day is not invented."
          : `${deadline.kind} deadline.`,
    });
  }

  const includeSystemDocs =
    args.system.documentModel === "system_certification" ||
    args.system.documentModel === "both";
  const includeInstitutionDocs =
    args.system.documentModel === "per_institution" || args.system.documentModel === "both";
  for (const document of args.documents) {
    if (!document.required) {
      continue;
    }
    if (document.certifyOnce && !includeSystemDocs) {
      continue;
    }
    if (!document.certifyOnce && !includeInstitutionDocs) {
      continue;
    }
    tasks.push({
      sourceKey: `document:${document.purpose}:${args.system.code}`,
      title: `Document: ${document.purpose.replaceAll("_", " ")}`,
      phase: "documents",
      ownerRole: "Student",
      duePrecision: null,
      dueDate: null,
      dueMonth: null,
      description: document.certifyOnce
        ? "Shared certification. Track once, not once per university."
        : "Institution document requirement.",
    });
  }

  for (const criterion of args.criteria) {
    const phase: RoadmapPhase =
      criterion.kind === "test" || criterion.kind === "language"
        ? "tests"
        : criterion.kind === "document"
          ? "documents"
          : "counselor";
    tasks.push({
      sourceKey: `criterion:${criterion.key}:${args.criteriaRevision}`,
      title: `Requirement: ${criterion.key.replaceAll("_", " ")}`,
      phase,
      ownerRole: phase === "counselor" ? "Counselor" : "Student",
      duePrecision: null,
      dueDate: null,
      dueMonth: null,
      description: criterion.mandatory
        ? "Mandatory published criterion. Unknown is not a waiver."
        : "Weighted published criterion.",
    });
  }

  tasks.push({
    sourceKey: "counselor:review",
    title: "Counselor review of the target",
    phase: "counselor",
    ownerRole: "Counselor",
    duePrecision: null,
    dueDate: null,
    dueMonth: null,
    description: "Counselor action on the confirmed target. This is not an official submission.",
  });

  return tasks;
}

export const UCAS_SYSTEM: ApplicationSystemModel = {
  code: "ucas",
  name: "UCAS",
  feeModel: "per_system",
  deadlineModel: "system",
  essayModel: "one_statement_many_courses",
  documentModel: "per_institution",
};

export const COMMON_APP_SYSTEM: ApplicationSystemModel = {
  code: "common_app",
  name: "Common App",
  feeModel: "hybrid",
  deadlineModel: "both",
  essayModel: "shared_core_plus_supplements",
  documentModel: "both",
};
