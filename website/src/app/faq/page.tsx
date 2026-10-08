import { FAQ, FinalCTA, PageHero } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Frequently asked questions", "Direct answers about MultiPostly’s supported platforms, captions, scheduling, publishing failures, AI tools, pricing, and app availability.", "/faq");

export default function FAQPage() {
  return <>
    <PageHero name="FAQ" path="/faq" title={<>Good questions, <span className="accent">straight answers.</span></>} description="Everything you might want to know about MultiPostly, what it can do, and how it works." />
    <section className="wrap grid md:grid-cols-12"><div className="md:col-span-9 md:col-start-4"><FAQ all /></div></section>
    <FinalCTA />
  </>;
}
