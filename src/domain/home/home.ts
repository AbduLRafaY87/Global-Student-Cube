import { unansweredCounselorPreview, type HomeMessageItem } from "../messaging/messaging";
import { profileStepHref, type CompletionReport } from "../profile/completion";
import { NOT_PROVIDED } from "../catalog/display";
import type { SemanticTone } from "../status";

export type { HomeMessageItem };

export interface HomeDeadlineItem {
  key: string;
  label: string;
  when: string;
  tone: SemanticTone;
  toneLabel: string;
}

export interface HomeShortlistItem {
  id: string;
  universityName: string;
  programName: string;
}

export interface HomeTaskItem {
  id: string;
  title: string;
  status: string;
}

export interface HomeJourneyItem {
  id: string;
  label: string;
  when: string;
}

export interface HomeNextAction {
  key: string;
  label: string;
  href: string;
}

export interface HomeWidget<T> {
  empty: boolean;
  href: string;
  items: T[];
  emptyMessage: string;
}

export interface StudentHomeModel {
  greetingName: string;
  gscId: string;
  profile: {
    percent: number;
    complete: boolean;
    nextStepLabel: string;
    nextStepHref: string;
    ctaLabel: string;
  };
  recommendations: HomeWidget<never> & { count: number | null };
  shortlist: HomeWidget<HomeShortlistItem> & { savedCount: number };
  deadlines: HomeWidget<HomeDeadlineItem>;
  documents: HomeWidget<{ id: string; label: string }>;
  messages: HomeWidget<HomeMessageItem>;
  session: HomeWidget<never>;
  tasks: HomeWidget<HomeTaskItem> & { count: number };
  scholarships: HomeWidget<never>;
  mentorship: HomeWidget<never>;
  readiness: {
    empty: boolean;
    href: string;
    displayPercent: string | null;
    barValue: number;
    message: string;
  };
  news: HomeWidget<never>;
  journey: HomeWidget<HomeJourneyItem>;
  nextActions: HomeNextAction[];
}

export interface StudentHomeInput {
  studentName: string;
  gscId: string | null;
  caseId: string | null;
  profileReport: CompletionReport | null;
  profilePercent: number;
  module2Complete: boolean;
  recommendationCount: number | null;
  shortlist: HomeShortlistItem[];
  deadlines: HomeDeadlineItem[];
  incompleteDocuments: Array<{ id: string; label: string }>;
  unansweredCounselorMessages?: HomeMessageItem[];
  roadmapTasks?: HomeTaskItem[];
  journeyItems?: HomeJourneyItem[];
  readiness:
    | {
        displayPercent: string | null;
        barValue: number;
        savingsDeclined: boolean;
        known: boolean;
      }
    | null;
}

const STEP_LABEL: Record<string, string> = {
  education: "Academic history",
  tests: "Tests and evidence",
  preferences: "Study preferences",
  experience: "Interests and introduction",
  review: "Complete-profile review",
};

