export const USER_ROLES = [
  "student",
  "parent",
  "counselor",
  "admin",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "accepted",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  onboarding_completed: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  target_major: string;
  target_country: string;
  graduation_year: number;
  gpa: number;
  test_scores: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type StudentProfileInsert = Omit<
  StudentProfile,
  "id" | "created_at" | "updated_at" | "test_scores"
> & {
  id?: string;
  test_scores?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export interface University {
  id: string;
  name: string;
  country: string;
  city?: string | null;
  slug?: string;
  type?: string | null;
  website_url?: string | null;
}

export interface UniversitySearchFilters {
  q?: string;
  country?: string;
  city?: string;
  limit?: number;
  offset?: number;
}

export interface Application {
  id: string;
  student_id: string;
  university_id: string;
  status: ApplicationStatus;
  deadline: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPES = [
  "transcript",
  "passport",
  "recommendation_letter",
  "essay",
  "other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface StudentDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  document_type: DocumentType;
  created_at: string;
}

export const ESSAY_STATUSES = [
  "brainstorming",
  "drafting",
  "review",
  "final",
] as const;

export type EssayStatus = (typeof ESSAY_STATUSES)[number];

export interface Essay {
  id: string;
  student_id: string;
  university_id: string | null;
  title: string;
  prompt: string;
  content: string;
  word_limit: number;
  status: EssayStatus;
  created_at: string;
  updated_at: string;
}

export const RECOMMENDATION_STATUSES = [
  "requested",
  "accepted",
  "submitted",
] as const;

export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export interface Recommendation {
  id: string;
  student_id: string;
  recommender_name: string;
  recommender_email: string;
  recommender_title: string;
  relationship: string;
  status: RecommendationStatus;
  deadline: string;
  created_at: string;
}

export interface Scholarship {
  id: string;
  title: string;
  provider: string;
  amount: number;
  country: string;
  minimum_gpa: number;
  deadline: string;
  application_url: string;
  created_at: string;
}

export interface ScholarshipSearchFilters {
  country?: string;
  min_amount?: number;
}

export const TEST_TYPES = [
  "SAT",
  "ACT",
  "TOEFL",
  "IELTS",
  "GRE",
  "GMAT",
] as const;

export type TestType = (typeof TEST_TYPES)[number];

export interface TestScoreLog {
  id: string;
  student_id: string;
  test_type: TestType;
  score: number;
  test_date: string;
  is_official: boolean;
  created_at: string;
}

export interface CounselorAssignment {
  id: string;
  student_id: string;
  counselor_id: string;
  assigned_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export const INTERVIEW_STATUSES = [
  "scheduled",
  "completed",
  "canceled",
] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export interface InterviewSession {
  id: string;
  student_id: string;
  university_id: string | null;
  scheduled_at: string;
  interviewer_name: string;
  notes: string;
  status: InterviewStatus;
  created_at: string;
}

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface TaskItem {
  id: string;
  student_id: string;
  title: string;
  due_date: string;
  is_completed: boolean;
  priority: TaskPriority;
  created_at: string;
}

export interface ParentStudentLink {
  id: string;
  parent_id: string;
  student_id: string;
  created_at: string;
}

export interface FinancialProfile {
  id: string;
  case_id: string;
  occupation: string | null;
  income: number | null;
  income_currency: string | null;
  income_declined: boolean;
  savings: number | null;
  savings_currency: string | null;
  savings_declined: boolean;
  housing: Record<string, string | null>;
  sponsor_available: boolean | null;
  income_proof_available: boolean | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentActivity {
  id: string;
  student_id: string;
  title: string;
  organization: string;
  role: string;
  description: string;
  hours_per_week: number;
  weeks_per_year: number;
  created_at: string;
}

export interface VisaChecklistItem {
  id: string;
  student_id: string;
  country: string;
  document_name: string;
  is_completed: boolean;
  notes: string;
  created_at: string;
}

export const HOUSING_TYPES = [
  "on_campus",
  "off_campus",
  "shared_apartment",
] as const;

export type HousingType = (typeof HOUSING_TYPES)[number];

export interface HousingOption {
  id: string;
  university_id: string;
  title: string;
  housing_type: HousingType;
  monthly_cost: number;
  address: string;
  created_at: string;
}

export interface AlumniProfile {
  id: string;
  name: string;
  university_id: string;
  graduation_year: number;
  current_company: string;
  linkedin_url: string;
  created_at: string;
}

export const OFFER_STATUSES = ["pending", "accepted", "declined"] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

export interface AdmissionOffer {
  id: string;
  student_id: string;
  university_id: string;
  financial_aid_amount: number;
  tuition_cost: number;
  deposit_deadline: string;
  status: OfferStatus;
  created_at: string;
}

export const SUBSCRIPTION_PLANS = ["free", "premium", "counselor_pro"] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_STATUSES = [
  "active",
  "canceled",
  "past_due",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface UserSubscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_end: string;
  created_at: string;
}

export interface AdminDashboardStats {
  total_users: number;
  active_applications: number;
  university_count: number;
}

export interface SystemNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string;
  created_at: string;
}
