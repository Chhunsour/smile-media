# MultiPostly website — phase 1, manager round 4

## Round 4 — browser animation opacity

Insights placed its entire chart/card/stat stack inside one `Animated.View` with `entering={FadeIn.duration(220)}`. A stalled browser entering animation therefore fades all of that content together while the header stays readable. The previous functional checks only checked visible headings and interactions, so they did not guard against this failure. The local browser completed the old fade normally; the regression check additionally reproduces the reported 15% parent opacity deliberately and verifies that it is rejected.

`scripts/build-web-app.mjs` now applies `scripts/web-patches/skip-layout-motion.mjs` **only inside its temporary Expo copy**. It parses JSX and guards every Reanimated `entering`, `exiting`, and `layout` prop with `Platform.OS === 'web' ? undefined : originalExpression`. On web the views mount at their authored final opacity and position, without a reveal animation to get stuck. Native expressions remain intact. This covers **23 wrappers / 27 animation props in 12 files**, including conditional Calendar transitions, filter-keyed Posts/Insights content, composer previews, checks, and toast feedback. The export records the exact files/props in `public/app/build-info.json`; the build fails if the expected Insights guard cannot be found.

Copy-only files to consider for upstream platform guards:

- `src/app/insights.tsx`: the parent FadeIn around the chart and all stat tiles.
- `src/app/(tabs)/index.tsx`, `posts.tsx`, `calendar.tsx`: Home card entrances, post filter/list-grid remounts, and month changes.
- `src/app/compose/index.tsx`, `ai.tsx`, `review.tsx`: media/channels layout transitions, AI results, and platform preview changes.
- `src/app/connections.tsx`, `templates.tsx`: account/card layout transitions and expanded/new content.
- `src/app/publishing/[id].tsx`, `sign-in.tsx`: status-orb and authentication entrances/layout transitions.
- `src/components/ui.tsx`: selected-check and toast entrances/exits.

The check script now examines **computed opacity of main cards, content wrappers, explicit content probes, and every ancestor up to the document root**. It also rejects hidden content, non-final wrapper transforms, and paused/running/retained content animations. It checks twice after a short navigation allowance rather than relying on screenshots or an opaque header. Intentional translucent chart bars, outside-month dates, decorative pulses, and disabled controls retain their original styles; their containing content must still have opacity **1**. A negative control temporarily sets the actual Insights stack to **0.15**, confirms detection, and restores it before further checks.

`npm run check:app` audits all ten requested screens at **390×844** by trailing-slash direct URL and by actual in-app navigation: Home, Posts, Compose, Publishing, Calendar, Connections, Insights, Templates, Settings/You (`/app/profile/`), and Post detail. It also covers direct/navigation loads of composer Media, Accounts, AI, Review, and Schedule, plus the template editor, Insights' three periods, post filters/list-grid changes, month changes, platform preview changes, and newly created publishing/post deep links. Direct Insights is checked after **10.5 seconds idle**, including the lower stat stack. The app intentionally keeps the unsaved working draft in memory: cold AI/Review URLs show their normal “write something first” / “no channels selected” states, while navigation checks use a populated draft and generated results. Saved posts and drafts retain the existing demo persistence. Authentication/OAuth routes redirect to Home/Connections in the authenticated demo and are checked as redirects.

Review captures and detailed computed-style results are in **[qa/app-screens/README.md](qa/app-screens/README.md)**. Rebuild with `npm run build:app && npm run build`, start `npm run preview`, then run `npm run check:app` in a second terminal. This round changes only the app export and QA/build scripts; marketing page code and its round-3 Lighthouse measurements below are unchanged.

## Run locally

From the repository root:

```sh
cd website
npm ci
npm run dev
```

Open http://localhost:3000. Development uses polling file watchers for external drives and restricted macOS environments. For the production static export:

```sh
npm run build:all
npm run preview
```

The deployable directory is `website/out/`, including the real Expo app at `/app/`. Serve directory indexes and the generated `404.html`, with the app-only fallback described below. There is no Next.js server or backend required for the demo. `npm run build` builds the marketing site using the current app bundle; `npm run build:all` first refreshes that bundle from the repository’s existing app. After an app-only rebuild, run `npm run build` again before deploying `out/`.

