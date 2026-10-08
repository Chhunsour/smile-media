import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/features", "/platforms", "/pricing", "/faq", "/privacy", "/terms", "/download"].map(path => ({ url: `${siteUrl}${path}/`, changeFrequency: path === "" ? "weekly" : "monthly", priority: path === "" ? 1 : path === "/privacy" || path === "/terms" ? 0.3 : 0.8 }));
}
