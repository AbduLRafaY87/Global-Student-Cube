import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.example.invalid";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/explore/", "/universities/", "/tour", "/quick-match", "/preview/"],
      disallow: ["/admin/", "/api/", "/profile", "/applications"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