Validation commands are `npm run lint` and `npm run typecheck`. Run `npm run check:app` to exercise the real demo on 390px mobile and 1440px desktop, including the full mobile opacity and screenshot audit. Browser checks use `npm run check` against a running production preview. Install the optional browser with `npm exec -- playwright install chromium --only-shell`; set `PLAYWRIGHT_BROWSERS_PATH` or `CHROME_PATH` if using a non-default browser location. `npm run audit` audits the running preview using normal Chrome with `--headless=new` and Lighthouse’s default mobile throttling. Set `CHROME_PATH` to a full Chrome executable if necessary. Both check scripts accept `CHECK_SITE_URL`. The audit exits unsuccessfully if any category is missing or below 90.

For an optional normal-Chrome Linux audit (Docker must share the project directory):

```sh
docker build -f scripts/lighthouse-alpine.Dockerfile -t multipostly-lighthouse .
docker run --rm -v "$PWD/out:/site:ro" -v "$PWD/qa:/reports" -v "$PWD/scripts/audit-container.sh:/audit.sh:ro" multipostly-lighthouse sh /audit.sh
```

Replace `audit-container.sh` with `audit-pages.sh` in both mount paths to audit the seven interior pages. Reports are saved in `qa/`. The small Docker build context excludes application dependencies and assets.

## Real browser app and hosting

```sh
cd website
npm run build:app       # Expo export only, into public/app/
npm run build:all       # Expo export, then Next static export into out/
npm run preview        # Production preview with /app deep-link fallback
```

Open http://localhost:3000/app/. `npm run dev` also serves `/app/` and its deep links through a development-only rewrite once the bundle exists. The hero, desktop/mobile navigation, and footer link to the browser app using full document navigation, keeping the Expo bundle out of marketing-page downloads.

`scripts/build-web-app.mjs` copies the existing app’s source, assets, package/lock files, and build configuration into an OS temporary directory. It creates a public web configuration in that copy with `experiments.baseUrl: '/app'` and `web.output: 'single'`, sets `EXPO_PUBLIC_APP_MODE=demo`, and invokes `npx expo export -p web` (or `bunx` for a Bun project). The existing Expo Router entry, navigation, components, providers, publishing engine, and seed library are used. There is no app rewrite or HTML screen reconstruction.

Dependencies are installed with `npm ci` in a separate temporary cache keyed by the app lockfile. First use needs network access and can take a few minutes. Future exports reuse that exact installation. No root dependency installation, configuration, source, environment file, live credentials, or native folders are changed. Inherited public Expo environment variables are removed. Only public config fields are copied; native signing settings are excluded. Successful temporary source copies are removed; failed copies are retained with their path for diagnosis. Optional `KEEP_EXPO_WEB_TEMP=1` retains a successful copy, and `EXPO_WEB_NODE_MODULES` can point to an isolated dependency cache with an identical lockfile; repository dependencies are rejected.

The exported Expo HTML receives a small persistent **“Demo — get the app to connect your real accounts”** banner with marketing/download links. The app uses the remaining viewport on both mobile and desktop, with its own web layout. Demo content persists in browser storage under a separate MultiPostly namespace. New demo publishing defaults to **Never** fail; visitors can still choose failure simulations in You. The browser app is marked `noindex,follow`; it is excluded from marketing Lighthouse audits and the sitemap.

Common routes have physical exported index files, including `/app/compose/`, its substeps, all tabs, connections, templates, and insights. **Dynamic post and publishing IDs require an app-only SPA fallback**. Always serve existing files first, then return `/app/index.html` with HTTP 200 for unresolved `/app/*` routes. Keep marketing 404s intact. The supplied preview server does this and compresses text assets.

- Netlify / Cloudflare Pages: `public/_redirects`, copied into `out/_redirects`, contains `/app /app/index.html 200` and `/app/* /app/index.html 200` (unforced, so existing files win).
- Vercel: `website/vercel.json` builds `build:all`, serves `out/`, and checks the filesystem before the app fallback. Set the project root to `website` and include the parent app source in the build checkout, or deploy the prebuilt `out/` directory.
- Nginx equivalent: `location /app/ { try_files $uri $uri/ /app/index.html; }`, plus `location = /app { return 308 /app/; }`. Use normal directory-index/404 handling for the rest of the export.
- Other static hosts: configure the same app-only fallback. Hosts without rewrite support can serve the supplied fixed routes, but reloads of newly generated post IDs will fail.

