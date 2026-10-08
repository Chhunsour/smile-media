import type { Metadata } from "next";

export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://multipostly.app").origin;
export const siteDescription = "Create once. Post everywhere. MultiPostly brings cross-platform publishing, scheduling, captions, and insights into one mobile app.";
export function pageMetadata(title: string, description: string, path = ""): Metadata {
  const url = `${siteUrl}${path}/`;
  return {
    title: { absolute: `${title} | MultiPostly` },
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | MultiPostly`, description, url, type: "website", siteName: "MultiPostly", locale: "en_US", images: [{ url: `${siteUrl}/og.png`, width: 1200, height: 630, alt: "MultiPostly — Create once. Post everywhere." }] },
    twitter: { card: "summary_large_image", title: `${title} | MultiPostly`, description, images: [`${siteUrl}/og.png`] },
  };
}
export function breadcrumb(name: string, path: string) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
    { "@type": "ListItem", position: 2, name, item: `${siteUrl}${path}/` },
  ] };
}
