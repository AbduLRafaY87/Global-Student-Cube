import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UniversitiesIndexRedirect({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) {
      query.set(key, first);
    }
  }
  const suffix = query.toString();
  redirect(suffix ? `/explore/universities?${suffix}` : "/explore/universities");
}
