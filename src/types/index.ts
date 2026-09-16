export type UserRole = "student" | "parent" | "counselor" | "admin";

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
}

export interface University {
  id: string;
  name: string;
  country: string;
  tuition_fee: number;
  acceptance_rate: number;
  minimum_gpa: number;
  ranking: number;
}

export interface Application {
  id: string;
  student_id: string;
  university_id: string;
  status: ApplicationStatus;
  deadline: string;
}
