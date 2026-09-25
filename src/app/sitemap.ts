import {
  fetchPublishedPrograms,
  fetchPublishedScholarships,
  fetchPublishedUniversities,
} from "@/server/modules/catalog/public";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.example.invalid";
  const staticRoutes = [
    "",
    "/tour",
    "/quick-match",
    "/preview/scholarships",
    "/explore/universities",
    "/explore/scholarships",
    "/privacy",
    "/stories",
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    const [universities, programs, scholarships] = await Promise.all([
      fetchPublishedUniversities(),
      fetchPublishedPrograms(),
      fetchPublishedScholarships(),
    ]);
    for (const university of universities) {
      entries.push({
        url: `${base}/universities/${university.id}`,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
    for (const program of programs) {
      entries.push({
        url: `${base}/universities/${program.university_id}/programs/${program.id}`,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
    for (const scholarship of scholarships) {
      entries.push({
        url: `${base}/scholarships/${scholarship.id}`,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  } catch {
    // Empty published catalog is valid; static public URLs remain.
  }

  return entries;
}
