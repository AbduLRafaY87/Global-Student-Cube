export const LEARNING_CATEGORIES = [
  "interactive_tutorials",
  "career_university",
  "counselor_lessons",
  "micro_learning",
  "skill_development",
  "parent_guidance",
  "resource_library",
] as const;
export type LearningCategory = (typeof LEARNING_CATEGORIES)[number];

export const LEARNING_AUDIENCES = [
  "students_parents",
  "alumni_mentors",
  "counselors",
  "overall",
  "marketing",
] as const;
export type LearningAudience = (typeof LEARNING_AUDIENCES)[number];

export const CONTENT_KINDS = [
  "course",
  "lesson",
  "resource",
  "news",
  "tour",
  "announcement",
  "gold_plus_invitation",
  "spotlight",
] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export const CONTENT_STATES = [
  "draft",
  "submitted",
  "review",
  "published",
  "archived",
  "changes_requested",
  "rejected",
] as const;
export type ContentState = (typeof CONTENT_STATES)[number];

export const PROGRESS_STATES = ["not_started", "in_progress", "completed"] as const;
export type ProgressState = (typeof PROGRESS_STATES)[number];

export const LIBRARY_TYPES = ["pdf", "template", "guide"] as const;
export type LibraryType = (typeof LIBRARY_TYPES)[number];

export const LESSON_FORMATS = ["video", "reading"] as const;
export type LessonFormat = (typeof LESSON_FORMATS)[number];

export const TITLE_MAX = 160;
export const SUMMARY_MAX = 600;

export const CATEGORY_LABELS: Record<LearningCategory, string> = {
  interactive_tutorials: "Interactive tutorials",
  career_university: "Career and university selection",
  counselor_lessons: "Counselor-led video lessons",
  micro_learning: "Micro-learning",
  skill_development: "Skill development",
  parent_guidance: "Parent guidance",
  resource_library: "Resource library",
};

export const AUDIENCE_LABELS: Record<LearningAudience, string> = {
  students_parents: "Students and parents",
  alumni_mentors: "Alumni and mentors",
  counselors: "Counselors",
  overall: "Overall",
  marketing: "Marketing overview",
};

export const ROLE_TUTORIAL_TOPICS: Record<
  "students_parents" | "alumni_mentors" | "counselors",
  readonly string[]
> = {
  students_parents: [
    "register_profile",
    "select_countries",
    "explore_universities",
    "book_sessions",
    "track_applications",
  ],
  alumni_mentors: [
    "accept_requests",
    "conduct_sessions",
    "submit_summaries",
    "update_availability",
    "rate_work",
  ],
  counselors: [
    "view_profiles",
    "assign_universities",
    "schedule_appointments",
    "manage_tasks",
  ],
};

export const LESSON_TOPICS = [
  "application_processes",
  "sop",
  "interviews",
  "scholarships",
  "visa_preparation",
  "budgeting",
  "cultural_adaptation",
  "communication",
  "critical_thinking",
  "note_taking",
  "time_management",
] as const;

export const PARENT_GUIDANCE_TOPICS = [
  "university_selection",
  "finances",
  "safety",
  "expectations",
] as const;

export const LIBRARY_ITEMS = ["sop_template", "resume_sample", "timeline", "budgeting_sheet"] as const;

export const ACCREDITED_CLAIM_PATTERN =
  /\b(accredited|accreditation|diploma|degree awarded|professional qualification|certificate of completion)\b/i;

export function claimsAccreditedAward(text: string): boolean {
  return ACCREDITED_CLAIM_PATTERN.test(text);
}

export function isLearningCategory(value: string): value is LearningCategory {
  return (LEARNING_CATEGORIES as readonly string[]).includes(value);
}

export function isLearningAudience(value: string): value is LearningAudience {
  return (LEARNING_AUDIENCES as readonly string[]).includes(value);
}

export function isContentKind(value: string): value is ContentKind {
  return (CONTENT_KINDS as readonly string[]).includes(value);
}

export function isContentState(value: string): value is ContentState {
  return (CONTENT_STATES as readonly string[]).includes(value);
}

