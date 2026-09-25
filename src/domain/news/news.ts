export const NEWS_TOPICS = [
  "admissions_requirement_changes",
  "new_scholarships",
  "education_fairs",
  "new_programs",
  "application_deadlines",
  "intakes",
  "open_days",
  "early_bird_scholarships",
  "deadline_reminders",
  "eligibility_alerts",
  "new_app_features",
  "system_improvements",
  "webinars_workshops",
  "alumni_success",
  "mentorship_updates",
] as const;
export type NewsTopic = (typeof NEWS_TOPICS)[number];

export const FACTUAL_NEWS_TOPICS: readonly NewsTopic[] = [
  "admissions_requirement_changes",
  "new_scholarships",
  "education_fairs",
  "new_programs",
  "application_deadlines",
  "intakes",
  "open_days",
  "early_bird_scholarships",
  "deadline_reminders",
  "eligibility_alerts",
];

export const NEWS_TOPIC_LABELS: Record<NewsTopic, string> = {
  admissions_requirement_changes: "Admissions requirement changes",
  new_scholarships: "New scholarships",
  education_fairs: "Education fairs",
  new_programs: "New programs",
  application_deadlines: "Application deadlines",
  intakes: "Intakes",
  open_days: "Open days",
  early_bird_scholarships: "Early-bird scholarships",
  deadline_reminders: "Deadline reminders",
  eligibility_alerts: "Eligibility alerts",
  new_app_features: "New app features",
  system_improvements: "System improvements",
  webinars_workshops: "Webinars and workshops",
  alumni_success: "Alumni success",
  mentorship_updates: "Mentorship updates",
};

export const NEWS_TITLE_MAX = 160;
export const NEWS_SUMMARY_MAX = 280;
export const STORY_BODY_MAX = 3000;

export const NEWS_TABS = ["all", "following", "saved"] as const;
export type NewsTab = (typeof NEWS_TABS)[number];

export const ENGAGEMENT_KINDS = ["save", "like"] as const;
export type EngagementKind = (typeof ENGAGEMENT_KINDS)[number];

export const STORY_STATES = [
  "draft",
  "submitted",
  "consent_check",
  "admin_review",
  "published",
  "changes_requested",
  "withdrawn",
] as const;
export type StoryState = (typeof STORY_STATES)[number];

export const MODERATION_QUEUES = [
  "news",
  "story",
  "message_report",
  "held_feedback",
  "safety",
] as const;
export type ModerationQueue = (typeof MODERATION_QUEUES)[number];

export const MODERATION_SEVERITIES = ["low", "medium", "high"] as const;
export type ModerationSeverity = (typeof MODERATION_SEVERITIES)[number];

export const MODERATION_STATES = [
  "open",
  "in_review",
  "resolved",
  "escalated",
  "revision_requested",
] as const;
export type ModerationState = (typeof MODERATION_STATES)[number];

export const MODERATION_DECISIONS = [
  "approved",
  "publish",
  "remove",
  "restrict",
  "request_revision",
  "escalate",
] as const;
export type ModerationDecision = (typeof MODERATION_DECISIONS)[number];

export const UNAVAILABLE_COPY = "This update is no longer available.";
export const STORY_UNAVAILABLE_COPY = "This story is no longer available.";
export const DEADLINE_DISCLAIMER =
  "Editorial dates are not official application deadlines.";
export const SHARED_WITH_PERMISSION = "Shared with permission";

export function isNewsTopic(value: string): value is NewsTopic {
  return (NEWS_TOPICS as readonly string[]).includes(value);
}

export function isFactualNewsTopic(topic: string): boolean {
  return (FACTUAL_NEWS_TOPICS as readonly string[]).includes(topic);
}

export function isNewsTab(value: string): value is NewsTab {
  return (NEWS_TABS as readonly string[]).includes(value);
}

export function isEngagementKind(value: string): value is EngagementKind {
  return (ENGAGEMENT_KINDS as readonly string[]).includes(value);
}

export function isModerationQueue(value: string): value is ModerationQueue {
  return (MODERATION_QUEUES as readonly string[]).includes(value);
}

export function isModerationDecision(value: string): value is ModerationDecision {
  return (MODERATION_DECISIONS as readonly string[]).includes(value);
}

export function validateNewsCopy(args: {
  title: string;
  summary: string;
  topic: string;
  sourceUrl: string;
}): string | null {
  if (args.title.trim().length < 1 || args.title.length > NEWS_TITLE_MAX) {
    return "Enter a headline of 160 characters or fewer.";
  }
  if (args.summary.trim().length < 1 || args.summary.length > NEWS_SUMMARY_MAX) {
    return "Enter a two-to-three-line summary of 280 characters or fewer.";
  }
  if (!isNewsTopic(args.topic)) {
    return "Choose a news topic.";
  }
  if (isFactualNewsTopic(args.topic) && !hasHttpSource(args.sourceUrl)) {
    return "A source URL is required for factual updates.";
  }
  return null;
}

