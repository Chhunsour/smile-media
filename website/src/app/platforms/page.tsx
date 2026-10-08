import Image from "next/image";
import { Button, CheckItem, Eyebrow, FinalCTA, PageHero, Phone, PlatformBadge } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { platforms } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Supported platforms", "Connect Facebook Pages, Instagram, TikTok, YouTube, X, and Telegram. Explore account requirements and supported content in MultiPostly.", "/platforms");

export default function Platforms() {
  return <>
    <PageHero name="Platforms" path="/platforms" title={<>Your audience is everywhere.<br />Now you are too.</>} description="Six integrations, one place to bring your content together. Choose the channels that work for you." />
    <section className="wrap grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {platforms.map((p, i) => <Reveal key={p.id} delay={(i % 3) * .06} className="flex flex-col rounded-[28px] bg-white p-8 ring-1 ring-line">
        <PlatformBadge id={p.id} size={56} />
        <h2 className="mt-6 text-2xl font-semibold tracking-[-.03em]">{p.name}</h2>
        <p className="mt-1 text-[15px] font-medium text-ink-2">{p.detail}</p>
        <p className="mt-4 text-[14.5px] leading-relaxed text-ink-3">{p.requirement}</p>
      </Reveal>)}
    </section>
    <p className="wrap mt-8 max-w-3xl text-center text-[13px] leading-relaxed text-ink-3">Availability depends on each platform’s approvals and your account permissions. Media formats and limits vary. MultiPostly is independent of these platforms; their names and marks belong to their owners.</p>

    <section className="wrap mt-24 grid items-center gap-12 md:mt-36 lg:grid-cols-2 lg:gap-20">
      <div className="lg:max-w-md">
        <Eyebrow>Connections</Eyebrow>
        <h2 className="text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.05] tracking-[-.04em]">Every account, under one roof.</h2>
        <p className="mt-5 text-lg leading-relaxed text-ink-2">Connect once, then pick the exact Pages, profiles and channels for each post — with captions and options tuned per platform.</p>
        <ul className="mt-8 space-y-3"><CheckItem>Multiple Pages and profiles per platform</CheckItem><CheckItem>Choose destinations post by post</CheckItem><CheckItem>Tokens stay on the server, never on your phone</CheckItem></ul>
        <Button className="mt-10">Get MultiPostly</Button>
      </div>
      <Reveal className="relative h-[520px] overflow-hidden rounded-[32px] md:h-[600px] md:rounded-[40px]">
        <Image src="/images/creator-team.webp" alt="Creators working together around a studio table" fill sizes="(max-width: 1024px) 100vw, 600px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/15 to-black/55" />
        <Phone screen="connections" className="absolute left-1/2 top-20 w-[260px] -translate-x-1/2 md:w-[290px]" sizes="290px" />
      </Reveal>
    </section>
    <FinalCTA />
  </>;
}
