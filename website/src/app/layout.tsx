import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Instrument_Serif } from "next/font/google";
import { Header } from "@/components/header";
import { Footer, JsonLd, organization } from "@/components/ui";
import { siteDescription, siteUrl } from "@/lib/seo";
import "./globals.css";
import { MotionProvider } from "@/components/motion";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", axes: ["opsz", "wdth"], display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "MultiPostly — Create once. Post everywhere.", template: "%s | MultiPostly" },
  description: siteDescription,
  applicationName: "MultiPostly",
  icons: { icon: [{ url: "/favicon.ico" }, { url: "/icon-192.png", type: "image/png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#fbfaf7", colorScheme: "light" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${serif.variable} ${geist.variable}`}><noscript dangerouslySetInnerHTML={{ __html: "<style>[data-reveal]{opacity:1!important;transform:none!important}[data-unmask]{clip-path:none!important}</style>" }} /><MotionProvider><a className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-white" href="#main">Skip to content</a><Header /><main id="main">{children}</main><Footer /><JsonLd data={organization} /></MotionProvider></body></html>;
}
