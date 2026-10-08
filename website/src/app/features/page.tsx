import Image from "next/image";
import { CheckItem, Eyebrow, FinalCTA, PageHero, Phone } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Features", "Explore MultiPostly’s composer, scheduling calendar, AI caption tools, templates, publishing status, and cross-platform insights.", "/features");

const features = [
  { id: "compose", label: "Compose", title: "Write it once. Make it fit.", body: "Start with one caption and your photos or video. Pick your channels, adjust the wording for each platform, and review requirements before anything goes out.", bullets: ["Shared and per-platform captions", "Photos, video and a media library", "Platform previews and content checks"], screen: "compose", photo: "vlogger", alt: "A vlogger recording a video at home" },
  { id: "schedule", label: "Schedule", title: "Your next drop, right on time.", body: "Save ideas as drafts, choose a date and time, and see everything that’s coming up in one calendar.", bullets: ["Publish now or schedule for later", "Calendar and upcoming queue", "Drafts you can pick up anytime"], screen: "calendar", photo: "food-creator", alt: "A food creator preparing a dish" },
  { id: "publishing", label: "Publish", title: "See every channel through.", body: "A post can land on one platform and need attention on another. MultiPostly shows a separate result for each, so you can fix and retry in seconds.", bullets: ["Live progress for every channel", "Clear success and error states", "One-tap retry for failed posts"], screen: "publishing", photo: "shop-owner", alt: "A small business owner welcoming a customer" },
  { id: "templates", label: "Templates & AI", title: "Keep the good stuff.", body: "Save the sign-offs, hashtag sets and calls to action you use most. AI tools can improve, translate, shorten or suggest hashtags in a tap.", bullets: ["Reusable caption and hashtag templates", "Quick insert while composing", "AI caption assistance"], screen: "templates", photo: "podcaster", alt: "A podcaster speaking into a microphone" },
  { id: "insights", label: "Insights", title: "Learn from what lands.", body: "See reach and engagement, compare platforms, and revisit your strongest posts — over 7 days, 30 days or all time.", bullets: ["Reach, likes, comments, engagement", "Platform-by-platform breakdowns", "Your top-performing posts"], screen: "insights", photo: "musician", alt: "A musician recording in a studio" },
];

export default function Features() {
  return <>
    <PageHero name="Features" path="/features" title={<>Made for the way<br />you create.</>} description="A focused mobile workspace — from the first draft to the moment it goes live." />
    <div className="wrap space-y-24 pb-8 md:space-y-36">
      {features.map((f, i) => <section key={f.id} id={f.id} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        <Reveal className={`relative h-[480px] overflow-hidden rounded-[32px] md:h-[600px] md:rounded-[40px] ${i % 2 ? "lg:order-2" : ""}`}>
          <Image src={`/images/${f.photo}.webp`} alt={f.alt} fill sizes="(max-width: 1024px) 100vw, 600px" className="object-cover" priority={i === 0} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/15 to-black/55" />
          <Phone screen={f.screen} priority={i === 0} className="absolute left-1/2 top-20 w-[250px] -translate-x-1/2 md:top-24 md:w-[290px]" sizes="290px" />
        </Reveal>
        <div className="lg:max-w-md">
          <Eyebrow>{f.label}</Eyebrow>
          <h2 className="text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.05] tracking-[-.04em]">{f.title}</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">{f.body}</p>
          <ul className="mt-8 space-y-3">{f.bullets.map(b => <CheckItem key={b}>{b}</CheckItem>)}</ul>
        </div>
      </section>)}
    </div>
    <FinalCTA />
  </>;
}
