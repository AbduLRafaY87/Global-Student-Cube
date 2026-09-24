export function asText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export function asJsonText(value: unknown): string {
  if (value === null || value === undefined) {
    return "Not provided";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "Not provided";
  }
}

export function catalogEntityHref(type: string, id: string, parentId?: string | null): string {
  switch (type) {
    case "university":
      return `/admin/universities/${id}`;
    case "program":
      return `/admin/programs/${id}`;
    case "scholarship":
      return `/admin/scholarships/${id}`;
    case "accommodation":
      return parentId
        ? `/admin/universities/${parentId}`
        : "/admin/catalog?kind=accommodation";
    case "ingestion":
      return `/admin/ingestion/${id}/review`;
    default:
      return "/admin/catalog";
  }
}

export const CATALOG_FIELD_OPTIONS = [
  { value: "20000000-0000-4000-8000-000000000001", label: "STEM" },
  { value: "20000000-0000-4000-8000-000000000002", label: "Engineering" },
  { value: "20000000-0000-4000-8000-000000000003", label: "IT" },
  { value: "20000000-0000-4000-8000-000000000004", label: "Business" },
  { value: "20000000-0000-4000-8000-000000000005", label: "Arts" },
  { value: "20000000-0000-4000-8000-000000000006", label: "Medicine" },
  { value: "20000000-0000-4000-8000-000000000007", label: "Health" },
  { value: "20000000-0000-4000-8000-000000000008", label: "Law" },
  { value: "20000000-0000-4000-8000-000000000009", label: "Other" },
  { value: "20000000-0000-4000-8000-00000000000a", label: "Undecided" },
] as const;
