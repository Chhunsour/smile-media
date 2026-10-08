"use client";

import { LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  // reducedMotion="user" drops the movement for reduced-motion visitors and keeps a plain fade.
  return <LazyMotion features={domAnimation}><MotionConfig reducedMotion="user">{children}</MotionConfig></LazyMotion>;
}

export function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <m.div data-reveal className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.9, delay, ease: [0.2, 0.7, 0.2, 1] }}>{children}</m.div>;
}

// Image unmask: the frame opens from a smaller inset as it scrolls into view.
export function Unmask({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <m.div data-unmask className={className} initial={{ clipPath: "inset(12% 9% 12% 9% round 28px)" }} whileInView={{ clipPath: "inset(0% 0% 0% 0% round 22px)" }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 1.2, delay, ease: [0.2, 0.7, 0.2, 1] }}>{children}</m.div>;
}
