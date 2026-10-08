import { Button } from "@/components/ui";

export default function NotFound() {
  return <section className="wrap py-32 text-center md:py-44">
    <p className="accent text-[clamp(6rem,16vw,12rem)] leading-none text-ink-3">404</p>
    <h1 className="display mt-6 text-[clamp(2.25rem,4.4vw,3.5rem)]">This page took a detour.</h1>
    <p className="mt-4 text-lg text-ink-2">The page you’re looking for isn’t here.</p>
    <Button href="/" className="mt-10">Back to home</Button>
  </section>;
}
