import Image from "next/image";
import { Check, Eye, Heart, Play, UserPlus } from "lucide-react";
import { Stage3D } from "@/components/stage-3d";
import { Button, Phone, PlatformBadge, PlatformIcon } from "@/components/ui";
import { platforms, type PlatformId } from "@/lib/content";

// One timeline drives the whole hero: the headline names a platform at the moment its card goes live.
const START = 1.2, STEP = 0.7;
const wordAt = (i: number) => START + i * STEP;
const at = (s: number) => ({ animationDelay: `${s.toFixed(2)}s` });

const words: Record<PlatformId, { label: string; className: string }> = {
  instagram: { label: "Instagram.", className: "bg-[linear-gradient(90deg,#f58529,#dd2a7b_55%,#8134af)] bg-clip-text text-transparent" },
  tiktok: { label: "TikTok.", className: "text-ink [text-shadow:-.03em_0_#25f4ee,.03em_0_#fe2c55]" },
  youtube: { label: "YouTube.", className: "text-[#ff0033]" },
  facebook: { label: "Facebook.", className: "text-[#1877f2]" },
  x: { label: "X.", className: "text-ink" },
  telegram: { label: "Telegram.", className: "text-[#229ed9]" },
};

// Stage coordinates live in a 1200×700 box; cards, phone and SVG paths all share it.
const cards: { id: PlatformId; side: "l" | "r"; y: number; caption: string; meta: string }[] = [
  { id: "instagram", side: "l", y: 120, caption: "Behind the scenes of our new short ✨ #filmmaking", meta: "Post · 1:1" },
  { id: "tiktok", side: "r", y: 120, caption: "POV: the shot that took 14 takes 🎬", meta: "Video · 9:16" },
  { id: "youtube", side: "l", y: 326, caption: "Golden Hour — Behind the Scenes (4K)", meta: "Video · 4K" },
  { id: "facebook", side: "r", y: 326, caption: "A look behind the scenes of our new film.", meta: "Page post" },
  { id: "x", side: "l", y: 532, caption: "14 takes. 1 perfect shot. Out now.", meta: "34 chars" },
  { id: "telegram", side: "r", y: 532, caption: "New BTS drop is live in the channel 🎥", meta: "Channel" },
];
// Reactions float in front of the scene (deepest layer) once their platform is live.
const reactions: { id: PlatformId; icon: typeof Heart; text: string; left: number; top: number; z: number }[] = [
  { id: "instagram", icon: Heart, text: "1.2K likes", left: 17, top: 2, z: 190 },
  { id: "tiktok", icon: Play, text: "24K views", left: 84, top: 1, z: 230 },
  { id: "youtube", icon: UserPlus, text: "+312 subscribers", left: 15, top: 33, z: 160 },
  { id: "telegram", icon: Eye, text: "3.1K views", left: 64, top: 61, z: 210 },
];
const order = platforms.map(p => p.id);
const startY: Record<number, number> = { 120: 300, 326: 326, 532: 352 };
const pathFor = (side: "l" | "r", y: number) => {
  const sy = startY[y];
  return side === "l" ? `M450 ${sy} C 390 ${sy}, 370 ${y}, 300 ${y}` : `M750 ${sy} C 810 ${sy}, 830 ${y}, 900 ${y}`;
};
const platform = (id: PlatformId) => platforms.find(p => p.id === id)!;