export function validateStoryCopy(args: { title: string; body: string }): string | null {
  if (args.title.trim().length < 1 || args.title.length > NEWS_TITLE_MAX) {
    return "Enter a title of 160 characters or fewer.";
  }
  if (args.body.trim().length < 1 || args.body.length > STORY_BODY_MAX) {
    return "Enter a story of 3,000 characters or fewer.";
  }
  return null;
}

function hasHttpSource(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function publicContentVisible(state: string): boolean {
  return state === "published";
}

export function searchIncludesItem(args: {
  state: string;
  query: string;
  title: string;
  summary: string;
}): boolean {
  if (!publicContentVisible(args.state)) {
    return false;
  }
  const needle = args.query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return (
    args.title.toLowerCase().includes(needle) ||
    args.summary.toLowerCase().includes(needle)
  );
}

export function stalePublicPayload(kind: "news" | "story"): {
  unavailable: true;
  message: string;
} {
  return {
    unavailable: true,
    message: kind === "story" ? STORY_UNAVAILABLE_COPY : UNAVAILABLE_COPY,
  };
}

export function applyEngagement(
  current: ReadonlySet<EngagementKind>,
  kind: EngagementKind,
  enabled: boolean,
): Set<EngagementKind> {
  const next = new Set(current);
  if (enabled) {
    next.add(kind);
  } else {
    next.delete(kind);
  }
  return next;
}

export function followingDoesNotEnableWhatsApp(): boolean {
  return true;
}

export function sharingGrantsCaseAccess(): boolean {
  return false;
}

export function counselorCanSetPublicationStatus(): boolean {
  return false;
}

export function newsDateIsOfficialDeadline(): boolean {
  return false;
}

export interface StoryConsent {
  publicationConsent: boolean;
  nameConsent: boolean;
  imageConsent: boolean;
  spotlightConsent: boolean;
  mentorNamed: boolean;
  mentorConsent: boolean;
  parentNamed: boolean;
  parentConsent: boolean;
}

export function storyCanPublish(args: StoryConsent & {
  adminApproved: boolean;
  spotlight: boolean;
}): boolean {
  if (!args.publicationConsent || !args.adminApproved) {
    return false;
  }
  if (args.spotlight && !args.spotlightConsent) {
    return false;
  }
  if (args.mentorNamed && !args.mentorConsent) {
    return false;
  }
  if (args.parentNamed && !args.parentConsent) {
    return false;
  }
  return true;
}

export function storyPublicAttribution(args: {
  nameConsent: boolean;
  displayName: string;
}): string | null {
  if (!args.nameConsent) {
    return null;
  }
  const name = args.displayName.trim();
  return name.length > 0 ? name : null;
}

export function nextStoryState(
  current: StoryState,
  event: "submit" | "consent_ok" | "approve" | "request_changes" | "withdraw",
): StoryState {
  if (current === "draft" && event === "submit") {
    return "submitted";
  }
  if (current === "submitted" && event === "consent_ok") {
    return "consent_check";
  }
  if (current === "consent_check" && event === "approve") {
    return "admin_review";
  }
  if (current === "admin_review" && event === "approve") {
    return "published";
  }
  if (
    (current === "submitted" || current === "consent_check" || current === "admin_review") &&
    event === "request_changes"
  ) {
    return "changes_requested";
  }
  if (event === "withdraw") {
    return "withdrawn";
  }
  throw new Error(`Invalid story transition ${current} + ${event}`);
}

export function withdrawRemovesFromDiscovery(state: StoryState | string): boolean {
  return state === "withdrawn" || !publicContentVisible(state);
}

export function canReadProtectedSafety(hasSafetyPermission: boolean): boolean {
  return hasSafetyPermission;
}

export function canAccessModerationQueue(granted: readonly string[]): boolean {
  return granted.includes("catalog_editorial") || granted.includes("safety");
}

export function redactSafetyReview(args: {
  isProtected: boolean;
  hasSafetyPermission: boolean;
  evidence: string;
}): string | null {
  if (args.isProtected && !args.hasSafetyPermission) {
    return null;
  }
  return args.evidence;
}

export function nextModerationState(
  current: ModerationState,
  decision: ModerationDecision,
): ModerationState {
  if (decision === "escalate") {
    return "escalated";
  }
  if (decision === "request_revision") {
    return "revision_requested";
  }
  if (
    decision === "approved" ||
    decision === "publish" ||
    decision === "remove" ||
    decision === "restrict"
  ) {
    return "resolved";
  }
  return current;
}

export function spotlightRequiresSeparateConsent(): boolean {
  return true;
}

export function privateJourneyNotifiesMentor(): boolean {
  return false;
}
