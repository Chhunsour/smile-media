"use client";

import { useEffect, useRef } from "react";
import { m, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

// Perspective wrapper for the hero scene: tilted back on arrival, flattens as it scrolls up,
// and turns gently toward the cursor. Children place themselves in depth with `translate: 0 0 Npx`.
export function Stage3D({ children, className = "", label }: { children: React.ReactNode; className?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.2"] });
  const tilt = useTransform(scrollYProgress, [0, 1], [26, 3]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  const mx = useSpring(0, { stiffness: 90, damping: 18, mass: 0.6 });
  const my = useSpring(0, { stiffness: 90, damping: 18, mass: 0.6 });
  const rotateX = useTransform([tilt, my], ([t, y]: number[]) => t - y * 5);
  const rotateY = useTransform(mx, x => x * 8);

  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => { mx.set(e.clientX / innerWidth * 2 - 1); my.set(e.clientY / innerHeight * 2 - 1); };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduced, mx, my]);

  return <div ref={ref} className={className} style={{ perspective: 2200, perspectiveOrigin: "50% 30%" }} role="img" aria-label={label}>
    <m.div className="relative size-full" style={reduced ? undefined : { rotateX, rotateY, scale, transformStyle: "preserve-3d" }}>{children}</m.div>
    {/* Fade the bottom into the page; an overlay (not a mask) so nothing in front of the plane gets clipped. */}
    <div aria-hidden="true" className="pointer-events-none absolute -inset-x-[6%] -bottom-[26%] h-[58%] bg-gradient-to-t from-canvas from-45% via-canvas/85 to-transparent" />
  </div>;
}
