import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "MultiPostly", short_name: "MultiPostly", description: "Create once. Post everywhere.", start_url: "/", display: "standalone", background_color: "#fbfaf7", theme_color: "#fbfaf7", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }] };
}
