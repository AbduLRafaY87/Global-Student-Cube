import { profileMetrics } from "@/app/(dashboard)/cases/[caseId]/profile/_lib";
import { nextUrgentDeadlines } from "@/domain/applications/groups";
import {
  buildStudentHome,
  type HomeDeadlineItem,
  type HomeMessageItem,
  type StudentHomeModel,
} from "@/domain/home/home";
import {
  buildRecommendationSet,
  isAcademicProfileComplete,
} from "@/domain/recommendations/recommendations";
import { createClient } from "@/lib/supabase/server";
import { resolveRequestContext } from "@/server/context";
import { loadApplicationWorkspace } from "@/server/modules/applications/load";
import {
  fetchCoverage,
  fetchPublishedAccommodations,
  fetchPublishedPrograms,
  fetchPublishedRankings,
  fetchPublishedUniversities,
  toRecommendationCandidates,
} from "@/server/modules/catalog/public";
import { loadFinance } from "@/server/modules/finance/load";
import { loadProfile, resolveAccessibleCase } from "@/server/modules/profile/load";
import { loadUnansweredCounselorMessages } from "@/server/modules/messaging/load";
import {
  getCaseRoadmapCommand,
  listJourneyMilestonesCommand,
} from "@/server/modules/journey/commands";
import { loadSaveContext } from "@/server/modules/shortlist/load";
import {
  MILESTONE_KINDS,
  MILESTONE_LABELS,
  type MilestoneKind,
} from "@/domain/journey/milestones";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function loadStudentHome(userId: string): Promise<StudentHomeModel> {
  const supabase = await createClient();
  const [{ data: account }, { data: profileRow }, caseRow] = await Promise.all([
    supabase.from("accounts").select("gsc_id").eq("id", userId).maybeSingle(),
    supabase.from("user_profiles").select("first_name, last_name").eq("id", userId).maybeSingle(),
    resolveAccessibleCase(userId),
  ]);

  const firstName = asString(profileRow?.first_name);
  const lastName = asString(profileRow?.last_name);
  const displayName = `${firstName} ${lastName}`.trim() || caseRow?.studentName || "";

  if (!caseRow) {
    return buildStudentHome({
      studentName: displayName,
      gscId: asString(account?.gsc_id) || null,
      caseId: null,
      profileReport: null,
      profilePercent: 0,
      module2Complete: false,
      recommendationCount: null,
      shortlist: [],
      deadlines: [],
      incompleteDocuments: [],
      readiness: null,
    });
  }

  const [profile, saveContext, finance, coverage] = await Promise.all([
    loadProfile(caseRow.id, userId),
    loadSaveContext(userId),
    loadFinance(caseRow.id, userId),
    fetchCoverage(),
  ]);

  const metrics = profile
    ? profileMetrics(profile, coverage.countryCount, null)
    : null;
  const module2Complete = Boolean(caseRow.module2CompletedAt && metrics?.report.complete);

  let recommendationCount: number | null = null;
  if (module2Complete && profile && isAcademicProfileComplete({
    level: profile.targetLevel,
    fieldId: profile.fieldIds[0] ?? "",
    disciplineId: profile.disciplineIds[0] ?? null,
    specializationId: profile.specializationIds[0] ?? null,
    preferredCountries: profile.countries.map((row) => row.countryCode),
    preferredCities: profile.countries.flatMap((row) => row.cities),
    requestedSubject: null,
  }, coverage.countryCount)) {
    const [universities, programs, housing, rankings] = await Promise.all([
      fetchPublishedUniversities(),
      fetchPublishedPrograms(),
      fetchPublishedAccommodations(),
      fetchPublishedRankings(),
    ]);
    const set = buildRecommendationSet({
      candidates: toRecommendationCandidates(programs, universities, housing, rankings),
      preferences: {
        level: profile.targetLevel,
        fieldId: profile.fieldIds[0] ?? "",
        disciplineId: profile.disciplineIds[0] ?? null,
        specializationId: profile.specializationIds[0] ?? null,
        preferredCountries: profile.countries.map((row) => row.countryCode),
        preferredCities: profile.countries.flatMap((row) => row.cities),
        requestedSubject: null,
      },
      manualUniversityIds: [],
    });
    recommendationCount = set.slots.length;
  }

  let deadlines: HomeDeadlineItem[] = [];
  try {
    const context = await resolveRequestContext();
    const groups = await loadApplicationWorkspace(context);
    deadlines = nextUrgentDeadlines(
      groups.flatMap((group) => group.deadlines),
      Date.now(),
    ).map((row) => ({
      key: row.key,
      label: row.sourceLabel,
      when: row.when,
      tone: row.tone,
      toneLabel: row.toneLabel,
    }));
  } catch {
    deadlines = [];
  }

  const incompleteDocuments = (profile?.files ?? [])
    .filter((file) => file.state !== "clean")
    .map((file) => ({
      id: file.id,
      label: `${file.originalName || file.purpose} · ${file.state}`,
    }));

  const cards = await loadNamedShortlist(saveContext?.pairs ?? []);
  let roadmapTasks: Array<{ id: string; title: string; status: string }> = [];
  let journeyItems: Array<{ id: string; label: string; when: string }> = [];
  try {
    const context = await resolveRequestContext();
    const [roadmap, journey] = await Promise.all([
      getCaseRoadmapCommand(context, caseRow.id),
      listJourneyMilestonesCommand(context, caseRow.id),
    ]);
    const taskRows = Array.isArray(roadmap.tasks) ? roadmap.tasks : [];
    roadmapTasks = taskRows.flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }
      const row = item as Record<string, unknown>;
      if (typeof row.id !== "string" || typeof row.title !== "string") {
        return [];
      }
      return [
        {
          id: row.id,
          title: row.title,
          status: typeof row.status === "string" ? row.status : "open",
        },
      ];
    });
    const milestoneRows = Array.isArray(journey.items) ? journey.items : [];
    journeyItems = milestoneRows.flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }
      const row = item as Record<string, unknown>;
      if (typeof row.id !== "string" || typeof row.kind !== "string") {
        return [];
      }
      if (!MILESTONE_KINDS.includes(row.kind as MilestoneKind)) {
        return [];
      }
      return [
        {
          id: row.id,
          label: MILESTONE_LABELS[row.kind as MilestoneKind],
          when: typeof row.occurredOn === "string" ? row.occurredOn : "Not provided",
        },
      ];
    });
  } catch {
    roadmapTasks = [];
    journeyItems = [];
  }

  const unanswered = await loadUnansweredCounselorMessages();
  const unansweredCounselorMessages: HomeMessageItem[] = [];
  if (unanswered.ok && Array.isArray(unanswered.data.items)) {
    for (const row of unanswered.data.items) {
      if (typeof row !== "object" || row === null) {
        continue;
      }
      const item = row as Record<string, unknown>;
      if (
        typeof item.conversationId === "string" &&
        typeof item.preview === "string" &&
        typeof item.href === "string"
      ) {
        unansweredCounselorMessages.push({
          conversationId: item.conversationId,
          preview: item.preview,
          href: item.href,
        });
      }
    }
  }

  return buildStudentHome({
    studentName: displayName || caseRow.studentName,
    gscId: asString(account?.gsc_id) || null,
    caseId: caseRow.id,
    profileReport: metrics?.report ?? null,
    profilePercent: metrics?.percent ?? 0,
    module2Complete,
    recommendationCount,
    shortlist: cards,
    deadlines,
    incompleteDocuments,
    unansweredCounselorMessages,
    roadmapTasks,
    journeyItems,
    readiness:
      !finance || finance.savingsDeclined === null
        ? null
        : {
            displayPercent: null,
            barValue: 0,
            savingsDeclined: Boolean(finance.savingsDeclined),
            known: false,
          },
  });
}

async function loadNamedShortlist(
  pairs: Array<{ id: string; universityId: string; programId: string }>,
): Promise<Array<{ id: string; universityName: string; programName: string }>> {
  if (pairs.length === 0) {
    return [];
  }
  const [universities, programs] = await Promise.all([
    fetchPublishedUniversities(),
    fetchPublishedPrograms(),
  ]);
  return pairs.flatMap((pair) => {
    const university = universities.find((row) => row.id === pair.universityId);
    const program = programs.find((row) => row.id === pair.programId);
    if (!university || !program) {
      return [];
    }
    return [
      {
        id: pair.id,
        universityName: university.name,
        programName: program.name,
      },
    ];
  });
}
