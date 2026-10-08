import { Button, Phone, PlatformIcon } from "@/components/ui";
import { Scene3D } from "@/components/scene-3d";
import { platforms, type PlatformId } from "@/lib/content";

const at = (s: number) => ({ animationDelay: `${s}s` });

// App-icon treatments, close to each platform's own icon.
const tileStyle: Record<PlatformId, React.CSSProperties> = {
  instagram: { background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)" },
  tiktok: { background: "#111" },
  youtube: { background: "#ff0033" },
  facebook: { background: "#1877f2" },
  x: { background: "#111" },
  telegram: { background: "linear-gradient(180deg, #37aee2, #1e96c8)" },
};

// Floating icons at different depths: near ones are large and sharp, far ones small and soft (depth of field).
const tiles: { id: PlatformId; x: number; y: number; z: number; size: number; far?: boolean; mx?: number }[] = [
  { id: "instagram", x: 8, y: 30, z: 220, size: 6.4, mx: 13 },
  { id: "facebook", x: 92, y: 38, z: 170, size: 6, mx: 87 },
  { id: "youtube", x: 16, y: 78, z: 90, size: 5.4, mx: 15 },
  { id: "telegram", x: 85, y: 80, z: 130, size: 5.6, mx: 85 },
  { id: "tiktok", x: 24, y: 14, z: -360, size: 5, far: true },
  { id: "x", x: 78, y: 16, z: -400, size: 4.8, far: true },
];

export function Hero() {
  return <section className="px-2.5 pt-1 md:px-4">
    <div className="relative isolate overflow-hidden rounded-[28px] bg-night text-white md:rounded-[40px]">
      <div aria-hidden="true" className="hero-light" />
      <div aria-hidden="true" className="hero-grain" />

      <div className="relative mx-auto max-w-5xl px-5 pt-16 text-center md:pt-20">
        <h1 className="display text-[clamp(2.75rem,8.2vw,7rem)] leading-[.9]">
          <span className="anim-lift block">Create once.</span>
          <span className="anim-lift block" style={at(.08)}>Post <span className="accent bg-[linear-gradient(100deg,#ffd2ae,#ff9d8c_45%,#ff8cbd)] bg-clip-text pr-[.06em] text-transparent">everywhere.</span></span>
        </h1>
        <p className="anim-fade mx-auto mt-7 max-w-[34rem] text-lg leading-relaxed text-white/65 md:text-xl" style={at(.16)}>Write one post, shape it for every channel, and publish to six platforms in a single tap.</p>
        <div className="anim-fade mt-9 flex flex-wrap justify-center gap-3" style={at(.24)}><Button variant="white">Get the app</Button><Button href="/app/" variant="glass">Try in browser</Button></div>
        <div className="anim-fade mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-white/45" style={at(.32)}>
          <span className="text-[13px]">Publishes to</span>
          {platforms.map(p => <span key={p.id} title={p.name} className="transition-colors hover:text-white"><PlatformIcon id={p.id} size={18} /></span>)}
        </div>
      </div>

      <Scene3D className="hero-stage relative mx-auto mt-10 w-full max-w-[1200px] md:mt-12" label="MultiPostly on three phones: composing a post, the post live on every channel, and its insights">
        <div className="hp hp-l"><div className="anim-rise" style={at(.4)}><Phone screen="compose" glare sizes="(max-width: 768px) 160px, 240px" /></div></div>
        <div className="hp hp-r"><div className="anim-rise" style={at(.5)}><Phone screen="insights" glare sizes="(max-width: 768px) 160px, 240px" /></div></div>
        <div className="hp hp-c"><div className="anim-rise" style={at(.25)}><Phone screen="publishing" glare priority sizes="(max-width: 768px) 220px, 300px" /></div></div>

        {tiles.map((t, i) => <div key={t.id} className={`absolute left-[var(--x)] max-md:left-[var(--mx)] ${t.far ? "max-md:hidden" : ""}`} style={{ "--x": `${t.x}%`, "--mx": `${t.mx ?? t.x}%`, top: `${t.y}%`, width: `${t.size}cqw`, translate: `-50% -50% ${t.z}px` } as React.CSSProperties}>
          <div className="anim-fade max-md:scale-[1.7]" style={at(.7 + i * .08)}>
            <div className="hero-bob aspect-square" style={{ animationDelay: `${-i * 1.3}s`, filter: t.far ? "blur(.22cqw)" : undefined, opacity: t.far ? .75 : 1 }}>
              <div className="app-tile" style={tileStyle[t.id]}>
                <span className={`size-[46%] [&_svg]:size-full ${t.id === "youtube" ? "[&_path:last-child]:fill-[#ff0033]" : ""}`} style={t.id === "tiktok" ? { filter: "drop-shadow(-.12cqw -.08cqw 0 #25f4ee) drop-shadow(.12cqw .08cqw 0 #fe2c55)" } : undefined}><PlatformIcon id={t.id} /></span>
              </div>
            </div>
          </div>
        </div>)}
      </Scene3D>
    </div>
  </section>;
}
