import Image from "next/image";
import { FAQ, FinalCTA, JsonLd, PlatformTable, SectionHead, TextLink } from "@/components/ui";
import { Reveal, Unmask } from "@/components/motion";
import { PublishDemo } from "@/components/publish-demo";
import { Hero } from "@/components/hero";
import { FeatureTour } from "@/components/feature-tour";
import { pageMetadata, siteDescription, siteUrl } from "@/lib/seo";

export const metadata = pageMetadata("Create once. Post everywhere.", siteDescription);

const people = [
  { image: "podcaster", alt: "A podcaster recording a conversation", who: "Podcasters", line: "One episode, every feed.", span: "md:col-span-7 md:row-span-2", aspect: "aspect-[4/5] md:aspect-auto md:min-h-0 md:flex-1" },
  { image: "food-creator", alt: "A food creator preparing a dish", who: "Food creators", line: "Recipes made to travel.", span: "md:col-span-5", aspect: "aspect-[4/3]" },
  { image: "musician", alt: "A musician recording in a studio", who: "Musicians", line: "Your next sound, everywhere.", span: "md:col-span-5", aspect: "aspect-[4/3]" },
  { image: "shop-owner", alt: "A shop owner welcoming a customer", who: "Small businesses", line: "Beyond the shopfront.", span: "md:col-span-4", aspect: "aspect-[4/5]" },
  { image: "vlogger", alt: "A vlogger filming at home", who: "Vloggers", line: "The next episode starts here.", span: "md:col-span-4", aspect: "aspect-[4/5]" },
  { image: "travel-creator", alt: "A traveler looking across mountains", who: "Travel creators", line: "Take your audience along.", span: "md:col-span-4", aspect: "aspect-[4/5]" },
];

export default function Home() {
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": ["SoftwareApplication", "MobileApplication"], "@id": `${siteUrl}/#app`, name: "MultiPostly", applicationCategory: "SocialNetworkingApplication", operatingSystem: "iOS, Android", url: siteUrl, description: siteDescription, featureList: "Multi-platform publishing, per-platform captions, scheduling, saved templates, AI caption assistance, publishing status, reach and engagement insights", screenshot: `${siteUrl}/screens/compose.webp`, publisher: { "@id": `${siteUrl}/#organization` } }} />

    <Hero />

    {/* Statement: words ink in as they scroll into view */}
    <section className="wrap py-24 md:py-40">
      <p className="statement display max-w-[17ch] text-[clamp(2.4rem,6vw,5.5rem)] leading-[.98]">
        {"Stop copy-pasting the same post six times. Write it once and get back to".split(" ").map((w, i) => <span key={i}>{w} </span>)}
        <span className="accent">making things.</span>
      </p>
    </section>

    <section id="features" className="wrap">
      <SectionHead index="01" label="The app" title={<>Everything between the idea <span className="accent">and the audience.</span></>} />
      <FeatureTour />
    </section>

    <section id="try" className="wrap pt-28 md:pt-40">
      <SectionHead index="02" label="Try it" title={<>Flip a switch. <span className="accent">Hit publish.</span></>} body="This is how publishing feels in MultiPostly: every channel reports back on its own. Toggle a few, then press the button." />
      <Reveal className="mt-14 md:mt-20"><PublishDemo /></Reveal>
    </section>

    <section id="platforms" className="wrap pt-28 md:pt-40">
      <SectionHead index="03" label="Platforms" title={<>Six platforms. <span className="accent">One button.</span></>} />
      <div className="mt-14 md:mt-20"><PlatformTable /></div>
      <div className="mt-8"><TextLink href="/platforms/">Account requirements</TextLink></div>
    </section>

    <section className="wrap pt-28 md:pt-40">
      <SectionHead index="04" label="Who it’s for" title={<>Made for people <span className="accent">who make things.</span></>} />
      <div className="mt-14 grid gap-x-5 gap-y-8 md:mt-20 md:grid-cols-12">
        {people.map((p, i) => <figure key={p.image} className={`flex flex-col ${p.span}`}>
          <Unmask delay={(i % 3) * .08} className={`relative overflow-hidden ${p.aspect}`}>
            <Image src={`/images/${p.image}.webp`} alt={p.alt} fill sizes={i === 0 ? "(max-width: 768px) 100vw, 720px" : "(max-width: 768px) 100vw, 500px"} className="object-cover" />
          </Unmask>
          <figcaption className="mt-3 flex items-baseline justify-between gap-4 text-[14.5px]"><span className="font-medium">{p.who}</span><span className="accent text-[17px] text-ink-2">{p.line}</span></figcaption>
        </figure>)}
      </div>
    </section>

    <section id="faq" className="wrap pt-28 md:pt-40">
      <SectionHead index="05" label="FAQ" title={<>Good questions, <span className="accent">straight answers.</span></>} />
      <div className="mt-14 grid md:mt-20 md:grid-cols-12"><div className="md:col-span-9 md:col-start-4"><FAQ /><div className="mt-8"><TextLink href="/faq/">All questions</TextLink></div></div></div>
    </section>

    <FinalCTA />
  </>;
}
