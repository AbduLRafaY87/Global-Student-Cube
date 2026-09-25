import { PreferencesForm } from "@/components/profile/PreferencesForm";
import { ForbiddenState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/server/modules/profile/load";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Study and destination preferences" };

export default async function PreferencesPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const profile = await loadProfile(caseId, user.id);
  if (!profile) {
    return <ForbiddenState />;
  }

  const [{ data: taxonomy }, { data: countries }, { data: published }] = await Promise.all([
    supabase.from("taxonomy_terms").select("id, kind, code, label, parent_id").eq("active", true).limit(500),
    supabase.from("countries").select("code, name").eq("supported", true).order("name").limit(300),
    supabase.from("universities").select("country").eq("publication_state", "published").limit(500),
  ]);

  const publishedCountries = new Set(
    (published ?? []).map((row) => (typeof row.country === "string" ? row.country : "")),
  );
  const supportedCatalogCount = [...publishedCountries].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-text">Study and destination preferences</h1>
      <PreferencesForm
        caseId={caseId}
        targetLevel={profile.targetLevel}
        continuingField={profile.continuingField}
        fieldIds={profile.fieldIds}
        previousFieldIds={profile.previousFieldIds}
        disciplineIds={profile.disciplineIds}
        specializationIds={profile.specializationIds}
        countries={profile.countries}
        intakeMonth={profile.intakeMonth}
        intakeYear={profile.intakeYear}
        intakeUndecided={profile.intakeUndecided}
        accommodation={profile.accommodation}
        taxonomy={(taxonomy ?? []).flatMap((row) =>
          typeof row.id === "string"
            ? [
                {
                  id: row.id,
                  kind: typeof row.kind === "string" ? row.kind : "",
                  code: typeof row.code === "string" ? row.code : "",
                  label: typeof row.label === "string" ? row.label : "",
                  parentId: typeof row.parent_id === "string" ? row.parent_id : null,
                },
              ]
            : [],
        )}
        supportedCountries={(countries ?? []).flatMap((row) =>
          typeof row.code === "string" && typeof row.name === "string"
            ? [{ code: row.code, name: row.name }]
            : [],
        )}
        supportedCatalogCount={supportedCatalogCount}
        canWrite={profile.canWrite}
      />
    </div>
  );
}