export function validateLearningCopy(title: string, summary: string): string | null {
  if (title.length < 1 || title.length > TITLE_MAX) {
    return "title";
  }
  if (summary.length < 1 || summary.length > SUMMARY_MAX) {
    return "summary";
  }
  if (claimsAccreditedAward(title) || claimsAccreditedAward(summary)) {
    return "accredited";
  }
  return null;
}

export function memberCanSeeContent(state: ContentState, audience: LearningAudience, role: string): boolean {
  if (state !== "published") {
    return false;
  }
  if (audience === "overall" || audience === "marketing") {
    return true;
  }
  if (audience === "students_parents") {
    return role === "student" || role === "parent";
  }
  if (audience === "alumni_mentors") {
    return role === "student" || role === "parent";
  }
  if (audience === "counselors") {
    return role === "counselor" || role === "admin";
  }
  return false;
}

export function parentGuidanceIndependentlyDiscoverable(category: LearningCategory): boolean {
  return category === "parent_guidance";
}

export type ContentActor = "author" | "publisher" | "counselor";

export function canTransitionContent(
  from: ContentState,
  to: ContentState,
  actor: ContentActor,
): boolean {
  if (from === "draft" && to === "submitted" && (actor === "author" || actor === "counselor")) {
    return true;
  }
  if (from === "submitted" && to === "review" && actor === "publisher") {
    return true;
  }
  if (from === "review" && to === "published" && actor === "publisher") {
    return true;
  }
  if (from === "submitted" && to === "published" && actor === "publisher") {
    return true;
  }
  if ((from === "review" || from === "submitted") && to === "changes_requested" && actor === "publisher") {
    return true;
  }
  if ((from === "review" || from === "submitted") && to === "rejected" && actor === "publisher") {
    return true;
  }
  if (from === "changes_requested" && to === "submitted" && (actor === "author" || actor === "counselor")) {
    return true;
  }
  if (from === "published" && to === "archived" && actor === "publisher") {
    return true;
  }
  if ((from === "draft" || from === "submitted") && to === "archived" && actor === "author") {
    return true;
  }
  return false;
}

export function counselorCanPublish(): boolean {
  return false;
}

export function videoCanPublish(args: { captions: string; transcript: string; mediaReady: boolean }): boolean {
  if (!args.mediaReady) {
    return args.transcript.trim().length > 0 || args.captions.trim().length > 0;
  }
  return args.captions.trim().length > 0 || args.transcript.trim().length > 0;
}

export function videoCompletionReached(args: {
  format: LessonFormat;
  viewedRatio: number;
  transcriptCompleted: boolean;
  markedComplete: boolean;
}): boolean {
  if (args.format === "reading") {
    return args.markedComplete;
  }
  return args.viewedRatio >= 0.9 || args.transcriptCompleted || args.markedComplete;
}

export function applyProgress(args: {
  completedLessonIds: readonly string[];
  lessonId: string;
  totalLessons: number;
  reset: boolean;
}): { state: ProgressState; completedLessonIds: string[] } {
  if (args.reset) {
    return { state: "not_started", completedLessonIds: [] };
  }
  const completed = new Set(args.completedLessonIds);
  completed.add(args.lessonId);
  const ids = [...completed];
  const state: ProgressState =
    ids.length >= args.totalLessons && args.totalLessons > 0 ? "completed" : "in_progress";
  return { state, completedLessonIds: ids };
}

export function updatedContentAvailable(
  storedVersion: number,
  publishedVersion: number,
  completedLessonIds: readonly string[],
  requiredLessonIds: readonly string[],
): boolean {
  if (publishedVersion <= storedVersion) {
    return false;
  }
  return requiredLessonIds.some((id) => !completedLessonIds.includes(id));
}

export function resumePosition(seconds: number, durationSeconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 0;
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return Math.floor(seconds);
  }
  return Math.min(Math.floor(seconds), Math.floor(durationSeconds));
}

export function watchingVideoAwardsPoints(): boolean {
  return false;
}

export const PLAYER_CONTROLS = [
  "play",
  "pause",
  "captions",
  "transcript",
  "mark-complete",
  "next",
] as const;

export function playerIsKeyboardAccessible(controls: readonly string[]): boolean {
  return PLAYER_CONTROLS.every((control) => controls.includes(control));
}

export function goldPlusIsTicketSale(body: string): boolean {
  return /\b(buy tickets?|ticket sale|purchase a seat)\b/i.test(body);
}
