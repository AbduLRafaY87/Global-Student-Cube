export const SESSION_TYPES = ["career", "admission", "finance", "accommodation"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const REPORT_POINT_MAX = 600;

export const CLARITY_OPTIONS = [
  "Very Clear",
  "Clear",
  "Somewhat Clear",
  "Not Clear",
] as const;

export const AGREE_OPTIONS = [
  "Strongly Agree",
  "Agree",
  "Neutral",
  "Disagree",
] as const;

export const ACTION_CLARITY_OPTIONS = [
  "Yes, very clear",
  "Somewhat clear",
  "Minimal",
  "None",
] as const;

export const SATISFACTION_OPTIONS = [
  "Very Satisfied",
  "Satisfied",
  "Neutral",
  "Unsatisfied",
] as const;

export const CHALLENGE_OPTIONS = [
  "Lack of clarity",
  "Information overload",
  "Too fast/too slow pace",
  "Not enough time",
  "Limited topic knowledge",
  "Technical issues (audio/call quality)",
  "Difficulty understanding process/steps",
  "None",
] as const;

export const PREPARATION_OPTIONS = [
  "Very Prepared",
  "Prepared",
  "Somewhat Prepared",
  "Not Prepared",
] as const;

export const ENGAGEMENT_OPTIONS = [
  "Very Engaged",
  "Engaged",
  "Somewhat Engaged",
  "Not Engaged",
] as const;

export const OVERALL_OPTIONS = ["Excellent", "Good", "Fair", "Poor"] as const;

export const TECHNICAL_OPTIONS = [
  "No issues",
  "Minor audio/video issues",
  "Connectivity interruptions",
  "Major technical disruption",
] as const;

export const SCOPE_OPTIONS = [
  "Not challenging",
  "Slightly",
  "Moderately",
  "Very challenging",
] as const;

export const PARENT_CLARITY_OPTIONS = [
  "Excellent",
  "Good",
  "Fair",
  "Needs Improvement",
] as const;

export const PARENT_USEFULNESS_OPTIONS = [
  "Strongly Agree",
  "Agree",
  "Neutral",
  "Disagree",
  "Strongly Disagree",
] as const;

export const PARENT_PRACTICALITY_OPTIONS = [
  "Highly Practical",
  "Practical",
  "Somewhat Practical",
  "Not Practical",
] as const;

export const PARENT_RECOMMENDATION_OPTIONS = [
  "Definitely Yes",
  "Yes",
  "Maybe",
  "No",
] as const;

export const NONE_CHALLENGE = "None";

export interface AlumniMenteeFeedback {
  clarity: string;
  relevance: string;
  preparedKnowledgeable: string;
  actionClarity: string;
  satisfaction: string;
  challenges: string[];
}

export interface MentorAuthoredFeedback {
  preparation: string;
  engagement: string;
  likelyFollowthrough: string;
  overallExperience: string;
  technicalIssues: string;
  scopeDifficulty: string;
}

export interface ParentMenteeFeedback {
  clarity: string;
  usefulness: string;
  organization: string;
  practicality: string;
  recommendation: string;
}

function includes<T extends string>(options: readonly T[], value: string): value is T {
  return (options as readonly string[]).includes(value);
}

export function noneChallengeIsExclusive(challenges: string[]): boolean {
  if (challenges.includes(NONE_CHALLENGE)) {
    return challenges.length === 1;
  }
  return challenges.length > 0;
}

export function validateAlumniMenteeFeedback(input: AlumniMenteeFeedback): boolean {
  return (
    includes(CLARITY_OPTIONS, input.clarity) &&
    includes(AGREE_OPTIONS, input.relevance) &&
    includes(AGREE_OPTIONS, input.preparedKnowledgeable) &&
    includes(ACTION_CLARITY_OPTIONS, input.actionClarity) &&
    includes(SATISFACTION_OPTIONS, input.satisfaction) &&
    noneChallengeIsExclusive(input.challenges) &&
    input.challenges.every((item) => includes(CHALLENGE_OPTIONS, item))
  );
}

export function validateMentorFeedback(input: MentorAuthoredFeedback): boolean {
  return (
    includes(PREPARATION_OPTIONS, input.preparation) &&
    includes(ENGAGEMENT_OPTIONS, input.engagement) &&
    includes(AGREE_OPTIONS, input.likelyFollowthrough) &&
    includes(OVERALL_OPTIONS, input.overallExperience) &&
    includes(TECHNICAL_OPTIONS, input.technicalIssues) &&
    includes(SCOPE_OPTIONS, input.scopeDifficulty)
  );
}

export function validateParentMenteeFeedback(input: ParentMenteeFeedback): boolean {
  return (
    includes(PARENT_CLARITY_OPTIONS, input.clarity) &&
    includes(PARENT_USEFULNESS_OPTIONS, input.usefulness) &&
    includes(AGREE_OPTIONS, input.organization) &&
    includes(PARENT_PRACTICALITY_OPTIONS, input.practicality) &&
    includes(PARENT_RECOMMENDATION_OPTIONS, input.recommendation)
  );
}

export function unfinishedMeetingCannotEarnPoints(sessionState: string): boolean {
  return sessionState !== "completed";
}

export function reportPointValid(value: string, required: boolean): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return !required;
  }
  return trimmed.length <= REPORT_POINT_MAX;
}
