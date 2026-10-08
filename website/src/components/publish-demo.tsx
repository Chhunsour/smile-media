"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, RotateCcw } from "lucide-react";
import { platforms, type PlatformId } from "@/lib/content";
import { PlatformBadge } from "./ui";

const STEP_MS = 420;

export function PublishDemo() {
  const [selected, setSelected] = useState<PlatformId[]>(platforms.map(p => p.id));
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [done, setDone] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const autoplayed = useRef(false);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clear, []);

  function publish(count = selected.length) {
    clear();
    setDone(0);
    setPhase("running");
    for (let i = 1; i <= count; i++) timers.current.push(setTimeout(() => setDone(i), 500 + i * STEP_MS));
    timers.current.push(setTimeout(() => setPhase("done"), 700 + count * STEP_MS));
  }

  // Play once when the card scrolls into view, unless the visitor prefers less motion.
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || autoplayed.current) return;
      autoplayed.current = true;
      timers.current.push(setTimeout(() => publish(platforms.length), 600));
      io.disconnect();
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: PlatformId) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const order = platforms.filter(p => selected.includes(p.id)).map(p => p.id);

  return <div ref={root} className="grid gap-3 rounded-[28px] bg-paper p-3 shadow-[0_40px_80px_-50px_rgba(20,20,20,.35)] ring-1 ring-ink/10 md:rounded-[32px] lg:grid-cols-[1fr_1.1fr]">
    <div className="rounded-[20px] bg-mist p-5 md:rounded-[24px] md:p-7">
      <div className="flex items-center gap-3">
        <Image src="/images/avatar-creator.webp" width={40} height={40} alt="" className="size-10 rounded-full object-cover" />
        <div className="leading-tight"><p className="text-[15px] font-semibold">Your studio</p><p className="text-[13px] text-ink-3">New post · Draft</p></div>
        <span className="ml-auto rounded-full bg-paper px-3 py-1 text-[12px] font-medium text-ink-2 ring-1 ring-ink/10">{selected.length} channels</span>
      </div>
      <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-[20px]">
        <Image src="/images/creator-hands.webp" alt="A creator holding a camera, ready to film" fill sizes="(max-width: 1024px) 90vw, 520px" className="object-cover" />
      </div>
      <p className="mt-5 text-[17px] font-medium leading-snug tracking-[-.01em]">A little behind the scenes. A lot of what’s next. ✨</p>
      <p className="mt-2 text-[15px] text-pink">#behindthescenes #createeveryday</p>
    </div>

    <div className="flex flex-col p-3 md:p-5">
      <div className="mb-3 flex items-baseline justify-between px-2"><p className="text-[14px] font-medium">Publish to</p><p className="text-[13px] text-ink-3">{selected.length} of {platforms.length} selected</p></div>
      <ul className="flex-1 space-y-1">
        {platforms.map(p => {
          const on = selected.includes(p.id);
          const idx = order.indexOf(p.id);
          const live = phase === "done" ? on : phase === "running" && idx >= 0 && idx < done;
          const posting = phase === "running" && idx === done;
          return <li key={p.id}>
            <button type="button" disabled={phase === "running"} aria-pressed={on} onClick={() => { if (phase === "done") setPhase("idle"); toggle(p.id); }} className="flex w-full items-center gap-4 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-mist disabled:hover:bg-transparent">
              <span className={`transition-opacity ${on ? "" : "opacity-40"}`}><PlatformBadge id={p.id} size={42} /></span>
              <span className={`flex-1 leading-tight transition-opacity ${on ? "" : "opacity-40"}`}><span className="block text-[15px] font-medium">{p.name}</span><span className="block text-[13px] text-ink-3">{p.detail}</span></span>
              <span className="flex h-7 min-w-[86px] items-center justify-end text-[13px] font-medium">
                {live ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700"><Check size={13} strokeWidth={3} aria-hidden="true" />Live</span>
                  : posting ? <span className="inline-flex items-center gap-2 text-ink-2"><span className="size-3.5 animate-spin rounded-full border-2 border-line border-t-ink" aria-hidden="true" />Posting</span>
                  : phase === "running" && on ? <span className="text-ink-3">Queued</span>
                  : <span aria-hidden="true" className={`relative h-6 w-10 rounded-full transition-colors duration-300 ${on ? "bg-ink" : "bg-line"}`}><span className={`absolute top-1 size-4 rounded-full bg-white shadow transition-[left] duration-300 ${on ? "left-5" : "left-1"}`} /></span>}
              </span>
            </button>
          </li>;
        })}
      </ul>
      <button type="button" disabled={phase === "running" || !selected.length} onClick={() => publish()} className="mt-4 flex h-13 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-white transition-colors hover:bg-black disabled:opacity-70">
        {phase === "running" ? `Publishing… ${done}/${selected.length}` : phase === "done" ? <><RotateCcw size={15} aria-hidden="true" />Run it again</> : `Publish to ${selected.length} ${selected.length === 1 ? "platform" : "platforms"}`}
      </button>
      <p className="mt-3 text-center text-[12.5px] text-ink-3" aria-live="polite">{phase === "done" ? `Done — live on ${selected.length} platforms in this preview.` : "Interactive preview. Nothing is posted."}</p>
    </div>
  </div>;
}
