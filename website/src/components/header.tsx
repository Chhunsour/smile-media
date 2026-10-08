"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { SmartLink } from "@/components/ui";

const links = [["Features", "/features/"], ["Platforms", "/platforms/"], ["Pricing", "/pricing/"], ["FAQ", "/faq/"]];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const path = usePathname();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const current = (href: string) => path.replace(/\/$/, "") === href.replace(/\/$/, "");
  return <header className={`sticky top-0 z-50 transition-[background,border-color,box-shadow] duration-300 ${scrolled || open ? "border-b border-line bg-canvas/80 backdrop-blur-xl backdrop-saturate-150" : "border-b border-transparent"}`}>
    <div className="wrap flex h-[68px] items-center gap-8">
      <Link prefetch={false} href="/" onClick={() => setOpen(false)} aria-label="MultiPostly home" className="flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-[-.03em]">
        <Image src="/images/logo.webp" width={30} height={30} alt="" priority className="rounded-[9px]" />MultiPostly
      </Link>
      <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
        {links.map(([label, href]) => <Link prefetch={false} key={href} href={href} aria-current={current(href) ? "page" : undefined} className={`rounded-full px-3.5 py-2 text-[14.5px] transition-colors hover:text-ink ${current(href) ? "text-ink" : "text-ink-2"}`}>{label}</Link>)}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <SmartLink href="/app/" className="hidden rounded-full px-4 py-2 text-[14.5px] text-ink-2 transition-colors hover:text-ink sm:block">Try in browser</SmartLink>
        <Link prefetch={false} href="/download/" className="hidden h-10 items-center rounded-full bg-ink px-5 text-[14.5px] font-medium text-white transition hover:bg-black sm:inline-flex">Get the app</Link>
        <button type="button" className="grid size-10 place-items-center rounded-full ring-1 ring-line md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>{open ? <X size={19} /> : <Menu size={19} />}</button>
      </div>
    </div>
    <nav id="mobile-nav" aria-label="Mobile" hidden={!open} className="wrap pb-6 md:hidden">
      <ul className="divide-y divide-line border-t border-line">
        {[...links, ["Try in browser", "/app/"]].map(([label, href]) => <li key={href}><SmartLink href={href} onClick={() => setOpen(false)} className="block py-4 font-display text-xl font-medium tracking-[-.02em]">{label}</SmartLink></li>)}
      </ul>
      <Link prefetch={false} href="/download/" onClick={() => setOpen(false)} className="mt-4 flex h-12 items-center justify-center rounded-full bg-ink font-medium text-white">Get the app</Link>
    </nav>
  </header>;
}