### Copy-only web fixes to consider upstreaming

All patches are applied by the export script to the temporary source, never to the repository app. Templates for the browser adapters are in `scripts/web-patches/`.

| Source in the temporary copy | Fix and reason |
| --- | --- |
| `tailwind.config.js`, exported HTML | Use class dark mode and its NativeWind runtime flag; the original media/class mismatch throws when the app sets its color scheme. |
| `src/components/ui.tsx` | Guard GradientIcon and GradientText on web with CSS background-clip; the web MaskedView fallback otherwise shows dark gradient glyphs/text. Native mask branches remain. |
| `src/components/ui.tsx` | Keep opacity feedback but skip press scaling on web. Scaling a wide parent card on mouse-down moves its nested button outside the pointer, preventing desktop clicks. Native press scaling remains. |
| `_layout.tsx`, shared post actions, templates, composer, profile, connections, picker, post detail | Substitute a browser Alert adapter and render its dialog host. React Native’s native Alert implementation otherwise leaves save/discard, delete, disconnect, and reset actions without a usable web dialog. The same callbacks and actions are preserved. |
| `src/app/compose/schedule.tsx` | Guard the native time picker and use an HTML time input on web; the original non-iOS branch calls the Android picker on web. |
| `src/app/templates.tsx` | Avoid disabling the outer card on web when it has no insert action. A disabled web parent also disables the nested Delete button. |
| `src/lib/picker.ts` | Convert picked browser image blob URLs to data URLs before saving demo posts; blob URLs expire on document reload, unlike native demo file URIs. Video blobs retain the original behavior. |

Other copy-only choices: fictional **Prism / Creator** identities replace original demo labels; a separate browser storage namespace prevents old demo data from resurfacing; successful publishing is the default; the profile demo disclaimer accurately says that no real posts or account connections occur. Metro receives the isolated dependency directory as a watch/resolution path. Essential patch markers are checked so changed upstream source fails with a reviewable error rather than silently skipping a required adapter.

### Browser demo limits

Accounts, publishing, scheduling, analytics, and AI use the existing simulated demo providers. No live service or OAuth credential is included, and no real social post is sent. Scheduled items are a local demonstration rather than a background service. Demo “View on platform” results use illustrative URLs. Insights reflect the app’s sample history; new simulated posts start with zero real reach.

The seed video items are photographs used as covers, not playable video files, as in the existing demo. The browser file picker works for local photos; camera behavior uses the browser/device’s capture support rather than a guaranteed desktop webcam interface. Sharing requires browser support. Picked photos persist as data URLs; large uploads can exceed browser storage limits. Local video blob URLs do not survive reload, and the current app’s media UI does not provide a full video editor/player. Use the seeded library to explore the complete publishing flow. The app’s JavaScript and native icon fonts are intentionally larger than the marketing site and load only after entering `/app/`.

## Built

Redesigned on 2026-10-08 (replaces the round 1–4 dark visual layer).

- Standalone Next.js App Router, TypeScript, Tailwind CSS 4, Framer Motion. Static export to `out/`.
- Home, Features, Platforms, Pricing, FAQ, Privacy, Terms, Get the app, 404, plus the Expo demo at `/app/`.
- Home: centered hero with three real app screens rising out of a warm gradient stage, platform strip, auto-playing "publish to every platform" demo, feature bento, creator photo marquee, insights over studio photography, platform grid, FAQ, dark CTA.
- Motion is CSS keyframes for the hero (transform/opacity only) and Framer Motion fade-up reveals below the fold. `prefers-reduced-motion` drops movement and stops the marquee and floating chips.
- Per-page metadata, canonicals, Open Graph/Twitter cards, sitemap, robots, `llms.txt`, `llms-full.txt`, JSON-LD (Organization, SoftwareApplication, FAQPage, BreadcrumbList).
- Sample testimonials were removed. Pricing tiers are placeholders flagged "Preview pricing" on the page.

## Design choices

