import Image from "next/image";
import Link from "next/link";
import { preload } from "react-dom";
import { ArrowRight, Plus } from "lucide-react";
import { faqs, platforms, type PlatformId } from "@/lib/content";
import { breadcrumb, siteUrl } from "@/lib/seo";

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

// /app is the exported Expo bundle, outside Next routing, so it needs a plain anchor.
export function SmartLink({ href, ...props }: { href: string } & React.ComponentProps<"a">) {
  return href.startsWith("/app") ? <a href={href} {...props} /> : <Link prefetch={false} href={href} {...props} />;
}

const buttonStyles = {
  dark: "bg-ink text-white hover:bg-black shadow-[0_10px_30px_-12px_rgba(17,17,20,.55)]",
  brand: "bg-brand text-white shadow-[0_12px_32px_-12px_rgba(247,55,127,.65)] hover:brightness-105",
  light: "bg-white text-ink ring-1 ring-line hover:ring-ink/25",
  glass: "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15",
};
export function Button({ href = "/download/", variant = "dark", children, className = "" }: { href?: string; variant?: keyof typeof buttonStyles; children: React.ReactNode; className?: string }) {
  return <SmartLink href={href} className={`group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition duration-300 ${buttonStyles[variant]} ${className}`}>
    {children}<ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
  </SmartLink>;
}

export function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={`mb-5 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[.14em] ${dark ? "text-white/60" : "text-ink-3"}`}><span className="bg-brand size-1.5 rounded-full" />{children}</p>;
}

export function SectionHeading({ eyebrow, title, body, center = false, dark = false }: { eyebrow: string; title: React.ReactNode; body?: React.ReactNode; center?: boolean; dark?: boolean }) {
  return <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
    <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
    <h2 className="text-[clamp(2.25rem,4.6vw,3.75rem)] font-semibold leading-[1.02] tracking-[-.04em]">{title}</h2>
    {body && <p className={`mt-5 text-lg leading-relaxed ${dark ? "text-white/65" : "text-ink-2"} ${center ? "mx-auto max-w-xl" : "max-w-xl"}`}>{body}</p>}
  </div>;
}

const screenLabels: Record<string, string> = {
  home: "MultiPostly home screen with upcoming posts and weekly reach",
  compose: "MultiPostly composer with a caption and selected channels",
  insights: "MultiPostly insights showing reach and engagement",
  connections: "MultiPostly connected social accounts",
  publishing: "MultiPostly publishing results for each channel",
  templates: "MultiPostly saved caption templates",
  calendar: "MultiPostly scheduling calendar",
  posts: "MultiPostly posts library",
};
export function Phone({ screen, className = "", priority = false, sizes = "300px" }: { screen: string; className?: string; priority?: boolean; sizes?: string }) {
  const src = `/screens/${screen}.webp`;
  const srcSet = `/screens/${screen}-390.webp 390w, /screens/${screen}-480.webp 480w, ${src} 780w`;
  if (priority) preload(src, { as: "image", fetchPriority: "high", imageSrcSet: srcSet, imageSizes: sizes });
  return <div className={`phone ${className}`}>
    <div className="phone-body"><div className="phone-screen">
      <div className="phone-status" aria-hidden="true"><span>9:41</span><span className="phone-island" /><StatusIcons /></div>
      <picture><source srcSet={srcSet} sizes={sizes} /><Image src={src} width={390} height={844} alt={screenLabels[screen] ?? `MultiPostly ${screen} screen`} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} /></picture>
    </div></div>
  </div>;
}
function StatusIcons() {
  return <svg viewBox="0 0 38 12" style={{ width: "12cqw" }} fill="currentColor"><rect x="0" y="7" width="3" height="5" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2.5" width="3" height="9.5" rx="1" /><rect x="22" y="1" width="14" height="10" rx="3" fill="none" stroke="currentColor" strokeOpacity=".5" /><rect x="23.8" y="2.8" width="9" height="6.4" rx="1.6" /></svg>;
}

