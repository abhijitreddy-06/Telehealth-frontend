import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/services", "/contact", "/auth", "/signup"],
        disallow: [
          "/admin",
          "/appointments",
          "/call",
          "/doctor",
          "/patient",
          "/pharmacy",
          "/predict",
          "/records",
          "/backend",
          "/api",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
