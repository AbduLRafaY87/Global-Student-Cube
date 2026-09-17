export const USER_ROLES = [
  "student",
  "parent",
  "counselor",
  "admin",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "accepted"
  | "rejected";

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
  tuition_fee: number;
  acceptance_rate: number;
  minimum_gpa: number;
  ranking: number;
  created_at: string;
}

export interface UniversitySearchFilters {
  name?: string;
  country?: string;
  tuition_fee?: number;
  max_tuition_fee?: number;
  acceptance_rate?: number;
  minimum_gpa?: number;
  ranking?: number;
}

export interface Application {
  id: string;
  student_id: string;
  university_id: string;
  status: ApplicationStatus;
  deadline: string;
}
