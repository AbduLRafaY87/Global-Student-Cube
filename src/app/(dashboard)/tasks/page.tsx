import { resolveAccessibleCase } from "@/server/modules/profile/load";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LeftoverTasksRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const accessible = await resolveAccessibleCase(user.id);
  if (accessible) {
    redirect(`/cases/${accessible.id}/tasks`);
  }
  redirect("/home");
}
