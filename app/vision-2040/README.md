# Oman Vision 2040 — Aviation Briefing

A scroll-driven canvas presentation built for the aviation sector convening in
Muscat, **23 September 2026**.

Route: **`/vision-2040`**

---

## Before the meeting — do these three things

### 1. Check the figures against their sources

Every number now carries a real citation and is marked `verified: true` in
`lib/vision2040/data.ts`. The headline set:

| Figure | Value | Source |
|---|---|---|
| Passengers 2025 | 14,939,209 (+2.8%) | NCSI |
| Traffic H1 2026 | 6.28M, **−9.3%** | NCSI |
| Flights 2025 | 104,510 (−2.8%) | NCSI |
| 2040 passenger target | **40M** | National Aviation Strategy 2040 (approved Jan 2026) |
| 2040 cargo target | ~1M tonnes | National Aviation Strategy 2040 |
| 2040 GDP share | >3.5% | National Aviation Strategy 2040 |
| Private investment sought | OMR 1bn+ | National Aviation Strategy 2040 |

The trajectory chart has two real anchors — 14.94M actual and the 40M target —
and the line between them is **arithmetic, not a forecast**: the 6.8% compound
growth the target implies. It is labelled that way on screen, because a
required path and a prediction are different claims.

The operator figures in `OPERATORS` and `BOARD` come from company statements
and press reporting. Press lags filings: confirm each against the company's own
published numbers before the meeting. Every stat carries its source in a
`title` attribute — hover it.

**One item is still unverified:** the exact official wording of the Vision 2040
axis names in `PILLARS`. The pre-flight check names it on first open.

**Act IX is analysis, not policy.** The `OUTLOOK` insights are derived from the
cited figures and are labelled on screen as such.

### 2. Fetch the film

```bash
./scripts/fetch-film.sh
FPS=8 WIDTH=1600 ./scripts/fetch-film.sh --frames
```

This pulls three files into `public/vision2040/`:

| File | What it is |
|---|---|
| `film.mp4` | The 58-second cinematic master, 1080p |
| `film-scrub.mp4` | An all-keyframe encode kept for the standalone HTML and local experiments |
| `poster.jpg` | Hero still, also the video poster frame |

The presentation **runs without them** — the canvas carries every act on its own
and the film layers simply stay dark. With them, the overture, acts II-IV and
the close become footage.

### Cutting the film to frames

```bash
./scripts/cut-frames.sh public/vision2040/film.mp4
FPS=12 WIDTH=1600 ./scripts/cut-frames.sh public/vision2040/film.mp4
```

Both `fetch-film.sh --frames` and `cut-frames.sh` now produce the same output:

- `public/vision2040/frames/f0000.jpg …`
- `public/vision2040/frames/manifest.json`

The manifest fields are:

```json
{
  "count": 464,
  "interpolated": null,
  "pattern": "/vision2040/frames/f%04d.jpg",
  "width": 1600,
  "fps": 8,
  "duration": 58.04
}
```

Human-facing “frame 1” is `f0000.jpg` / index `0` in code.

**Choosing the frame rate.** Scrub frame rate is not playback frame rate —
nothing plays, the scroll position *is* the playhead. What matters is how far
the page scrolls between one advancing frame and the next:

```
scroll_px_per_frame = advancing_scroll_px / (duration_s * FPS)
```

Acts I-IV are the scrub range, but only **1206vh** of that range advances the
film (`230 + 340 + 420 + 216`). The last **144vh** of Act IV is a hold on the
final film frame while the growth chart draws, so that scroll does **not** need
additional extracted frames.

At a 900px viewport, that advancing stretch is about **9954px** of travel:

| Scrub fps | Approx. frames | px/frame @ 900px viewport | Trade-off |
|---|---:|---:|---|
| 4 | 232 | 42.9 | Too coarse |
| **8** | **464** | **21.5** | Default: acceptable once blending + scrub damping are factored in |
| 12 | 696 | 14.3 | Smoother, ~50% more bytes |
| 24 | 1393 | 7.1 | Much heavier than the page needs |

The default is **8 fps**. It is slightly above the old “ideal” 20 px/frame
rule of thumb on paper, but this implementation already:

1. cross-dissolves between adjacent frames, and
2. holds the nearest decoded frame instead of blanking while the rest stream in.

That makes 8 fps the best default byte/smoothness trade for this material.
If a venue test rig still shows visible stepping, bump to **12 fps** first.

**Motion interpolation is still available** when you need synthetic in-betweens:

1. **Sub-frame blending**, always on. The canvas paints frame N and then
   cross-dissolves the fractional part into N+1, so the gap between frames is a
   dissolve rather than a jump. Costs nothing — no extra download, no extra
   memory. It is not motion-compensated, so a fast pan ghosts slightly instead
   of resolving into true intermediate motion; for anything short of that it is
   the better trade.

2. **Motion interpolation**, available but not shipped:

   ```bash
   INTERPOLATE=72 WIDTH=1600 QUALITY=2 ./scripts/cut-frames.sh public/vision2040/film.mp4
   ```

   Interpolation invents frames — smoothness, never detail — so keep it as a
   venue-specific escalation, not the default.

### How the scrub is wired

A fixed, full-bleed canvas (`.v-filmcanvas`) sits behind everything; the
content sections scroll over it. GSAP ScrollTrigger drives it with `scrub`
over `#film-range`, which covers acts I-IV only.

The scrim is progress-aware: light while the film carries the opening, then
deepening once the map and the charts have to read over the top of it.

