import { Button } from "@/components/ui";

export default function NotFound() {
  return <section className="wrap py-32 text-center md:py-44">
    <p className="text-gradient font-display text-[clamp(5rem,14vw,10rem)] font-semibold leading-none tracking-[-.06em]">404</p>
    <h1 className="mt-6 text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-.04em]">This page took a detour.</h1>
    <p className="mt-4 text-lg text-ink-2">The page you’re looking for isn’t here.</p>
    <Button href="/" className="mt-10">Back to home</Button>
  </section>;
}
