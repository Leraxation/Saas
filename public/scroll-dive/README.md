# Oman Air — homepage

A marketing homepage built around a scroll-driven canvas image sequence: the
hero is a 25-second brand film played frame by frame off the scroll position,
with the rest of the airline homepage below it.

```
public/scroll-dive/
├── src/
│   ├── partials/       shell, header, footer, hero canvas, script blocks
│   └── pages/          the body of each page — this is what you edit
├── build.mjs           composes src/ into the six pages below
├── index.html  destinations.html  experience.html            ← generated,
├── sindbad.html  offers.html  help.html                        do not edit
├── styles.css          design tokens, the canvas hero and its overlay panels
├── site.css            header, booking card, page sections, footer, RTL
├── main.js             sequence engine — preloader, renderer, segment timeline
├── site.js             nav, booking tabs, validation, filters, preferences
├── frames-1600/        the full-resolution sequence (8.2 MB)
├── frames-960/         the same sequence at half width (4.5 MB)
├── og-image.jpg  sitemap.xml  robots.txt        ← last two are generated
└── vendor/             GSAP 3.12.5 + ScrollTrigger, local fallback for the CDN
```

**The six `.html` files in the root are generated.** Edit `src/`, then run:

```bash
node public/scroll-dive/build.mjs
```

The header and footer live in `src/partials/` alone, so a nav change lands on
every page at once. The templating is two directives — `{{name}}` for values
from the page list in `build.mjs`, and `<!--#include partials/x-->`.

Serve it statically — `npx serve public/scroll-dive`, or `npm run dev` in this
Next.js app, which puts it at `/scroll-dive/index.html`. It also opens from
`file://`; that is what the vendored GSAP copy is for.

## What the page covers

Mirroring the entry points on the current site:

| Area | Included |
| --- | --- |
| Utility bar | Cargo, Holidays, Help, region/language/currency, Sindbad link |
| Primary nav | Book, Manage, Experience (mega menus) + Destinations, Sindbad, Help |
| Booking | Book a flight, Manage booking, Check-in, Flight status — four tabs |
| Offers | Fare cards by region |
| Destinations | Filterable, searchable network list |
| Experience | Economy / Business / First, plus Tashreef and Meet & Greet links |
| Sindbad | Programme summary and tiers |
| Services | Holidays, car rental, Rail & Fly, visa, insurance, cargo |
| App | Store links |
| Help | Contact, FAQs, special assistance, feedback |
| Footer | Five link columns, legal, social |

Pages: home, destinations, experience, sindbad, offers, help. Inner pages reuse
stills from the sequence as their hero banners, so they cost no extra assets.

Beyond the current site: the scroll-sequence hero, a persisted
region/language/currency preference, RTL layout support, client-side booking
validation, and live destination filtering.

## Weight, and which frame set loads

The whole sequence is downloaded, so the frame set is the biggest lever on what
the page costs. `pickSource()` in `main.js` chooses one at boot:

| Client | Set | Frames | Download |
| --- | --- | --- | --- |
| Desktop | `frames-1600` | 245 | 7.7 MB |
| Phone / tablet (< 900 px) | `frames-960` | 245 | 3.9 MB |
| `Save-Data`, or a 2G connection | `frames-960`, every 2nd frame | 125 | 2.0 MB |

Sharpness is not the only axis. On a phone `object-fit: cover` crops most of a
16:9 frame away anyway, so the smaller set costs little and halves the data.
The thinned set relies on the nearest-decoded-frame fallback, and never drops a
segment edge — those carry the cuts.

Measured by loading the page in Chromium at each viewport and summing the
frames actually requested, not estimated.

The `<link rel="preload">` pair in the generated `<head>` is media-scoped to the
same 900 px line. A `Save-Data` client still preloads one frame from the set it
then does not use — about 35 KB, the one wasteful case.

## The mobile hero is a band, not a full bleed

A 16:9 frame covering a 390 × 844 phone scales to roughly 1500 px wide: you see
about a quarter of the width, and the composition is gone. Below 720 px the
canvas becomes a `58svh` band across the top, masked into the page at its lower
edge, with the copy underneath on the dark ground. See the media query at the
foot of `styles.css`.