Light, warm editorial canvas (`#fbfaf7`) with ink text (`#111114`) so the dark app screens stand out in realistic phone frames. The orange→pink brand gradient (`#ff9f43 → #f7377f`) is reserved for the headline word, primary accents and CTAs. Dark (`#0d0d10`) is used for contrast bands: the creator marquee, AI card and final CTA. Sora for headlines (matches the app), Geist for body text.

## Real app screenshots

All eight screens in `public/screens/` are actual browser captures of the existing app: home, compose, publishing, connections, insights, templates, calendar, and posts. PNG originals were captured at **390×844, deviceScaleFactor 3**; responsive website WebPs are pre-sized at 390, 480, and 780 pixels wide. The browser selects the appropriate size for the phone frame and display density. No HTML app mockups were needed. Publishing shows an existing successfully published demo post; the composer uses a sample caption and the app’s media-library picker.

To protect the repository, the app source and configuration were copied unchanged to a temporary directory, with an isolated dependency installation. Expo SDK 57 ran there in demo mode on **8082**, with a separate temporary Metro cache. The user’s Metro on 8081 was not used. The capture server was stopped afterward.

Two browser-only capture adjustments were necessary: an inline NativeWind dark-mode flag fixed the web runtime’s media/class dark-mode mismatch; fictional account/workspace labels were substituted in the delivered JavaScript response. These did not alter app source or component layouts. Labels use **Prism Studio** and **Creator**; these are fictional. All metrics, account counts, and activity inside app screenshots are illustrative demo data. The app’s web MaskedView fallback rendered the small orange-to-pink icon masks black. In round 2, all eight screens were recaptured after restoring the gradient **only on the live capture DOM’s black Ionicons glyphs** using CSS background-clip. This corrected 36 glyphs while preserving the original app components, text, geometry, and data. No bitmap painting or HTML app mockup was used.

`scripts/capture-app.mjs` documents the capture procedure and expects an already running, isolated demo server on 8082. Chromium was run in a compatible single-process configuration because the workspace’s macOS restrictions prevent its normal subprocess bootstrap.

## Image and font credits