export function Hero() {
  return <section className="relative overflow-x-clip">
    <div className="wrap pt-14 md:pt-24">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <h1 className="display text-[clamp(2.6rem,7.6vw,7rem)] leading-[.9] lg:col-span-8">
          <span className="sr-only">Create once. Post everywhere.</span>
          <span aria-hidden="true" className="anim-lift block">Create once.</span>
          <span aria-hidden="true" className="anim-lift block" style={at(.08)}>Post{" "}
            <span className="roll accent">
              <span className="roll-out pr-[.08em]" style={at(START)}>everywhere.</span>
              {order.map((id, i) => <span key={id} className="roll-pass pr-[.08em]" style={at(wordAt(i))}><span className="text-ink">to </span><span className={words[id].className}>{words[id].label}</span></span>)}
              <span className="roll-in pr-[.08em]" style={at(wordAt(order.length))}>everywhere.</span>
            </span>
          </span>
        </h1>
        <div className="lg:col-span-4 lg:pb-3">
          <p className="anim-fade text-lg leading-relaxed text-ink-2" style={at(.15)}>Write one post, shape it for each channel, and publish to Instagram, TikTok, YouTube, Facebook, X and Telegram in a single tap.</p>
          <div className="anim-fade mt-8 flex flex-wrap gap-3" style={at(.22)}><Button>Get the app</Button><Button href="/app/" variant="light">Try in browser</Button></div>
        </div>
      </div>
    </div>

    {/* Desktop broadcast stage */}
    <Stage3D className="hero-stage wrap relative mt-16 hidden aspect-[1200/700] md:block lg:mt-20" label="One post from the MultiPostly composer publishing to six platforms">
      <div aria-hidden="true" className="absolute left-1/2 top-[38%] size-[52cqw] rounded-full bg-[radial-gradient(closest-side,rgba(255,170,120,.38),rgba(247,55,127,.12)_60%,transparent)] blur-2xl" style={{ translate: "-50% -50% -220px" }} />
      <svg aria-hidden="true" viewBox="0 0 1200 700" className="absolute inset-0 size-full overflow-visible">
        <defs><radialGradient id="hero-pulse"><stop offset="0" stopColor="#fff" /><stop offset=".3" stopColor="#ff7a5c" /><stop offset="1" stopColor="#f7377f" stopOpacity="0" /></radialGradient></defs>
        {cards.map(c => <path key={c.id} d={pathFor(c.side, c.y)} pathLength={1} className="hero-line" fill="none" stroke="#141414" strokeOpacity=".22" strokeWidth="1.25" />)}
        {cards.map(c => <circle key={c.id} cx={c.side === "l" ? 300 : 900} cy={c.y} r="3.5" fill="#f8f6f1" stroke="#141414" strokeOpacity=".35" strokeWidth="1.25" className="hero-node" />)}
        <g className="hero-pulses">
          {cards.map(c => { const begin = `${(wordAt(order.indexOf(c.id)) - .3).toFixed(2)}s`; return <g key={c.id} opacity="0">
            <circle r="13" fill="url(#hero-pulse)" opacity=".6" /><circle r="3" fill="#fff" />
            <animateMotion dur="2.4s" begin={begin} repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.25;1" calcMode="linear" path={pathFor(c.side, c.y)} />
            <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.04;.22;.27;1" dur="2.4s" begin={begin} repeatCount="indefinite" />
          </g>; })}
        </g>
      </svg>

      <div className="anim-rise absolute left-[37.5%] top-[5%] w-[25%]" style={{ ...at(.15), translate: "0 0 90px" }}><Phone screen="compose" priority sizes="300px" /></div>

      {cards.map(c => { const i = order.indexOf(c.id), live = wordAt(i) + .3; return <div key={c.id} className="hero-card anim-fade absolute" style={{ left: c.side === "l" ? "3%" : "75%", top: `${((c.y - 64) / 700) * 100}%`, ...at(.45 + i * .06) }}>
        <div className="hero-card-hit flex h-full gap-[1cqw] rounded-[1.2cqw] bg-paper p-[1cqw] shadow-[0_20px_40px_-30px_rgba(20,20,20,.45)] ring-1 ring-ink/10" style={at(live)}>
          <div className="relative aspect-square h-full shrink-0 overflow-hidden rounded-[.7cqw]"><Image src="/images/creator-hands.webp" alt="" fill sizes="104px" className="object-cover" /></div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-[.5cqw]">
              <span className="[&_svg]:size-[1.3cqw]" style={{ color: platform(c.id).color }}><PlatformIcon id={c.id} /></span>
              <span className="text-[1.08cqw] font-semibold">{platform(c.id).name}</span>
              <span className="hero-live ml-auto inline-flex items-center gap-[.3cqw] rounded-full bg-emerald-50 px-[.6cqw] py-[.2cqw] text-[.85cqw] font-semibold text-emerald-700" style={at(live)}><Check className="size-[.9cqw]" strokeWidth={3} />Live</span>
            </div>
            <p className="mt-[.6cqw] line-clamp-2 text-[1.02cqw] leading-[1.35] text-ink-2">{c.caption}</p>
            <p className="mt-auto truncate text-[.85cqw] text-ink-3">@studio · {c.meta}</p>
          </div>
        </div>
      </div>; })}

      {reactions.map(r => { const Icon = r.icon; return <div key={r.id} className="hero-live absolute" style={{ left: `${r.left}%`, top: `${r.top}%`, translate: `0 0 ${r.z}px`, ...at(wordAt(order.indexOf(r.id)) + .45) }}>
        <span className="hero-bob inline-flex items-center gap-[.5cqw] whitespace-nowrap rounded-full bg-paper py-[.55cqw] pl-[.7cqw] pr-[1cqw] text-[1.05cqw] font-semibold shadow-[0_18px_36px_-14px_rgba(20,20,20,.45)] ring-1 ring-ink/10" style={{ animationDelay: `${-r.z / 60}s` }}>
          <span className="grid size-[1.9cqw] place-items-center rounded-full text-white" style={{ background: platform(r.id).color }}><Icon className="size-[1cqw]" strokeWidth={2.6} fill={r.icon === Heart || r.icon === Play ? "currentColor" : "none"} /></span>{r.text}
        </span>
      </div>; })}
    </Stage3D>

    {/* Mobile stage */}
    <Stage3D className="hero-stage relative mx-auto mt-12 aspect-[375/520] w-full max-w-[420px] md:hidden" label="One post from the MultiPostly composer publishing to six platforms">
      <div className="anim-rise absolute left-[23%] top-[3%] w-[54%]" style={{ ...at(.15), translate: "0 0 20px" }}><Phone screen="compose" priority sizes="220px" /></div>
      {cards.map((c, i) => <span key={c.id} className="hero-live absolute" style={{ left: c.side === "l" ? "3%" : "81%", top: `${12 + Math.floor(i / 2) * 25}%`, translate: "0 0 80px", ...at(wordAt(order.indexOf(c.id)) + .3) }}>
        <span className="block rounded-[30%] bg-paper p-1 shadow-[0_12px_28px_-14px_rgba(20,20,20,.5)] ring-1 ring-ink/10"><PlatformBadge id={c.id} size={44} /></span>
        <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-canvas"><Check size={11} strokeWidth={3.5} aria-hidden="true" /></span>
      </span>)}
    </Stage3D>
  </section>;
}
