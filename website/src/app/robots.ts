import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/" }, ...["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"].map(userAgent => ({ userAgent, allow: "/" }))], sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl };
}
