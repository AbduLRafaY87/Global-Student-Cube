"use client";

import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  ACCOMMODATION_PREFERENCES,
  citiesForCountries,
  requiredCountryCount,
  TARGET_LEVELS,
  type CountryPreferenceInput,
} from "@/domain/profile/preferences";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { saveProfileSection } from "./profile-api";

interface TaxonomyOption {
  id: string;
  kind: string;
  code: string;
  label: string;
  parentId: string | null;
}

interface PreferencesFormProps {
  caseId: string;
  targetLevel: string;
  continuingField: boolean | null;
  fieldIds: string[];
  previousFieldIds: string[];
  disciplineIds: string[];
  specializationIds: string[];
  countries: CountryPreferenceInput[];
  intakeMonth: number | null;
  intakeYear: number | null;
  intakeUndecided: boolean;
  accommodation: string;
  taxonomy: TaxonomyOption[];
  supportedCountries: { code: string; name: string }[];
  supportedCatalogCount: number;
  canWrite: boolean;
}

export function PreferencesForm({
  caseId,
  targetLevel,
  continuingField,
  fieldIds,
  previousFieldIds,
  disciplineIds,
  specializationIds,
  countries,
  intakeMonth,
  intakeYear,
  intakeUndecided,
  accommodation,
  taxonomy,
  supportedCountries,
  supportedCatalogCount,
  canWrite,
}: PreferencesFormProps) {
  const router = useRouter();
  const required = requiredCountryCount(supportedCatalogCount);
  const [level, setLevel] = useState(targetLevel);
  const [sameField, setSameField] = useState<boolean | null>(continuingField);
  const [fieldId, setFieldId] = useState(fieldIds[0] ?? "");
  const [previousFieldId, setPreviousFieldId] = useState(previousFieldIds[0] ?? "");
  const [selectedDisciplines, setSelectedDisciplines] = useState(disciplineIds);
  const [selectedSpecs, setSelectedSpecs] = useState(specializationIds);
  const [clearMasters, setClearMasters] = useState(false);
  const [prefs, setPrefs] = useState<CountryPreferenceInput[]>(
    countries.length > 0
      ? countries
      : Array.from({ length: Math.max(required, 0) }, (_, index) => ({
          countryCode: "",
          priority: index + 1,
          cities: [],
        })),
  );
  const [month, setMonth] = useState(intakeUndecided ? "" : intakeMonth === null ? "" : String(intakeMonth));
  const [year, setYear] = useState(intakeUndecided ? "" : intakeYear === null ? "" : String(intakeYear));
  const [undecided, setUndecided] = useState(intakeUndecided);
  const [housing, setHousing] = useState(accommodation);
  const [cityDraft, setCityDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fields = taxonomy.filter((row) => row.kind === "field");
  const disciplines = useMemo(
    () => taxonomy.filter((row) => row.kind === "discipline" && row.parentId === fieldId),
    [taxonomy, fieldId],
  );
  const specializations = useMemo(
    () =>
      taxonomy.filter(
        (row) => row.kind === "specialization" && selectedDisciplines.includes(row.parentId ?? ""),
      ),
    [taxonomy, selectedDisciplines],
  );

  function move(index: number, direction: -1 | 1) {
    setPrefs((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) {
        return current;
      }
      const swap = next[index];
      const other = next[target];
      if (!swap || !other) {
        return current;
      }
      next[index] = other;
      next[target] = swap;
      return next.map((row, rowIndex) => ({ ...row, priority: rowIndex + 1 }));
    });
  }

  function applyLevel(nextLevel: string) {
    if (level === "masters" && nextLevel !== "masters" && (selectedDisciplines.length > 0 || selectedSpecs.length > 0)) {
      setClearMasters(true);
      setLevel(nextLevel);
      return;
    }
    setLevel(nextLevel);
    if (nextLevel !== "masters") {
      setSelectedDisciplines([]);
      setSelectedSpecs([]);
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canWrite) {
          return;
        }
        setBusy(true);
        void saveProfileSection(`/api/v1/cases/${caseId}/profile/preferences`, {
          continuingField: sameField,
          targetLevel: level,
          fieldIds: fieldId ? [fieldId] : [],
          previousFieldIds: sameField === false && previousFieldId ? [previousFieldId] : [],
          disciplineIds: level === "masters" ? selectedDisciplines : [],
          specializationIds: level === "masters" ? selectedSpecs : [],
          countries: prefs,
          intakeMonth: undecided || month === "" ? null : Number(month),
          intakeYear: undecided || year === "" ? null : Number(year),
          intakeUndecided: undecided,
          accommodation: housing,
        }).then((result) => {
          setBusy(false);
          setMessage(result.ok ? "Saved." : result.message);
          if (result.ok) {
            router.push(`/cases/${caseId}/profile/experience`);
            router.refresh();
          }
        });
      }}
    >
      <SelectField
        id="target-level"
        label="Desired level"
        required
        value={level}
        onChange={(event) => applyLevel(event.target.value)}
        options={TARGET_LEVELS.map((value) => ({
          value,
          label: value.charAt(0).toUpperCase() + value.slice(1),
        }))}
      />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text">Continue in the same field?</legend>
        <label className="flex min-h-12 items-center gap-2">
          <input type="radio" checked={sameField === true} onChange={() => setSameField(true)} />
          Yes
        </label>
        <label className="flex min-h-12 items-center gap-2">
          <input type="radio" checked={sameField === false} onChange={() => setSameField(false)} />
          No
        </label>
      </fieldset>
      <SelectField
        id="field"
        label="Field of interest"
        required
        value={fieldId}
        onChange={(event) => setFieldId(event.target.value)}
        options={fields.map((row) => ({ value: row.id, label: row.label }))}
      />
      {sameField === false ? (
        <SelectField
          id="previous-field"
          label="Previous field"
          required
          value={previousFieldId}
          onChange={(event) => setPreviousFieldId(event.target.value)}
          options={fields.map((row) => ({ value: row.id, label: row.label }))}
        />
      ) : null}

      {clearMasters ? (
        <div className="rounded-[var(--radius-card)] border border-warning bg-warning-bg p-4">
          <p className="text-sm text-text">
            Leaving Masters clears hidden discipline and specialization values after you confirm. They are not used in matching.
          </p>
          <Button
            type="button"
            className="mt-3"
            onClick={() => {
              setSelectedDisciplines([]);
              setSelectedSpecs([]);
              setClearMasters(false);
            }}
          >
            Confirm and clear
          </Button>
        </div>
      ) : null}

      {level === "masters" ? (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-text">Disciplines</legend>
            {disciplines.map((row) => (
              <label key={row.id} className="flex min-h-12 items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedDisciplines.includes(row.id)}
                  onChange={() =>
                    setSelectedDisciplines((current) =>
                      current.includes(row.id)
                        ? current.filter((id) => id !== row.id)
                        : [...current, row.id],
                    )
                  }
                />
                {row.label}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-text">Specializations (optional)</legend>
            {specializations.map((row) => (
              <label key={row.id} className="flex min-h-12 items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedSpecs.includes(row.id)}
                  onChange={() =>
                    setSelectedSpecs((current) =>
                      current.includes(row.id)
                        ? current.filter((id) => id !== row.id)
                        : [...current, row.id],
                    )
                  }
                />
                {row.label}
              </label>
            ))}
          </fieldset>
        </>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Preferred countries</h2>
        <p className="text-sm text-text-muted">
          {required < 3
            ? `The catalog currently supports ${required} ${required === 1 ? "country" : "countries"}. Select that many, in order.`
            : "Select exactly three distinct countries. Use the buttons to change priority."}
        </p>
        {prefs.map((row, index) => (
          <div key={`country-${index}`} className="flex flex-wrap items-end gap-2">
            <MapPin aria-hidden className="mb-3 size-5 text-text-muted" />
            <SelectField
              id={`country-${index}`}
              label={`Priority ${index + 1}`}
              required
              value={row.countryCode}
              onChange={(event) => {
                const nextCodes = prefs.map((item, itemIndex) =>
                  itemIndex === index ? event.target.value : item.countryCode,
                );
                const moved = citiesForCountries(prefs, nextCodes);
                if (moved.removedDependentCities) {
                  setMessage("Changing countries removes cities that belonged to the removed country.");
                }
                setPrefs(moved.next);
              }}
              options={supportedCountries.map((country) => ({
                value: country.code,
                label: country.name,
              }))}
            />
            <Button type="button" variant="secondary" className="min-w-12" onClick={() => move(index, -1)}>
              <ChevronUp aria-hidden className="size-5" />
              <span className="sr-only">Move up</span>
            </Button>
            <Button type="button" variant="secondary" className="min-w-12" onClick={() => move(index, 1)}>
              <ChevronDown aria-hidden className="size-5" />
              <span className="sr-only">Move down</span>
            </Button>
          </div>
        ))}
        <TextField
          id="city-draft"
          label="Optional city or region"
          hint="Each city belongs to a selected country. At most ten."
          value={cityDraft}
          onChange={(event) => setCityDraft(event.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!cityDraft.trim() || prefs.length === 0) {
              return;
            }
            setPrefs((current) =>
              current.map((row, index) =>
                index === 0 ? { ...row, cities: [...row.cities, cityDraft.trim()] } : row,
              ),
            );
            setCityDraft("");
          }}
        >
          Add city to first country
        </Button>
      </div>

      <label className="flex min-h-12 items-center gap-2">
        <input
          type="checkbox"
          checked={undecided}
          onChange={(event) => {
            setUndecided(event.target.checked);
            if (event.target.checked) {
              setMonth("");
              setYear("");
            }
          }}
        />
        Intake not yet decided
      </label>
      {!undecided ? (
        <div className="grid gap-4 min-[600px]:grid-cols-2">
          <SelectField
            id="intake-month"
            label="Intake month"
            required
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            options={[
              { value: "1", label: "January" },
              { value: "5", label: "May" },
              { value: "9", label: "September" },
            ]}
          />
          <TextField
            id="intake-year"
            label="Intake year"
            required
            inputMode="numeric"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </div>
      ) : null}

      <SelectField
        id="accommodation"
        label="Accommodation preference"
        hint="This is not a guarantee that housing will be available."
        required
        value={housing}
        onChange={(event) => setHousing(event.target.value)}
        options={ACCOMMODATION_PREFERENCES.map((value) => ({
          value,
          label: value.charAt(0).toUpperCase() + value.slice(1),
        }))}
      />

      {message ? <p className="text-sm text-text-muted">{message}</p> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => router.push(`/cases/${caseId}/profile/tests`)}>
          Back
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/explore/universities?view=recommendations")}>
          Preview recommendations
        </Button>
        <Button type="submit" loading={busy} disabled={!canWrite}>
          Save and continue
        </Button>
      </div>
    </form>
  );
}
