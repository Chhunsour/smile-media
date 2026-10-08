import Image from "next/image";
import Link from "next/link";
import { preload } from "react-dom";
import { ArrowUpRight, Check, Plus } from "lucide-react";
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
  dark: "bg-ink text-white hover:bg-black",
  light: "bg-paper text-ink ring-1 ring-ink/15 hover:ring-ink/40",
  glass: "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15",
  white: "bg-white text-ink hover:bg-white/90",
};
export function Button({ href = "/download/", variant = "dark", children, className = "" }: { href?: string; variant?: keyof typeof buttonStyles; children: React.ReactNode; className?: string }) {
  return <SmartLink href={href} className={`group inline-flex h-12 items-center justify-center gap-2.5 rounded-full pl-6 pr-5 text-[15px] font-medium transition-colors duration-300 ${buttonStyles[variant]} ${className}`}>
    {children}<ArrowUpRight size={17} strokeWidth={1.8} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
  </SmartLink>;
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <SmartLink href={href} className="group inline-flex items-center gap-1.5 border-b border-ink/25 pb-0.5 text-[15px] font-medium transition-colors hover:border-ink">{children}<ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></SmartLink>;
}

export function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={`mb-5 flex items-center gap-3 text-[13.5px] font-medium ${dark ? "text-white/60" : "text-ink-2"}`}><span className={`h-px w-7 ${dark ? "bg-white/40" : "bg-ink/40"}`} />{children}</p>;
}

