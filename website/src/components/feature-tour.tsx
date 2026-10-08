"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Phone } from "./ui";

const features = [
  { title: "Write it once.", accent: "Make it fit.", body: "Start with one caption and your photos or video. Pick your channels, then tune the wording for each platform before anything goes out.", points: ["Per-platform captions", "Photos, video and a media library", "Checks before you publish"], screen: "compose", photo: "vlogger", alt: "A vlogger recording at home" },
  { title: "Plan the week.", accent: "Not the night before.", body: "Save drafts, pick a date and time, and see every drop lined up in one calendar.", points: ["Publish now or schedule", "Calendar and upcoming queue", "Drafts you can pick up anytime"], screen: "calendar", photo: "food-creator", alt: "A food creator preparing a dish" },
  { title: "Know what went live.", accent: "Everywhere.", body: "Each channel reports back on its own, so one hiccup never hides behind five successes. Fix it and retry in a tap.", points: ["Live progress per channel", "Clear errors you can act on", "One-tap retry"], screen: "publishing", photo: "shop-owner", alt: "A shop owner welcoming a customer" },
  { title: "Keep your best words.", accent: "Close.", body: "Save sign-offs, hashtag sets and calls to action. Let AI polish, translate or trim a caption when you need it.", points: ["Caption and hashtag templates", "Improve, translate, shorten", "Hashtag suggestions"], screen: "templates", photo: "podcaster", alt: "A podcaster speaking into a microphone" },
  { title: "See what lands.", accent: "Do more of it.", body: "Reach, engagement and your strongest posts across every platform — over a week, a month or all time.", points: ["Reach, likes, comments", "Platform breakdowns", "Top-performing posts"], screen: "insights", photo: "musician", alt: "A musician recording in a studio" },
];

export function FeatureTour() {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    // The item crossing the middle of the viewport drives the sticky visual.
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i)); }), { rootMargin: "-45% 0px -45% 0px" });
    items.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return <div className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-12">
    <div className="hidden lg:col-span-6 lg:block">
      <div className="sticky top-24 aspect-[4/5] overflow-hidden rounded-[28px]">
        {features.map((f, i) => <div key={f.photo} className={`absolute inset-0 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] ${i === active ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"}`}>
          <Image src={`/images/${f.photo}.webp`} alt={f.alt} fill sizes="620px" className="object-cover" />
        </div>)}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/5 to-black/45" />
        <div className="absolute left-1/2 top-[12%] w-[46%] -translate-x-1/2">
          {features.map((f, i) => <Phone key={f.screen} screen={f.screen} sizes="290px" className={`transition-[opacity,translate] duration-700 ease-[cubic-bezier(.2,.7,.2,1)] ${i === 0 ? "relative" : "absolute inset-x-0 top-0"} ${i === active ? "opacity-100" : "translate-y-4 opacity-0"}`} />)}
        </div>
        <ol className="absolute bottom-6 left-6 flex gap-1.5" aria-hidden="true">{features.map((f, i) => <li key={f.screen} className={`h-1 rounded-full bg-white transition-all duration-500 ${i === active ? "w-8" : "w-3 opacity-50"}`} />)}</ol>
      </div>
    </div>

    <ol className="lg:col-span-5 lg:col-start-8">
      {features.map((f, i) => <li key={f.screen} data-i={i} ref={el => { items.current[i] = el; }} className="flex flex-col justify-center border-t border-ink/15 py-12 first:border-t-0 first:pt-0 lg:min-h-[78vh] lg:border-t-0 lg:py-0">
        <div className="relative mb-10 aspect-[4/5] overflow-hidden rounded-[24px] lg:hidden">
          <Image src={`/images/${f.photo}.webp`} alt={f.alt} fill sizes="90vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/45" />
          <Phone screen={f.screen} sizes="220px" className="absolute left-1/2 top-[12%] w-[52%] -translate-x-1/2" />
        </div>
        <p className="accent text-[2.5rem] leading-none text-ink-3">{String(i + 1).padStart(2, "0")}</p>
        <h3 className="display mt-6 text-[clamp(2.25rem,3.6vw,3.25rem)]">{f.title} <span className="accent">{f.accent}</span></h3>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-2">{f.body}</p>
        <ul className="mt-7 max-w-md text-[15px] text-ink-2">{f.points.map(p => <li key={p} className="border-t border-ink/10 py-3">{p}</li>)}</ul>
      </li>)}
    </ol>
  </div>;
}
