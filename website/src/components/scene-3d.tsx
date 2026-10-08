"use client";

import { useEffect, useRef } from "react";
import { m, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

// Perspective camera for the hero: leans toward the cursor and tips forward as the page scrolls.
export function Scene3D({ children, className = "", label }: { children: React.ReactNode; className?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const mx = useSpring(0, { stiffness: 70, damping: 18, mass: 0.7 });
  const my = useSpring(0, { stiffness: 70, damping: 18, mass: 0.7 });
  const rotateX = useTransform([scrollYProgress, my], ([s, y]: number[]) => s * 16 - y * 5);
  const rotateY = useTransform(mx, x => x * 10);
  const y = useTransform(scrollYProgress, [0, 1], [0, 60]);

  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => { mx.set(e.clientX / innerWidth * 2 - 1); my.set(e.clientY / innerHeight * 2 - 1); };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduced, mx, my]);

  return <div ref={ref} className={className} style={{ perspective: 1800, perspectiveOrigin: "50% 30%" }} role="img" aria-label={label}>
    <m.div className="absolute inset-0" style={reduced ? { transformStyle: "preserve-3d" } : { rotateX, rotateY, y, transformStyle: "preserve-3d" }}>{children}</m.div>
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-night/90 to-transparent" />
  </div>;
}