// Editorial section opener: hairline, index + label on the left, headline on the right.
export function SectionHead({ index, label, title, body, dark = false }: { index: string; label: string; title: React.ReactNode; body?: React.ReactNode; dark?: boolean }) {
  return <header className={`grid gap-6 border-t pt-6 md:grid-cols-12 ${dark ? "border-white/15" : "border-ink/15"}`}>
    <p className={`text-[13.5px] md:col-span-3 ${dark ? "text-white/60" : "text-ink-2"}`}><span className={`mr-3 tabular-nums ${dark ? "text-white/40" : "text-ink-3"}`}>({index})</span>{label}</p>
    <div className="md:col-span-9">
      <h2 className="display text-[clamp(2.5rem,5.4vw,4.75rem)]">{title}</h2>
      {body && <p className={`mt-6 max-w-xl text-lg leading-relaxed ${dark ? "text-white/65" : "text-ink-2"}`}>{body}</p>}
    </div>
  </header>;
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
export function Phone({ screen, className = "", priority = false, sizes = "300px", style }: { screen: string; className?: string; priority?: boolean; sizes?: string; style?: React.CSSProperties }) {
  const src = `/screens/${screen}.webp`;
  const srcSet = `/screens/${screen}-390.webp 390w, /screens/${screen}-480.webp 480w, ${src} 780w`;
  if (priority) preload(src, { as: "image", fetchPriority: "high", imageSrcSet: srcSet, imageSizes: sizes });
  return <div className={`phone ${className}`} style={style}>
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

// Spec-sheet list of integrations; hovering a row brings its brand color in.
export function PlatformTable({ detailed = false }: { detailed?: boolean }) {
  return <ul className="border-t border-ink/15">
    {platforms.map(p => <li key={p.id} className="group grid items-center gap-x-8 gap-y-2 border-b border-ink/15 py-6 transition-colors duration-300 hover:bg-paper md:grid-cols-12 md:py-8">
      <div className="flex items-center gap-5 md:col-span-5">
        <span className="text-ink transition-colors duration-300 group-hover:text-[var(--c)]" style={{ "--c": p.color } as React.CSSProperties}><PlatformIcon id={p.id} size={30} /></span>
        <h3 className="display text-[clamp(2rem,3.6vw,3.25rem)]">{p.name}</h3>
      </div>
      <p className="text-[15px] font-medium md:col-span-3">{p.detail}</p>
      <p className={`text-[14.5px] leading-relaxed text-ink-2 md:col-span-4 ${detailed ? "" : "md:line-clamp-2"}`}>{p.requirement}</p>
    </li>)}
  </ul>;
}

export function FAQ({ all = false }: { all?: boolean }) {
  const items = all ? faqs : faqs.slice(0, 6);
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
    <div className="border-t border-ink/15">
      {items.map(f => <details key={f.q} className="group border-b border-ink/15">
        <summary className="flex items-start justify-between gap-6 py-6 font-display text-[clamp(1.15rem,1.6vw,1.4rem)] font-medium tracking-[-.02em] transition-colors hover:text-ink-2">{f.q}<span className="faq-icon mt-1 shrink-0 transition-transform duration-300"><Plus size={20} strokeWidth={1.5} aria-hidden="true" /></span></summary>
        <p className="-mt-2 max-w-2xl pb-7 pr-12 leading-relaxed text-ink-2">{f.a}</p>
      </details>)}
    </div>
  </>;
}

export function PageHero({ title, description, name, path, children }: { title: React.ReactNode; description: string; name: string; path: string; children?: React.ReactNode }) {
  return <section className="wrap pb-16 pt-14 md:pb-24 md:pt-20">
    <JsonLd data={breadcrumb(name, path)} />
    <nav aria-label="Breadcrumb" className="anim-fade mb-10 flex gap-2 text-[13.5px] text-ink-3"><Link prefetch={false} href="/" className="hover:text-ink">Home</Link><span aria-hidden="true">/</span><span className="text-ink-2">{name}</span></nav>
    <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
      <h1 className="anim-lift display text-[clamp(3rem,7vw,6.25rem)] lg:col-span-8">{title}</h1>
      <div className="lg:col-span-4 lg:pb-2">
        <p className="anim-fade text-lg leading-relaxed text-ink-2" style={{ animationDelay: ".1s" }}>{description}</p>
        {children}
      </div>
    </div>
  </section>;
}

export function CheckItem({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <li className={`flex items-start gap-3 border-t py-3 ${dark ? "border-white/15 text-white/80" : "border-ink/10 text-ink-2"}`}><Check size={16} strokeWidth={2} className={`mt-[3px] shrink-0 ${dark ? "text-white" : "text-ink"}`} aria-hidden="true" />{children}</li>;
}

export function FinalCTA() {
  return <section className="wrap pb-10 pt-28 md:pt-40">
    <div className="flex justify-between border-t border-ink/15 pt-6 text-[13.5px] text-ink-2"><span><span className="mr-3 text-ink-3">(→)</span>Get started</span><span>iOS · Android · Web</span></div>
    <h2 className="display mt-10 text-[clamp(3.6rem,12.6vw,11.5rem)] leading-[.86]">Post <span className="accent">everywhere.</span></h2>
    <div className="mt-12 grid gap-8 md:grid-cols-12 md:items-end">
      <p className="max-w-md text-lg leading-relaxed text-ink-2 md:col-span-6">Write it once, shape it for every platform, and let it go. Your next post is a minute away.</p>
      <div className="flex flex-wrap gap-3 md:col-span-6 md:justify-end"><Button>Get the app</Button><Button href="/app/" variant="light">Try it in your browser</Button></div>
    </div>
  </section>;
}

const footerLinks: [string, [string, string][]][] = [
  ["Product", [["Features", "/features/"], ["Platforms", "/platforms/"], ["Pricing", "/pricing/"], ["Try in browser", "/app/"]]],
  ["Resources", [["FAQ", "/faq/"], ["Get the app", "/download/"], ["llms.txt", "/llms.txt"]]],
  ["Legal", [["Privacy", "/privacy/"], ["Terms", "/terms/"]]],
];
export function Footer() {
  return <footer className="mt-16 bg-night text-white">
    <div className="wrap grid gap-12 py-16 md:grid-cols-12 md:py-20">
      <div className="md:col-span-5">
        <Link prefetch={false} href="/" className="inline-flex items-center gap-2.5 font-display text-xl font-semibold tracking-[-.03em]"><Image src="/images/logo.webp" width={32} height={32} alt="" className="rounded-[9px]" />MultiPostly</Link>
        <p className="mt-5 max-w-xs leading-relaxed text-white/60">Create once. Post everywhere. The publishing app for people who make things.</p>
      </div>
      {footerLinks.map(([heading, links]) => <div key={heading} className="md:col-span-2">
        <h3 className="font-sans text-[13.5px] text-white/45">{heading}</h3>
        <ul className="mt-5 space-y-3">{links.map(([label, href]) => <li key={href}><SmartLink href={href} className="text-[15px] text-white/80 transition-colors hover:text-white">{label}</SmartLink></li>)}</ul>
      </div>)}
    </div>
    <div className="wrap flex flex-col gap-2 border-t border-white/10 py-7 text-[13px] text-white/45 md:flex-row md:justify-between">
      <span>© {new Date().getFullYear()} MultiPostly. All rights reserved.</span>
      <span>Built for iOS & Android.</span>
    </div>
  </footer>;
}

export const organization = { "@context": "https://schema.org", "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "MultiPostly", url: `${siteUrl}/`, logo: `${siteUrl}/images/logo.png`, description: "Mobile social publishing for creators." };
