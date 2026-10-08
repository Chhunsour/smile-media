import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Eyebrow, JsonLd, Phone, SmartLink } from "@/components/ui";
import { breadcrumb } from "@/lib/seo";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Get the app", "Take MultiPostly with you on iOS and Android. Check verified app-store availability and explore the mobile publishing experience.", "/download");

function verifiedStoreUrl(value: string | undefined, host: string) {
  if (!value) return undefined;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === host ? url.href : undefined; } catch { return undefined; }
}
const AppleLogo = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1ZM13.9 4.9c.7-.9 1.2-2 1-3.2-1 .1-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5Z" /></svg>;
const PlayLogo = () => <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2.6c-.3.3-.4.7-.4 1.2v16.4c0 .5.1.9.4 1.2l9.2-9.4L4 2.6Z" fill="#00d7fe" /><path d="m16.3 15.1-3.1-3.1L4 21.4c.3.3.9.4 1.5 0l10.8-6.3Z" fill="#f93a4a" /><path d="M16.3 8.9 5.5 2.6C4.9 2.2 4.3 2.3 4 2.6l9.2 9.4 3.1-3.1Z" fill="#00f076" /><path d="M20.1 11.1 16.3 8.9 13.2 12l3.1 3.1 3.8-2.2c1.1-.6 1.1-1.2 0-1.8Z" fill="#ffc900" /></svg>;

export default function Download() {
  const stores = [
    { name: "App Store", sub: "Download on the", logo: AppleLogo, url: verifiedStoreUrl(process.env.NEXT_PUBLIC_APP_STORE_URL, "apps.apple.com") },
    { name: "Google Play", sub: "Get it on", logo: PlayLogo, url: verifiedStoreUrl(process.env.NEXT_PUBLIC_PLAY_STORE_URL, "play.google.com") },
  ];
  const anyStore = stores.some(s => s.url);
  return <section className="wrap grid items-center gap-14 pb-24 pt-14 md:pb-32 md:pt-20 lg:grid-cols-2 lg:gap-20">
    <JsonLd data={breadcrumb("Get the app", "/download")} />
    <div>
      <nav aria-label="Breadcrumb" className="mb-7 flex gap-2 text-[13px] text-ink-3"><Link prefetch={false} href="/" className="hover:text-ink">Home</Link><span aria-hidden="true">/</span><span className="text-ink-2">Get the app</span></nav>
      <Eyebrow>iOS & Android</Eyebrow>
      <h1 className="anim-lift text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[1] tracking-[-.045em]">Your studio,<br />in your pocket.</h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-2 md:text-xl">Write, adapt, schedule and track your content across six platforms — wherever the idea strikes.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        {stores.map(s => {
          const body = <><s.logo /><span className="leading-tight"><span className="block text-[11px] opacity-70">{s.url ? s.sub : "Coming soon to"}</span><span className="block text-[17px] font-semibold tracking-[-.01em]">{s.name}</span></span></>;
          return s.url
            ? <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-[60px] items-center gap-3 rounded-2xl bg-ink px-5 text-white transition hover:bg-black">{body}</a>
            : <div key={s.name} aria-disabled="true" className="inline-flex h-[60px] items-center gap-3 rounded-2xl bg-ink/90 px-5 text-white opacity-60">{body}</div>;
        })}
      </div>
      {!anyStore && <p className="mt-4 text-[13px] text-ink-3">Store links will appear here at launch.</p>}
      <SmartLink href="/app/" className="group mt-10 inline-flex items-center gap-1.5 text-[15px] font-medium">Can’t wait? Try it in your browser<ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></SmartLink>
    </div>
    <div className="hero-panel relative h-[560px] overflow-hidden rounded-[32px] md:h-[640px] md:rounded-[48px]">
      <div className="anim-rise absolute left-1/2 top-24 w-[220px] -translate-x-[calc(50%+90px)] md:w-[250px] md:-translate-x-[calc(50%+110px)]" style={{ "--r": "-6deg", animationDelay: ".3s" } as React.CSSProperties}><Phone screen="calendar" sizes="250px" /></div>
      <div className="anim-rise absolute left-1/2 top-14 w-[240px] -translate-x-[calc(50%-80px)] md:w-[280px] md:-translate-x-[calc(50%-100px)]" style={{ "--r": "4deg", animationDelay: ".15s" } as React.CSSProperties}><Phone screen="home" priority sizes="280px" /></div>
    </div>
  </section>;
}
