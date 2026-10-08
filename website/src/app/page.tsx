import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, Check, Languages, Scissors, Sparkles, WandSparkles } from "lucide-react";
import { Button, CheckItem, FAQ, FinalCTA, JsonLd, Phone, PlatformBadge, PlatformIcon, SectionHeading, SmartLink } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { PublishDemo } from "@/components/publish-demo";
import { platforms } from "@/lib/content";
import { creators } from "@/lib/creators";
import { pageMetadata, siteDescription, siteUrl } from "@/lib/seo";

export const metadata = pageMetadata("Create once. Post everywhere.", siteDescription);

export default function Home() {
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": ["SoftwareApplication", "MobileApplication"], "@id": `${siteUrl}/#app`, name: "MultiPostly", applicationCategory: "SocialNetworkingApplication", operatingSystem: "iOS, Android", url: siteUrl, description: siteDescription, featureList: "Multi-platform publishing, per-platform captions, scheduling, saved templates, AI caption assistance, publishing status, reach and engagement insights", screenshot: `${siteUrl}/screens/compose.webp`, publisher: { "@id": `${siteUrl}/#organization` } }} />

    {/* Hero */}
    <section className="wrap pt-14 text-center md:pt-20">
      <SmartLink href="/app/" className="anim-fade group mx-auto mb-8 inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-[13.5px] text-ink-2 shadow-[0_1px_2px_rgba(17,17,20,.05)] ring-1 ring-line transition hover:ring-ink/20">
        <span className="bg-brand rounded-full px-2.5 py-0.5 text-[12px] font-semibold text-white">New</span>Try the full app in your browser<ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </SmartLink>
      <h1 className="anim-lift mx-auto max-w-5xl text-[clamp(3.1rem,8.4vw,7rem)] font-semibold leading-[.95] tracking-[-.05em]">Create once.<br />Post <span className="text-gradient pr-1">everywhere.</span></h1>
      <p className="anim-fade mx-auto mt-7 max-w-xl text-lg leading-relaxed text-ink-2 md:text-xl" style={{ animationDelay: ".1s" }}>Write one post, tailor it for each channel, and publish to Instagram, TikTok, YouTube, Facebook, X and Telegram — all from one calm app.</p>
      <div className="anim-fade mt-9 flex flex-wrap justify-center gap-3" style={{ animationDelay: ".18s" }}><Button>Get the app</Button><Button href="/app/" variant="light">Try it in your browser</Button></div>

      <div className="hero-panel relative mx-auto mt-16 h-[440px] overflow-hidden rounded-[32px] sm:h-[520px] md:mt-20 md:h-[640px] md:rounded-[48px]">
        <div className="anim-rise absolute left-1/2 top-[120px] w-[200px] -translate-x-[calc(50%+150px)] sm:w-[240px] md:top-[150px] md:w-[270px] md:-translate-x-[calc(50%+250px)]" style={{ "--r": "-7deg", animationDelay: ".35s" } as React.CSSProperties}>
          <Phone screen="home" sizes="(max-width: 768px) 200px, 270px" />
        </div>
        <div className="anim-rise absolute left-1/2 top-[120px] w-[200px] -translate-x-[calc(50%-150px)] sm:w-[240px] md:top-[150px] md:w-[270px] md:-translate-x-[calc(50%-250px)]" style={{ "--r": "7deg", animationDelay: ".45s" } as React.CSSProperties}>
          <Phone screen="publishing" sizes="(max-width: 768px) 200px, 270px" />
        </div>
        <div className="anim-rise absolute left-1/2 top-[64px] w-[230px] -translate-x-1/2 sm:w-[270px] md:top-[80px] md:w-[310px]" style={{ animationDelay: ".2s" }}>
          <Phone screen="compose" priority sizes="(max-width: 768px) 230px, 310px" />
        </div>
        <div className="anim-fade absolute left-[6%] top-[22%] hidden lg:block" style={{ animationDelay: ".9s" }}>
          <div className="anim-float flex items-center gap-3 rounded-2xl bg-white/85 py-3 pl-3 pr-5 text-left shadow-[0_20px_40px_-20px_rgba(17,17,20,.35)] ring-1 ring-white backdrop-blur">
            <span className="flex -space-x-2">{platforms.slice(0, 4).map(p => <span key={p.id} className="rounded-[30%] ring-2 ring-white"><PlatformBadge id={p.id} size={30} /></span>)}</span>
            <span className="leading-tight"><span className="block text-[14px] font-semibold">Posted to 6 channels</span><span className="block text-[12.5px] text-ink-3">Just now</span></span>
          </div>
        </div>
        <div className="anim-fade absolute right-[6%] top-[40%] hidden lg:block" style={{ animationDelay: "1.1s" }}>
          <div className="anim-float flex items-center gap-3 rounded-2xl bg-white/85 py-3 pl-3 pr-5 text-left shadow-[0_20px_40px_-20px_rgba(17,17,20,.35)] ring-1 ring-white backdrop-blur" style={{ animationDelay: "-3s" }}>
            <span className="bg-brand grid size-[30px] place-items-center rounded-[30%] text-white"><CalendarClock size={16} aria-hidden="true" /></span>
            <span className="leading-tight"><span className="block text-[14px] font-semibold">Scheduled</span><span className="block text-[12.5px] text-ink-3">Friday · 9:00 AM</span></span>
          </div>
        </div>
      </div>
    </section>

    {/* Platform strip */}
    <section aria-label="Supported platforms" className="wrap py-14 md:py-16">
      <p className="text-center text-[13px] font-semibold uppercase tracking-[.14em] text-ink-3">Publishes to</p>
      <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 md:gap-x-14">
        {platforms.map(p => <li key={p.id} className="flex items-center gap-2.5 text-ink-3 transition-colors hover:text-ink"><PlatformIcon id={p.id} size={22} /><span className="font-display text-[17px] font-semibold tracking-[-.02em]">{p.name}</span></li>)}
      </ul>
    </section>

    {/* Demo */}
    <section id="how-it-works" className="wrap py-20 md:py-28">
      <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
        <SectionHeading eyebrow="How it works" title={<>One post.<br />Every platform.</>} body="Pick your channels, hit publish, and watch each one go live — with a clear result for every destination." />
        <Link prefetch={false} href="/features/" className="group inline-flex items-center gap-1.5 text-[15px] font-medium">Explore all features<ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>
      </div>
      <Reveal className="mt-12 md:mt-16"><PublishDemo /></Reveal>
    </section>

    {/* Feature bento */}
    <section className="wrap py-20 md:py-28">
      <SectionHeading center eyebrow="Features" title={<>Everything you need.<br />Nothing you don’t.</>} body="A focused workspace for the whole publishing routine — from first draft to the moment it goes live." />
      <div className="mt-14 grid gap-4 md:mt-16 md:grid-cols-6 md:gap-5">
        <Reveal className="relative overflow-hidden rounded-[32px] bg-mist p-8 md:col-span-4 md:h-[540px] md:p-11">
          <div className="relative z-10 md:max-w-[300px]">
            <h3 className="text-[28px] font-semibold leading-[1.1] tracking-[-.03em]">One caption, tuned for every channel.</h3>
            <p className="mt-4 leading-relaxed text-ink-2">Start with a shared caption, then tweak it per platform. Media, previews and content checks are built in.</p>
            <ul className="mt-6 space-y-2.5 text-[15px]"><CheckItem>Per-platform captions</CheckItem><CheckItem>Photos, video & media library</CheckItem><CheckItem>Checks before you publish</CheckItem></ul>
          </div>
          <Phone screen="compose" className="mx-auto mt-10 -mb-[220px] w-[260px] md:absolute md:bottom-0 md:right-14 md:m-0 md:w-[300px] md:translate-y-[38%]" sizes="300px" />
        </Reveal>
        <FeatureCard title="Schedule ahead." body="Plan the week and see every drop in your calendar." screen="calendar" className="md:col-span-2" delay={.08} />
        <FeatureCard title="Know what went live." body="A clear result for each channel. Retry anything that failed." screen="publishing" className="md:col-span-2" />
        <FeatureCard title="Your best words, saved." body="Reusable captions, sign-offs and hashtag sets." screen="templates" className="md:col-span-2" delay={.08} />
        <Reveal delay={.16} className="relative isolate overflow-hidden rounded-[32px] bg-night p-8 text-white md:col-span-2 md:h-[540px] md:p-10">
          <div aria-hidden="true" className="absolute -bottom-32 -right-24 -z-10 size-96 rounded-full bg-[radial-gradient(closest-side,rgba(247,55,127,.5),transparent)] blur-xl" />
          <span className="bg-brand grid size-11 place-items-center rounded-2xl"><Sparkles size={20} aria-hidden="true" /></span>
          <h3 className="mt-6 text-[26px] font-semibold leading-[1.1] tracking-[-.03em]">Captions, sharpened by AI.</h3>
          <p className="mt-3 leading-relaxed text-white/65">Polish, translate or trim a caption in a tap.</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {[[WandSparkles, "Improve"], [Languages, "Translate"], [Scissors, "Shorten"], [Sparkles, "Hashtags"]].map(([Icon, label]) => { const I = Icon as typeof Sparkles; return <span key={label as string} className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3.5 py-2 text-[14px] ring-1 ring-white/12"><I size={15} aria-hidden="true" />{label as string}</span>; })}
          </div>
          <div className="mt-8 rounded-2xl bg-white/6 p-4 text-[14px] leading-relaxed ring-1 ring-white/10">
            <p className="text-white/45 line-through decoration-white/30">new video is up go watch it</p>
            <p className="mt-2 text-white">Our new video is live — the story behind the shot. Watch now ✨</p>
          </div>
        </Reveal>
      </div>
    </section>

    {/* Creators */}
    <section className="bg-night py-24 text-white md:py-32">
      <div className="wrap"><SectionHeading dark center eyebrow="Made for makers" title={<>For everyone with<br />something to share.</>} body="Podcasters, chefs, musicians, shop owners and storytellers — one place to reach every audience." /></div>
      <div className="marquee mt-14 md:mt-20">
        <ul className="marquee-track gap-5 pr-5">
          {[...creators, ...creators].map((c, i) => <li key={i} aria-hidden={i >= creators.length} className="relative aspect-[3/4] w-[240px] shrink-0 overflow-hidden rounded-[28px] md:w-[300px]">
            <Image src={`/images/${c.image}.webp`} alt={i < creators.length ? c.alt : ""} fill sizes="300px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6"><p className="font-display text-xl font-semibold tracking-[-.02em]">{c.type}</p><p className="mt-1 text-[14px] text-white/70">{c.note}</p></div>
          </li>)}
        </ul>
      </div>
    </section>

    {/* Insights */}
    <section className="wrap grid items-center gap-14 py-24 md:py-32 lg:grid-cols-2 lg:gap-20">
      <div>
        <SectionHeading eyebrow="Insights" title={<>See what’s<br />working.</>} body="Reach, engagement and your strongest posts across every platform — so your next move is an easy one." />
        <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-line pt-8">
          {[["2.1M", "Total reach"], ["6.9%", "Engagement"], ["93%", "Delivery rate"]].map(([n, l]) => <div key={l}><dt className="text-[13px] text-ink-3">{l}</dt><dd className="mt-1 font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-.04em]">{n}</dd></div>)}
        </dl>
        <p className="mt-4 text-[12.5px] text-ink-3">Figures from the demo workspace.</p>
      </div>
      <Reveal className="relative h-[520px] overflow-hidden rounded-[32px] md:h-[600px] md:rounded-[40px]">
        <Image src="/images/studio.webp" alt="A music studio lit in warm colors" fill sizes="(max-width: 1024px) 100vw, 600px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/60" />
        <Phone screen="insights" className="absolute left-1/2 top-16 w-[260px] -translate-x-1/2 md:w-[290px]" sizes="290px" />
      </Reveal>
    </section>

    {/* Platforms */}
    <section className="bg-mist py-24 md:py-32">
      <div className="wrap">
        <SectionHeading center eyebrow="Platforms" title={<>Six platforms.<br />One publish button.</>} body="Connect your accounts once. Then choose exactly where each post goes." />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 md:mt-16 lg:grid-cols-3">
          {platforms.map((p, i) => <Reveal key={p.id} delay={(i % 3) * .06} className="group flex items-center gap-5 rounded-[24px] bg-white p-6 ring-1 ring-line transition-shadow duration-300 hover:shadow-[0_24px_48px_-28px_rgba(17,17,20,.35)]">
            <PlatformBadge id={p.id} size={52} />
            <div><h3 className="text-lg font-semibold tracking-[-.02em]">{p.name}</h3><p className="text-[14.5px] text-ink-2">{p.detail}</p></div>
            <Check size={18} className="ml-auto text-emerald-600" aria-label="Supported" />
          </Reveal>)}
        </div>
        <div className="mt-10 text-center"><Link prefetch={false} href="/platforms/" className="group inline-flex items-center gap-1.5 text-[15px] font-medium">Platform requirements<ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link></div>
      </div>
    </section>

    {/* FAQ */}
    <section className="wrap grid gap-12 pt-24 md:pt-32 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
      <div>
        <SectionHeading eyebrow="FAQ" title={<>Questions,<br />answered.</>} />
        <Link prefetch={false} href="/faq/" className="group mt-8 inline-flex items-center gap-1.5 text-[15px] font-medium">See all questions<ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>
      </div>
      <FAQ />
    </section>

    <FinalCTA />
  </>;
}

function FeatureCard({ title, body, screen, className = "", delay = 0 }: { title: string; body: string; screen: string; className?: string; delay?: number }) {
  return <Reveal delay={delay} className={`relative h-[480px] overflow-hidden rounded-[32px] bg-mist p-8 md:h-[540px] md:p-10 ${className}`}>
    <h3 className="text-[26px] font-semibold leading-[1.1] tracking-[-.03em]">{title}</h3>
    <p className="mt-3 leading-relaxed text-ink-2">{body}</p>
    <Phone screen={screen} className="absolute left-1/2 top-[210px] w-[250px] -translate-x-1/2 md:top-[230px] md:w-[260px]" sizes="260px" />
  </Reveal>;
}