Photography was downloaded from Unsplash and converted to local WebP files, with compact AVIF versions for the six hero photographs. Every hero photo and above-the-fold phone screenshot uses eager loading, high fetch priority, and an explicit responsive preload. Tiny inline WebP thumbnails provide a blurred first paint without waiting for an image request or JavaScript. Native image backgrounds avoid expensive SVG blur filters; below-the-fold screens remain lazy. Route prefetching is disabled so it cannot start unrelated hero-image preloads. The originals are retained for reproducible processing. Sources are covered by the [Unsplash free license](https://unsplash.com/license); stock photography does not imply endorsement.

| File / use | Exact source |
| --- | --- |
| `creator-camera.webp` — hero photographer | [Unsplash photo 1492691527719-9d1e07e534b4](https://images.unsplash.com/photo-1492691527719-9d1e07e534b4) |
| `studio.webp` — recording studio banner | [Unsplash photo 1598488035139-bdbb2231ce04](https://images.unsplash.com/photo-1598488035139-bdbb2231ce04) |
| `creator-hands.webp` — interactive post photography | [Unsplash photo 1520390138845-fd2d229dd553](https://images.unsplash.com/photo-1520390138845-fd2d229dd553) |
| `vlogger.webp` — vlog audience tile, workflow, Features hero | [Unsplash photo 1758272421492-1efdb36a441f](https://images.unsplash.com/photo-1758272421492-1efdb36a441f) |
| `podcaster.webp` — podcast audience tile, FAQ hero | [Unsplash photo 1655947717064-d856af599bd1](https://images.unsplash.com/photo-1655947717064-d856af599bd1) |
| `food-creator.webp` — food audience tile, shared fan-out post | [Unsplash photo 1556910103-1c02745aae4d](https://images.unsplash.com/photo-1556910103-1c02745aae4d) |
| `musician.webp` — musician audience tile, platform previews | [Unsplash photo 1593697821252-0c9137d9fc45](https://images.unsplash.com/photo-1593697821252-0c9137d9fc45) |
| `shop-owner.webp` — business audience tile, platform previews | [Unsplash photo 1556742049-0cfed4f6a45d](https://images.unsplash.com/photo-1556742049-0cfed4f6a45d) |
| `travel-creator.webp` — travel audience tile, download hero, final CTA | [Unsplash photo 1537430802614-118bf14be50c](https://images.unsplash.com/photo-1537430802614-118bf14be50c) |
| `creator-team.webp` — team workflow and Pricing hero | [Unsplash photo 1522071820081-009f0129c71c](https://images.unsplash.com/photo-1522071820081-009f0129c71c) |
| `avatar-creator.webp` — sample creator quote portrait | [Unsplash photo 1534528741775-53994a69daeb](https://images.unsplash.com/photo-1534528741775-53994a69daeb) |
| `avatar-studio.webp` — sample studio quote portrait | [Unsplash photo 1506794778202-cad84cf45f1d](https://images.unsplash.com/photo-1506794778202-cad84cf45f1d) |
| `avatar-business.webp` — sample business quote portrait | [Unsplash photo 1531123897727-8f129e1688ce](https://images.unsplash.com/photo-1531123897727-8f129e1688ce) |

App captures also contain the existing demo library’s Unsplash photography. Visible examples include the [film projector](https://images.unsplash.com/photo-1478720568477-152d9b164e26), [kitchen](https://images.unsplash.com/photo-1556910103-1c02745aae4d), [abstract studio avatar](https://images.unsplash.com/photo-1563089145-599997674d42), and [stock portrait](https://images.unsplash.com/photo-1494790108377-be9c29b29330). Original photo identifiers remain in the app’s demo seed; no private user photographs were used.

The logo is supplied by the project at `assets/images/logo.png`. Icons and the OG card are derived locally from it. Sora is supplied by the project’s Google Fonts package and distributed under the SIL Open Font License, retained at `public/fonts/OFL.txt`. Lucide provides interface icons; compact inline social marks identify the supported integrations and belong to their respective owners.

Run `npm run assets` to recreate optimized images, screenshot WebPs, icons, favicon, and OG image from the retained originals. `node scripts/fetch-photos.mjs` re-downloads the ten round-2 photographs. Neither is required for a normal build.

Sora’s three font weights are served as losslessly compressed WOFF2: about 71 KB combined versus 174 KB for the source TTFs. The TTF originals and license remain available. Optional regeneration uses `scripts/prepare-fonts.py` with Python FontTools and Brotli installed in a temporary virtual environment.

## Placeholders, assumptions, and launch gaps

- Pricing tiers, USD prices, and plan groupings are explicitly marked **sample**. No checkout, subscriptions, or payment processing exists.
- Testimonials are explicitly marked **sample quotes** and use role descriptions and licensed stock portraits. The portraits do not depict actual customers or authors of these illustrative quotes. There are no invented customer counts or review ratings. The landing counters describe the product concept, not adoption or measured customer results.
- Verified app-store URLs and a release date were not provided. The Get the app page shows accurate unavailable states. Set `NEXT_PUBLIC_APP_STORE_URL` to an HTTPS `apps.apple.com` URL and `NEXT_PUBLIC_PLAY_STORE_URL` to an HTTPS `play.google.com` URL to enable the relevant link. Invalid or missing URLs remain unavailable. There is no fabricated download link or signup form.
- Set `NEXT_PUBLIC_SITE_URL` before building; it defaults to `https://multipostly.app`. Canonicals, sitemap, robots, structured data, and both AI-readable documents use this value. Environment changes require a fresh static build.
- Platform claims follow the six implemented integrations. Live publishing, scheduling, AI assistance, and analytics depend on backend configuration, approvals, permissions, account eligibility, and available metrics. This site does not certify production integration approval.
- Privacy and Terms transparently describe the phase-one preview. Final service-operator details, a privacy/support contact, retention periods, applicable rights procedures, jurisdiction, and final app terms need owner review before a public live-service launch.
- Marketing pages add no analytics, tracking scripts, cookies, collecting forms, or external font/image requests. The app demo stores entered sample content locally and loads the original library’s Unsplash photographs; Privacy and Terms describe this distinction. Deployment-provider logs and caching are controlled by the eventual host. Set long-lived cache headers for hashed `_next/static` files and sensible caching for media on that host.
- Only `website/` was changed in the repository. Existing changes elsewhere were preserved.

## Verification

- `cd website && npm run build:all` — passed with the isolated Expo export before Next. Final `npm run build:app` and `npm run build` also passed after the web adapters were finished, with all pages, discovery resources, and `/app/` statically exported.
- `npm run lint` — passed with zero warnings.
- `npm run typecheck` — passed.
- Hero first-paint checks — **16 passed**: every page at 390 and 1440 pixels with JavaScript disabled and image requests held for 2.1 seconds. Hero photos and phones retain visible inline blurred backgrounds and dimensions; eager loading, high fetch priority, responsive preloads, and final image decoding all passed. Privacy and Terms have no hero imagery.
- Round-4 mobile screen audit — **31 screenshots / opacity checks passed**, including every requested screen via direct URL and in-app navigation, all five composer subpages, and the template editor. Main-content opacity is **1** in both samples for every capture; no unfinished content animation or displaced wrapper was found. The 15% ancestor-opacity negative control was detected and restored. Screenshots are retained in `qa/app-screens/`, with exact routes and node counts in its `results.json`.
- Real Expo app checks — **37 passed, zero console errors**, now with computed content-opacity/animation assertions on every functional check at 390 and 1440 pixels: all four tabs, connections and cancel dialog, template create/delete, reset confirmation, AI application, compose/media/preview/publish to three channels, persisted publishing deep-link reload, posts, schedule/time input, and direct compose/insights/templates/connections routes. A picked photo also survives a post deep-link reload. No live backend requests occurred.
- Production browser checks — **64 passed, zero failures**: all eight pages at 375, 390, 768, 900, 1024, 1280, 1440, and 1920 pixels. No horizontal overflow, broken images, or browser errors.
- Axe WCAG A/AA checks — **zero violations** across all pages at both 375 and 1440 pixels. Keyboard FAQ operation, mobile navigation, publishing preview/reset, and reduced-motion behavior passed. Headlines and native FAQ controls work with JavaScript disabled.
- Animated hero overflow was checked at three animation positions across four viewport widths. The pinned fan-out was checked at three scroll positions across 375, 900, and 1440 pixels, including fully opaque destination cards and measurable spreading. Phone tilt and route transitions were exercised with real pointer/navigation events. All passed. Canonicals, social metadata, JSON-LD parsing, and generated discovery resources also passed.
- Normal-Chrome mobile Lighthouse home audit — **Performance 90 / Accessibility 100 / Best practices 100 / SEO 100**. Lighthouse 13.4.0 used full multi-process headless Chromium 142 with `--headless=new`, default mobile screen emulation, simulated Slow 4G, and 4× CPU slowdown. Filmstrip screenshots and Speed Index were collected successfully.
- Home measurements: FCP **0.9 s**, LCP **3.6 s**, Speed Index **0.9 s**, TBT **51 ms**, CLS **0**. These are local lab measurements, not field-performance claims.
- The round-3 audit caught unnecessary SVG blur work and unrelated route-prefetch image requests. Native thumbnail backgrounds and explicit navigation prefetch settings restored the ≥90 result while keeping high-priority hero preloads.
- macOS prevented full Chrome’s subprocess bootstrap. The valid Lighthouse run used an isolated temporary Alpine userspace in a RAM filesystem inside the existing Colima Linux VM, serving the unchanged static export. No single-process browser flag or disabled performance audit was used. The website’s Docker audit recipe provides an equivalent normal-Chrome alternative for environments without that restriction.

Every page passed all four mobile categories. Final scores:

| Page | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Home | 90 | 100 | 100 | 100 |
| Features | 90 | 100 | 100 | 100 |
| Platforms | 92 | 98 | 100 | 100 |
| Pricing | 91 | 100 | 100 | 100 |
| FAQ | 91 | 100 | 100 | 100 |
| Get the app | 92 | 100 | 100 | 100 |
| Privacy | 99 | 100 | 100 | 100 |
| Terms | 98 | 100 | 100 | 100 |

The `/app/` route is excluded from these marketing scores. Compact results are retained in `qa/quality-summary.json`.

Browser report artifacts are kept in `qa/`. The round-4 review PNGs and results inside `qa/app-screens/` are retained; top-level PNG and full Lighthouse reports remain ignored because they are reproducible and large. The browser suite ran against the same final static site built on a local SSD for faster serving. Final build, lint, and typecheck commands ran from `website/` using an identical lockfile dependency installation cached on that SSD; the project's own dependency installation remains in `website/node_modules` after verification.
