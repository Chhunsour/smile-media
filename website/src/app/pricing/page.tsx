import { Button, CheckItem, FinalCTA, PageHero } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Pricing", "Preview MultiPostly plans for creators and studios. Launch pricing may change; no payment is collected on this website.", "/pricing");

const plans = [
  { name: "Starter", price: "0", description: "For getting your first posts out everywhere.", items: ["Publish to all six platforms", "Drafts and caption templates", "Publishing results per channel"] },
  { name: "Creator", price: "12", description: "For a steady, consistent publishing rhythm.", items: ["Everything in Starter", "Scheduling and calendar", "AI caption assistance", "Insights across platforms"], featured: true },
  { name: "Studio", price: "29", description: "For teams and brands with bigger workflows.", items: ["Everything in Creator", "More connected accounts", "Higher publishing limits", "Priority support"] },
];

export default function Pricing() {
  return <>
    <PageHero name="Pricing" path="/pricing" title={<>Simple plans.<br />Every platform.</>} description="Start free and upgrade when your rhythm grows." >
      <p className="mt-6 text-[13px] text-ink-3">Preview pricing — final plans are confirmed at launch.</p>
    </PageHero>
    <section className="wrap grid items-stretch gap-4 lg:grid-cols-3">
      {plans.map((p, i) => <Reveal key={p.name} delay={i * .06} className={`relative flex flex-col overflow-hidden rounded-[32px] p-8 md:p-10 ${p.featured ? "bg-night text-white" : "bg-white ring-1 ring-line"}`}>
        {p.featured && <div aria-hidden="true" className="absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(247,55,127,.45),transparent)] blur-xl" />}
        <div className="relative flex items-center justify-between"><h2 className="text-xl font-semibold tracking-[-.02em]">{p.name}</h2>{p.featured && <span className="bg-brand rounded-full px-3 py-1 text-[12px] font-semibold">Recommended</span>}</div>
        <p className={`relative mt-2 text-[15px] ${p.featured ? "text-white/65" : "text-ink-2"}`}>{p.description}</p>
        <p className="relative mt-8 flex items-baseline gap-1.5"><span className="font-display text-6xl font-semibold tracking-[-.05em]">${p.price}</span><span className={p.featured ? "text-white/55" : "text-ink-3"}>/ month</span></p>
        <ul className="relative mt-8 flex-1 space-y-3 text-[15px]">{p.items.map(item => <CheckItem key={item} dark={p.featured}>{item}</CheckItem>)}</ul>
        <Button variant={p.featured ? "brand" : "light"} className="relative mt-10 w-full">{p.price === "0" ? "Get started" : `Choose ${p.name}`}</Button>
      </Reveal>)}
    </section>
    <FinalCTA />
  </>;
}