## Before this can go live

- **Brand assets.** `.brand__mark` is a placeholder disc — drop the official
  logo SVG into the `.brand` anchor in `index.html`.
- **Copy and data are placeholders.** Fares, flight times, the destination list
  and the tier benefits are illustrative. Every block that needs real data is
  marked with a `PLACEHOLDER` comment in `index.html`.
- **Arabic is layout-only.** The toggle flips `dir`/`lang` and the whole layout
  mirrors correctly, but the copy is not translated. Wire a translation
  dictionary before exposing the Arabic switch to users.
- **No booking engine.** The four forms validate input and then stop; they do
  not post anywhere. `site.js` marks where the reservations system connects.
- **No credential collection.** "Sindbad log in" is a link, deliberately — sign-in
  belongs on the secure auth domain, not on a marketing page.
- **Crawling is blocked on purpose.** `robots.txt` disallows everything and every
  page carries `noindex`, because indexing placeholder fares under the Oman Air
  name would mislead. Both are marked; flip them when the content is real.
- **Set the origin.** Canonical and Open Graph URLs are page-relative until you
  build with `SITE_BASE_URL=https://…  node build.mjs`, which also writes the
  `Sitemap:` line into `robots.txt`.

## The scroll sequence

`CONFIG.segments` in `main.js` describes the film as shots rather than one flat
run of frames:

```js
segments: [
  { from: 1,   to: 168, weight: 3 },   // shot one: the fly-by into the engine
  { hold: 169,          weight: 2 },   // the black stretch already in the footage
  { from: 170, to: 245, weight: 2 },   // shot two: the cabin
],
```

- `{ from, to, weight }` plays a range of file numbers; `{ hold, weight }` parks
  on one frame for that share of the scroll.
- `weight` is the segment's share of the track. **The weights must match the
  markup**: 3 : 2 : 2 is three `100vh` panels, the `200vh` `.spacer`, then two
  panels — `700vh` of `.track`. Change one, change the other.

The gap between the shots is not a synthetic fade. The source fades to black on
its own, so the hold parks on that black frame.

### Re-cutting the footage

```bash
# where does the source go black?
ffmpeg -i clip.mp4 -vf "blackdetect=d=0.3:pix_th=0.06" -an -f null -
# black_start:13.958333 black_end:18.75

ffmpeg -i clip.mp4 -ss 0 -to 13.958 -vf "fps=12,scale=1600:-2:flags=lanczos" \
  -c:v libwebp -quality 76 -compression_level 6 a/%04d.webp
ffmpeg -i clip.mp4 -ss 18.75 -vf "fps=12,scale=1600:-2:flags=lanczos" \
  -c:v libwebp -quality 76 -compression_level 6 b/%04d.webp
```

Extract at or below the source's frame rate — a 24 fps source sampled at 30 fps
duplicates six frames a second for 25% more bytes and no extra information.
Below that ceiling what matters is frames per unit of *scroll*: at 12 fps over
700vh this advances a frame roughly every 24 px, which reads as continuous.
WebP is worth it — 32 KB/frame against 55 KB for JPEG at matched quality
(SSIM 0.984 at `-quality 72`, 0.988 at 82).

## How the hero works

- **Canvas sizing.** The backing store is set once to the source frame's pixel
  size and CSS stretches it with `object-fit: cover`, so resizing never redraws.
- **Playhead.** One ScrollTrigger timeline spans the track with a tween per
  segment, each `duration` being that segment's weight. `scrub: 1` eases toward
  the scroll position; `snap: "frame"` keeps it on whole frames.
- **Drawing.** `render()` coalesces updates to at most one `drawImage` per
  animation frame and skips when the index has not changed.
- **Preloading.** Frame 1 paints first; the rest stream six at a time through
  `img.decode()`. Until a frame arrives the nearest decoded one stands in, and
  the page uncovers at 12% (`readyThreshold`).
- **Degradation.** If GSAP fails to load the first frame still paints and the
  page scrolls as ordinary content. `prefers-reduced-motion` drops the reveals.

`window.scrollDive` exposes `{ config, files, layout, state, frames, render }`.
