import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

export interface UpdateUserProfileInput {
  expectedVersion: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  onboardingCompleted: boolean;
}

export interface UserProfileResult {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  onboarding_completed: boolean;
  version: number;
}

export async function updateUserProfile(
  context: RequestContext,
  input: UpdateUserProfileInput,
): Promise<UserProfileResult> {
  const row = await queryCommand<{ payload: UserProfileResult }>(
    context,
    `SELECT commands.update_user_profile($1, $2, $3, $4, $5) AS payload`,
    [
      input.expectedVersion,
      input.firstName,
      input.lastName,
      input.phone,
      input.onboardingCompleted,
    ],
  );
  return row.payload;
}