**Segments, not a linear map.** `FILM_SEGMENTS` in
`components/vision2040/FilmCanvas.tsx` covers the weighted film range only, so
the film opens on its first frame under the title, reaches its last frame 60%
into Act IV, and then holds:

```ts
export const FILM_SEGMENTS = linearSegments([
  { section: "overture", weight: 230 },
  { section: "nation",   weight: 340 },
  ...
]);
```

`weight` is the section's height in vh. `linearSegments` derives each segment's
slice of the sequence from the weights so the arithmetic cannot fall out of
step; override any segment's `from`/`to` afterwards to hold or cut. This is
what makes holds (`from === to` parks the picture while a passage is read) and
cuts (a gap between one segment's `to` and the next one's `from`) possible
without touching the engine — neither is expressible as one linear map.

**The weights and the markup heights are the same numbers written twice** and
nothing ties them together at compile time, so `createFilmScrub` measures the
real sections on mount and on every ScrollTrigger refresh and warns in the
console when they drift. The failure mode is otherwise silent: the film just
runs at the wrong rate against the text.

**Loading.** The first scrub frame (`f0000.jpg`, frame 1 to a human / index 0
in code) is fetched alone so the page opens on a picture, then the rest stream
in order six at a time. Scrubbing ahead of the download paints the nearest
decoded frame rather than blanking — a slightly stiff scrub that resolves as
the stream catches up, instead of a black screen.

**Degradation.** The canvas paints that first scrub frame whether or not GSAP
loads. If GSAP/ScrollTrigger is available, the scrub upgrades to the normal
driver; if not, the built-in rAF scrub keeps the page working. No manifest or
no frames → the canvas stays empty and the procedural stage behind it carries
the acts. `prefers-reduced-motion` → the first scrub frame is held and the page
scrolls normally.

Inspect `.v-filmcanvas` in devtools: `data-driver` is `gsap`, `native` or
`calm`, and `data-frame` is the frame currently painted.

### Hosting: byte-range requests are required for the video path

Seeking a video needs the server to answer HTTP `Range` requests. `next start`,
nginx, Vercel and opening the file over `file://` all do. Python's
`http.server` does **not** — against it the picture silently freezes on frame
one while everything else works, which is a miserable thing to discover in the
room.

The frame sequence has no such requirement: frames are plain JPEGs fetched
whole. If you are unsure what the venue machine will be serving from, run
`--frames` and remove the doubt.

### Other options

On a machine with `ffmpeg` and time to spare:

```bash
./scripts/fetch-film.sh --60fps
```

This rebuilds the master at 60fps by motion interpolation (20–40 minutes of CPU).
The 24fps original is kept as `film-24.mp4`. Note that 24fps is the correct
cadence for cinematic footage — interpolating to 60 is a preference, not an
upgrade, and it can introduce artefacts on fast camera moves.

### 3. Build once, then go offline

```bash
npm run build && npm start
```

The route now uses local fallback font stacks rather than build-time remote font
fetches, and the film files are local, so **nothing on this page touches the
network once built**. Venue Wi-Fi is not a dependency.

---

## Presenting

| Key | Action |
|---|---|
| `Space` · `→` | Next section |
| `←` | Previous section |
| `Home` · `End` | First · last section |
| `F` | Fullscreen |
| `P` | Presenter mode — section name, elapsed clock, position |
| `V` | Review mode — flag unverified figures |
| `H` · `?` | Keyboard help |
| `Esc` | Close a panel |

Each key press lands the next act **pinned and centred**, so the presenter never
has to hunt with a scroll wheel. The act rail on the right is also clickable, for
jumping out of order if the room takes the conversation somewhere else.

Add `?preflight` to the URL to see the pre-flight check again on a device that
has already dismissed it.

---

## The ten acts

| | Act | What the canvas is doing |
|---|---|---|
| I | Overture | The film opens on its first scrub frame under the title |
| II | The Nation | The scrub advances through the nation beats |
| III | The Network | The scrub continues while the procedural network scene takes over |
| IV | The Scale | The scrub reaches its last frame 60% in, then holds while the chart draws |
| V | The Operators | Procedural backdrop only |
| VI | The Sector Board | Procedural backdrop only |
| VII | The Pillars | Three orbits, one per Vision 2040 axis |
| VIII | The Roadmap | A rail fills from 2026 to 2040 across four phases |
| IX | Outlook | Procedural backdrop only |
| X | The Close | The cinematic master video fades up for the sign-off |

---

## How it is built

- **One `requestAnimationFrame` loop** owns all motion (`lib/vision2040/useStage.ts`).
  Scroll position is critically damped toward the real value — that damping is
  what makes it feel like film rather than a scrollbar.
- **Scroll never triggers a React render.** Beats and counters write opacity,
  a `--beat-y` custom property, and text content straight to the DOM.
- **One canvas** renders every procedural scene (`lib/vision2040/scenes.ts`),
  sized to `devicePixelRatio` and capped at 2×.
- **Quality degrades automatically.** The loop measures its own frame cost and
  steps particle and arc budgets down if the machine cannot hold the frame
  budget — it never steps back up, so the tier cannot visibly oscillate
  mid-presentation.
- **`prefers-reduced-motion`** disables the scroll damping and the ambient
  animations.

### A note on the map

The Oman outline in `lib/vision2040/geo.ts` is a **stylised silhouette drawn for
visual effect**. It is not a cartographic or legal boundary and the caption under
the map says so. Do not present it as one.