export function buildStudentHome(input: StudentHomeInput): StudentHomeModel {
  const caseId = input.caseId;
  const profileHref = caseId
    ? input.profileReport
      ? profileStepHref(caseId, input.profileReport.firstIncompleteStep)
      : `/cases/${caseId}/profile`
    : "/profile";
  const stepKey = input.profileReport?.firstIncompleteStep ?? "education";
  const profileComplete = Boolean(input.module2Complete && input.profileReport?.complete);
  const nextStepLabel = profileComplete
    ? "Explore matches"
    : (STEP_LABEL[stepKey] ?? "Continue profile");

  const recommendationsEmpty =
    input.recommendationCount === null || input.recommendationCount === 0;
  const shortlistEmpty = input.shortlist.length === 0;
  const deadlinesEmpty = input.deadlines.length === 0;
  const documentsEmpty = input.incompleteDocuments.length === 0;
  const readinessEmpty =
    !input.readiness || input.readiness.savingsDeclined || !input.readiness.known;

  const nextActions: HomeNextAction[] = [];
  if (!profileComplete) {
    nextActions.push({
      key: "profile",
      label: `Continue ${nextStepLabel.toLowerCase()}`,
      href: profileHref,
    });
  } else {
    nextActions.push({
      key: "explore",
      label: "Explore matches",
      href: "/explore/universities?view=recommendations",
    });
  }
  if (shortlistEmpty && profileComplete) {
    nextActions.push({
      key: "shortlist",
      label: "Save up to three university and program combinations",
      href: "/shortlist",
    });
  }
  if (deadlinesEmpty) {
    nextActions.push({
      key: caseId ? "roadmap" : "applications",
      label: caseId ? "Open selected-target roadmap" : "Open application groups",
      href: caseId ? `/cases/${caseId}/roadmap` : "/applications",
    });
  }
  const roadmapTasks = input.roadmapTasks ?? [];
  const journeyItems = input.journeyItems ?? [];
  if (caseId && roadmapTasks.length === 0 && !deadlinesEmpty) {
    nextActions.push({
      key: "roadmap",
      label: "Open selected-target roadmap",
      href: `/cases/${caseId}/roadmap`,
    });
  }
  if (caseId) {
    nextActions.push({
      key: "journey",
      label: "Open private journey",
      href: "/journey",
    });
  }

  return {
    greetingName: input.studentName.trim() || "there",
    gscId: input.gscId?.trim() || NOT_PROVIDED,
    profile: {
      percent: input.profilePercent,
      complete: profileComplete,
      nextStepLabel,
      nextStepHref: profileComplete ? "/explore/universities?view=recommendations" : profileHref,
      ctaLabel: profileComplete ? "Explore matches" : "Continue profile",
    },
    recommendations: {
      empty: recommendationsEmpty,
      href: "/explore/universities?view=recommendations",
      items: [],
      count: input.recommendationCount,
      emptyMessage:
        input.recommendationCount === null
          ? "Recommendations appear after a complete academic profile. None are invented."
          : "No published programs match the completed profile yet.",
    },
    shortlist: {
      empty: shortlistEmpty,
      href: "/shortlist",
      items: input.shortlist,
      savedCount: input.shortlist.length,
      emptyMessage: "Saved combinations: 0/3. Recommendations are not saved slots.",
    },
    deadlines: {
      empty: deadlinesEmpty,
      href: "/applications",
      items: input.deadlines,
      emptyMessage: "No sourced application deadlines yet.",
    },
    documents: {
      empty: documentsEmpty,
      href: caseId ? `/cases/${caseId}/profile` : "/profile",
      items: input.incompleteDocuments,
      emptyMessage: "No incomplete document requirements are listed.",
    },
    messages: {
      ...unansweredCounselorPreview(input.unansweredCounselorMessages ?? []),
      href: input.unansweredCounselorMessages?.[0]?.href ?? "/messages",
    },
    session: {
      empty: true,
      href: "/counselor",
      items: [],
      emptyMessage: "No upcoming session. Counseling booking is not available yet.",
    },
    tasks: {
      empty: roadmapTasks.length === 0,
      href: caseId ? `/cases/${caseId}/roadmap` : "/tasks",
      items: roadmapTasks,
      count: roadmapTasks.length,
      emptyMessage: "No roadmap tasks yet.",
    },
    scholarships: {
      empty: true,
      href: "/explore/scholarships",
      items: [],
      emptyMessage: "Open the scholarship directory. Awards are not added to savings here.",
    },
    mentorship: {
      empty: true,
      href: "/mentors",
      items: [],
      emptyMessage: "Mentorship teasers are not published yet.",
    },
    readiness: {
      empty: readinessEmpty,
      href: caseId ? `/cases/${caseId}/costs` : "/costs",
      displayPercent:
        readinessEmpty || !input.readiness ? null : input.readiness.displayPercent,
      barValue: readinessEmpty || !input.readiness ? 0 : input.readiness.barValue,
      message: !input.readiness
        ? "Complete parent and financial information to see readiness."
        : input.readiness.savingsDeclined
          ? "Readiness is unknown because savings were declined. No percentage is invented."
          : "Financial readiness is unknown until a comparable annual cost exists.",
    },
    news: {
      empty: true,
      href: "/news",
      items: [],
      emptyMessage: "Reviewed news appears here when it is published.",
    },
    journey: {
      empty: journeyItems.length === 0,
      href: "/journey",
      items: journeyItems,
      emptyMessage: "A private journey timeline is not available yet.",
    },
    nextActions,
  };
}
