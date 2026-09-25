import { createClient } from "@/lib/supabase/server";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";

export async function POST() {
  const requestId = newRequestId();
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return commandFailure(error, requestId);
    }
    return commandSuccess({ loggedOut: true }, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
