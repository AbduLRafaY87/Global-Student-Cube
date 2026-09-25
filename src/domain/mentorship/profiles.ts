import {
  INDUSTRY_OTHER_ID,
  isAlumniTopic,
  isIndustryId,
  isParentTopic,
} from "./taxonomy";

export const STUDY_STATUSES = ["currently_studying", "graduated"] as const;
export type StudyStatus = (typeof STUDY_STATUSES)[number];

export const PARENT_EDUCATION_LEVELS = [
  "high_school",
  "diploma",
  "undergraduate",
  "postgraduate",
] as const;
export type ParentEducationLevel = (typeof PARENT_EDUCATION_LEVELS)[number];

export const MENTOR_VERIFICATION_STATES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "needs_information",
] as const;
export type MentorVerificationState = (typeof MENTOR_VERIFICATION_STATES)[number];

export const MENTOR_KINDS = ["alumni", "parent"] as const;
export type MentorKind = (typeof MENTOR_KINDS)[number];

export const ALUMNI_TOPIC_COUNT = 3;
export const PARENT_TOPIC_MIN = 1;
export const PARENT_TOPIC_MAX = 3;
export const INDUSTRY_MAX = 10;
export const HOURS_MIN = 2;
export const HOURS_MAX = 160;
export const EXPERIENCE_MAX = 80;
export const REFLECTION_WORD_MAX = 50;
export const TEXT_200 = 200;
export const TEXT_160 = 160;
export const CHOOSE_EXACTLY_THREE = "Choose exactly 3";

export interface FieldError {
  path: string;
  message: string;
}

export interface AlumniMentorProfileInput {
  studyStatus: StudyStatus | "";
  universityAttended: string;
  course: string;
  graduationYear: number | null;
  graduationIsAnticipated: boolean;
  topics: string[];
  industries: string[];
  industriesOther: string;
  currentOrganization: string;
  role: string;
  employerBusinessUrl: string;
  professionalLink: string;
  monthlyAvailabilityHours: number | null;
  experienceYears: number | null;
  reflection: string;
}

export interface ParentMentorProfileInput {
  educationLevel: ParentEducationLevel | "";
  topics: string[];
  monthlyAvailabilityHours: number | null;
  experienceYears: number | null;
  reflection: string;
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

export function isHalfHourIncrement(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value * 2 - Math.round(value * 2)) < 1e-9;
}

function isHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function validateAlumniMentorProfile(
  input: AlumniMentorProfileInput,
): FieldError[] {
  const errors: FieldError[] = [];
  if (input.studyStatus !== "currently_studying" && input.studyStatus !== "graduated") {
    errors.push({ path: "studyStatus", message: "Select current or graduate status." });
  }
  if (input.universityAttended.trim().length === 0 || input.universityAttended.length > TEXT_200) {
    errors.push({ path: "universityAttended", message: "Enter a university (200 characters max)." });
  }
  if (input.course.trim().length === 0 || input.course.length > TEXT_200) {
    errors.push({ path: "course", message: "Enter a course (200 characters max)." });
  }
  const year = input.graduationYear;
  if (year === null || !Number.isInteger(year) || year < 1950 || year > 2100) {
    errors.push({ path: "graduationYear", message: "Enter a valid graduation year." });
  }
  if (input.studyStatus === "currently_studying" && !input.graduationIsAnticipated) {
    errors.push({
      path: "graduationIsAnticipated",
      message: "Current-student status never masquerades as graduation.",
    });
  }
  if (input.studyStatus === "graduated" && input.graduationIsAnticipated) {
    errors.push({
      path: "graduationIsAnticipated",
      message: "Graduated status cannot use an anticipated year.",
    });
  }
  const topics = uniqueStrings(input.topics.filter((topic) => topic.length > 0));
  if (topics.length !== ALUMNI_TOPIC_COUNT || topics.some((topic) => !isAlumniTopic(topic))) {
    errors.push({ path: "topics", message: CHOOSE_EXACTLY_THREE });
  }
  const industries = uniqueStrings(input.industries.filter((item) => item.length > 0));
  if (
    industries.length < 1 ||
    industries.length > INDUSTRY_MAX ||
    industries.some((item) => !isIndustryId(item))
  ) {
    errors.push({ path: "industries", message: "Choose one to ten industry sectors." });
  }
  if (industries.includes(INDUSTRY_OTHER_ID) && input.industriesOther.trim().length === 0) {
    errors.push({ path: "industriesOther", message: "Explain the Other industry." });
  }
  if (input.currentOrganization.length > TEXT_160) {
    errors.push({ path: "currentOrganization", message: "Organization is 160 characters max." });
  }
  if (input.role.length > TEXT_160) {
    errors.push({ path: "role", message: "Role is 160 characters max." });
  }
  if (input.employerBusinessUrl && !isHttpsUrl(input.employerBusinessUrl)) {
    errors.push({ path: "employerBusinessUrl", message: "Use an HTTPS employer URL." });
  }
  if (input.professionalLink && !isHttpsUrl(input.professionalLink)) {
    errors.push({ path: "professionalLink", message: "Use an HTTPS LinkedIn or portfolio URL." });
  }
  const hours = input.monthlyAvailabilityHours;
  if (
    hours === null ||
    hours < HOURS_MIN ||
    hours > HOURS_MAX ||
    !isHalfHourIncrement(hours)
  ) {
    errors.push({
      path: "monthlyAvailabilityHours",
      message: "Enter 2 to 160 hours in 0.5-hour increments.",
    });
  }
  const years = input.experienceYears;
  if (years === null || years < 0 || years > EXPERIENCE_MAX) {
    errors.push({ path: "experienceYears", message: "Enter experience years from 0 to 80." });
  }
  if (input.reflection.trim() && wordCount(input.reflection) > REFLECTION_WORD_MAX) {
    errors.push({ path: "reflection", message: "Reflection is 50 words maximum." });
  }
  return errors;
}

export function validateParentMentorProfile(
  input: ParentMentorProfileInput,
): FieldError[] {
  const errors: FieldError[] = [];
  if (
    input.educationLevel !== "high_school" &&
    input.educationLevel !== "diploma" &&
    input.educationLevel !== "undergraduate" &&
    input.educationLevel !== "postgraduate"
  ) {
    errors.push({ path: "educationLevel", message: "Select an education level." });
  }
  const topics = uniqueStrings(input.topics.filter((topic) => topic.length > 0));
  if (
    topics.length < PARENT_TOPIC_MIN ||
    topics.length > PARENT_TOPIC_MAX ||
    topics.some((topic) => !isParentTopic(topic))
  ) {
    errors.push({ path: "topics", message: "Choose one to three parent topics." });
  }
  const hours = input.monthlyAvailabilityHours;
  if (hours === null || hours < HOURS_MIN || hours > HOURS_MAX) {
    errors.push({
      path: "monthlyAvailabilityHours",
      message: "Enter at least 2 hours, maximum 160.",
    });
  }
  if (
    input.experienceYears !== null &&
    (input.experienceYears < 0 || input.experienceYears > EXPERIENCE_MAX)
  ) {
    errors.push({ path: "experienceYears", message: "Enter experience years from 0 to 80." });
  }
  if (input.reflection.trim() && wordCount(input.reflection) > REFLECTION_WORD_MAX) {
    errors.push({ path: "reflection", message: "Reflection is 50 words maximum." });
  }
  return errors;
}

export function twoHoursAloneDoesNotVerify(hours: number, state: string): boolean {
  return hours >= HOURS_MIN && state !== "approved";
}

export function isPublishedDirectoryMentor(args: {
  verificationState: string;
  published: boolean;
}): boolean {
  return args.verificationState === "approved" && args.published;
}

export function ratingLabel(rating: number | null): string {
  return rating === null ? "Not yet rated" : rating.toFixed(1);
}