export function PlatformIcon({ id, size = 24 }: { id: PlatformId; size?: number }) {
  const paths: Record<PlatformId, React.ReactNode> = {
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.2" /></>,
    facebook: <path d="M14.5 22v-9h3l.5-4h-3.5V6.5c0-1.2.4-2 2-2H18V1.2C17.4 1.1 16 1 14.8 1 11.6 1 9.5 2.9 9.5 6.2V9H6v4h3.5v9z" />,
    youtube: <><path d="M22 7.2a3 3 0 0 0-2.1-2.1C18 4.6 12 4.6 12 4.6s-6 0-7.9.5A3 3 0 0 0 2 7.2a31 31 0 0 0 0 9.6A3 3 0 0 0 4.1 19c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.2 31 31 0 0 0 0-9.6z" /><path d="m10 8.6 5.2 3.4-5.2 3.4z" fill="#fff" /></>,
    x: <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-7.5L5.3 22H2.1l7.4-8.5L1 2h6.4l4.5 6.9L18.9 2Zm-1.1 18h1.7L6.4 3.9H4.6L17.8 20Z" />,
    telegram: <path d="m21.5 3-3.4 17c-.2 1.2-.9 1.5-1.9.9l-5.2-3.8-2.5 2.4c-.3.3-.5.5-1 .5l.4-5.3 9.8-8.9c.4-.4-.1-.6-.7-.2L4.9 13.3l-5.1-1.6c-1.1-.4-1.1-1.1.2-1.6L20 2.3c.9-.3 1.7.2 1.5.7Z" transform="translate(1 0) scale(.95)" />,
    tiktok: <path d="M16 2c.4 2.9 2.1 4.7 5 4.9v4a10.3 10.3 0 0 1-5-1.4v6.8a6.6 6.6 0 1 1-5.7-6.5v4a2.6 2.6 0 1 0 1.7 2.5V2Z" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{paths[id]}</svg>;
}

export function PlatformBadge({ id, size = 44 }: { id: PlatformId; size?: number }) {
  const color = platforms.find(p => p.id === id)!.color;
  return <span className="grid shrink-0 place-items-center rounded-[30%]" style={{ width: size, height: size, color, background: `color-mix(in srgb, ${color} 10%, white)` }}><PlatformIcon id={id} size={Math.round(size * .48)} /></span>;
}

export function FAQ({ all = false }: { all?: boolean }) {
  const items = all ? faqs : faqs.slice(0, 6);
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
    <div className="divide-y divide-line border-y border-line">
      {items.map(f => <details key={f.q} className="group">
        <summary className="flex items-center justify-between gap-6 py-6 text-[17px] font-medium tracking-[-.01em] transition-colors hover:text-ink-2">{f.q}<span className="faq-icon grid size-8 shrink-0 place-items-center rounded-full bg-mist transition-transform duration-300"><Plus size={16} aria-hidden="true" /></span></summary>
        <p className="-mt-1 max-w-2xl pb-7 pr-12 leading-relaxed text-ink-2">{f.a}</p>
      </details>)}
    </div>
  </>;
}

export function PageHero({ title, description, name, path, children }: { title: React.ReactNode; description: string; name: string; path: string; children?: React.ReactNode }) {
  return <section className="wrap pb-16 pt-16 text-center md:pb-20 md:pt-24">
    <JsonLd data={breadcrumb(name, path)} />
    <nav aria-label="Breadcrumb" className="anim-fade mb-7 flex justify-center gap-2 text-[13px] text-ink-3"><Link prefetch={false} href="/" className="hover:text-ink">Home</Link><span aria-hidden="true">/</span><span className="text-ink-2">{name}</span></nav>
    <h1 className="anim-lift mx-auto max-w-4xl text-[clamp(2.75rem,6.4vw,5.25rem)] font-semibold leading-[1] tracking-[-.045em]">{title}</h1>
    <p className="anim-fade mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-2 md:text-xl" style={{ animationDelay: ".1s" }}>{description}</p>
    {children}
  </section>;
}

export function CheckItem({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <li className={`flex items-start gap-3 ${dark ? "text-white/75" : "text-ink-2"}`}><span className="bg-brand mt-[3px] grid size-[18px] shrink-0 place-items-center rounded-full text-white"><svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2.5 6.2 2.3 2.3L9.5 3.8" /></svg></span>{children}</li>;
}

export function FinalCTA() {
  return <section className="wrap py-24 md:py-32">
    <div className="relative isolate overflow-hidden rounded-[32px] bg-night px-7 py-16 text-white md:rounded-[48px] md:px-16 md:py-24">
      <div aria-hidden="true" className="absolute -bottom-40 -right-20 -z-10 size-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(247,55,127,.55),transparent)] blur-2xl" />
      <div aria-hidden="true" className="absolute -bottom-48 right-64 -z-10 size-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(255,159,67,.45),transparent)] blur-2xl" />
      <div className="max-w-xl">
        <Image src="/images/logo.webp" width={56} height={56} alt="" className="mb-8 rounded-2xl" />
        <h2 className="text-[clamp(2.25rem,4.8vw,4rem)] font-semibold leading-[1.02] tracking-[-.04em]">Your next post deserves every audience.</h2>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-white/65">Write it once, shape it for each platform, and let it go everywhere. All from your phone.</p>
        <div className="mt-9 flex flex-wrap gap-3"><Button variant="brand">Get the app</Button><Button href="/app/" variant="glass">Try it in your browser</Button></div>
      </div>
      <Phone screen="home" className="pointer-events-none absolute -bottom-56 right-16 hidden w-[290px] rotate-[8deg] lg:block" sizes="290px" />
    </div>
  </section>;
}

const footerLinks: [string, [string, string][]][] = [
  ["Product", [["Features", "/features/"], ["Platforms", "/platforms/"], ["Pricing", "/pricing/"], ["Try in browser", "/app/"]]],
  ["Resources", [["FAQ", "/faq/"], ["Get the app", "/download/"], ["llms.txt", "/llms.txt"]]],
  ["Legal", [["Privacy", "/privacy/"], ["Terms", "/terms/"]]],
];
export function Footer() {
  return <footer className="border-t border-line">
    <div className="wrap grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
      <div>
        <Link prefetch={false} href="/" className="inline-flex items-center gap-2.5 font-display text-lg font-semibold tracking-[-.03em]"><Image src="/images/logo.webp" width={30} height={30} alt="" className="rounded-[9px]" />MultiPostly</Link>
        <p className="mt-4 max-w-xs leading-relaxed text-ink-2">Create once. Post everywhere. The calm way to publish to every platform from your phone.</p>
      </div>
      {footerLinks.map(([heading, links]) => <div key={heading}>
        <h3 className="font-sans text-[13px] font-semibold uppercase tracking-[.14em] text-ink-3">{heading}</h3>
        <ul className="mt-5 space-y-3">{links.map(([label, href]) => <li key={href}><SmartLink href={href} className="text-[15px] text-ink-2 transition-colors hover:text-ink">{label}</SmartLink></li>)}</ul>
      </div>)}
    </div>
    <div className="wrap flex flex-col gap-2 border-t border-line py-7 text-[13px] text-ink-3 md:flex-row md:justify-between">
      <span>© {new Date().getFullYear()} MultiPostly. All rights reserved.</span>
      <span>Built for iOS & Android.</span>
    </div>
  </footer>;
}

export const organization = { "@context": "https://schema.org", "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "MultiPostly", url: `${siteUrl}/`, logo: `${siteUrl}/images/logo.png`, description: "Mobile social publishing for creators." };
