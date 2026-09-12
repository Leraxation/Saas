# Oman Vision 2040 — Aviation Briefing

A scroll-driven canvas presentation built for the aviation sector convening in
Muscat, **23 September 2026**.

Route: **`/vision-2040`**

---

## Before the meeting — do these three things

### 1. Replace the illustrative figures

Every number lives in **`lib/vision2040/data.ts`**. Each one is a `Figure` that
carries a `source` and a `verified` flag:

```ts
{
  value: 16.5,
  suffix: "M",
  decimals: 1,
  label: "Passengers handled",
  source: "ILLUSTRATIVE — replace with the published Oman Airports annual figure.",
  verified: false,   // ← flip to true once the value is confirmed
}
```

The figures shipped here are **illustrative placeholders chosen so the page
reads correctly out of the box**. They are not official statistics.

Three things stop a placeholder being read out as fact:

- a small **`illustrative`** tag renders beside every unverified figure, always visible;
- a **pre-flight check** lists every unverified figure the first time the page is opened;
- **review mode** (press `V`) highlights them in amber with their source line.

Set `verified: true` and the tag disappears. Once every figure is verified, the
pre-flight check says so and clears.

The same applies to:

- **`GROWTH`** — the passenger trajectory chart series.
- **`PILLARS.source`** — confirm the exact official wording of the Vision 2040
  axis names against the published document.
- **`DESTINATIONS`** in `lib/vision2040/geo.ts` — the international route list is
  illustrative. Replace it with the current published schedule.

### 2. Fetch the film

```bash
./scripts/fetch-film.sh
```

This pulls three files into `public/vision2040/`:

| File | What it is |
|---|---|
| `film.mp4` | The 58-second cinematic master, 1080p |
| `film-scrub.mp4` | An all-keyframe encode — the fallback scrub source for Act II |
| `poster.jpg` | Hero still, also the video poster frame |

The presentation **runs without them** — the canvas carries every act on its own
and the film layers simply stay dark. With them, the overture, Act II and the
close become footage.

### Cutting the film to frames

```bash
./scripts/cut-frames.sh path/to/film.mp4
FPS=12 WIDTH=1920 ./scripts/cut-frames.sh path/to/film.mp4
```

Writes `public/vision2040/frames/f0000.jpg …` plus a `manifest.json`.

**Choosing the frame rate.** Scrub frame rate is not playback frame rate —
nothing plays, the scroll position *is* the playhead. What matters is how far
the page scrolls between one frame and the next:

```
scroll_px_per_frame = total_scroll_px / (duration_s * FPS)
```

Below ~6 px/frame you are buying frames nobody can tell apart; above ~20 the
picture visibly steps on a slow scroll. Aim for 8-12.

**The current cut is 24 fps: 289 frames, 1440px, `-q:v 2`, 40 MB** — every frame the source has.
The source is 848x478 (a WhatsApp re-encode at 1.4 Mbps), so 24 fps captures
all of it — there is no finer sampling available. It is upscaled with lanczos
so the browser is not left doing a bilinear stretch on a projector; that adds
no detail, only a cleaner scale.

**Stepping, and the two things that fix it.** 12.04s across the full 2330vh
page is 20,070px of travel at a 900px viewport. At 24 fps that is 69.7
px/frame, far above the ~20 px threshold, so a slow scroll would step. Two
mechanisms address it:

1. **Sub-frame blending**, always on. The canvas paints frame N and then
   cross-dissolves the fractional part into N+1, so the gap between frames is a
   dissolve rather than a jump. Costs nothing — no extra download, no extra
   memory. It is not motion-compensated, so a fast pan ghosts slightly instead
   of resolving into true intermediate motion; for anything short of that it is
   the better trade.

2. **Motion interpolation**, available but not shipped. `INTERPOLATE=72`
   gives 862 frames at 23.3 px/frame and 115 MB:

   ```bash
   INTERPOLATE=72 WIDTH=1440 QUALITY=2 ./scripts/cut-frames.sh <film.mp4>
   ```

   About 90 seconds of CPU. It is not the default because blending already
   carries this footage, and 115 MB is a lot to move for the one case it
   improves: somebody flinging the scrollbar. Interpolation invents frames —
   smoothness, never detail.

**Blending is measured, not assumed.** Stepping across one frame interval in
fifths, the canvas produced five distinct renders on a single base frame,
moving monotonically — the picture changes *between* frames, which is the
dissolve doing its job. Without it, all five would be identical.

Sizing note: 289 frames at 1440x812 is ~1.35 GB of bitmap if a browser held
every frame decoded at once (the 72 fps set is ~4 GB). It does not — decoding
is lazy and evicted — but it is the reason not to raise the count without
measuring.

### How the scrub is wired

A fixed, full-bleed canvas (`.v-filmcanvas`) sits behind everything; the
content sections scroll over it. GSAP ScrollTrigger drives it with `scrub`
over `#film-range`, which is the whole page.

The scrim is progress-aware: light while the film carries the opening, then
deepening once the map and the charts have to read over the top of it.

**Segments, not a linear map.** `FILM_SEGMENTS` in
`components/vision2040/FilmCanvas.tsx` covers all seven acts, so the film opens
on its first frame under the title and reaches its last as the final act ends:

```ts
export const FILM_SEGMENTS = linearSegments([
  { section: "overture", weight: 230 },
  { section: "nation",   weight: 340 },
  ...
]);
```

`weight` is the section's height in vh. `linearSegments` derives each segment's
slice of the sequence from the weights so the arithmetic cannot fall out of
step; override any segment's `from`/`to` afterwards to hold or cut. This is what makes holds (`from === to` parks the picture
while a passage is read) and cuts (a gap between one segment's `to` and the
next one's `from`) possible without touching the engine — neither is
expressible as one linear map.

**The weights and the markup heights are the same numbers written twice** and
nothing ties them together at compile time, so `createFilmScrub` measures the
real sections on mount and on every ScrollTrigger refresh and warns in the
console when they drift. The failure mode is otherwise silent: the film just
runs at the wrong rate against the text.

**Loading.** Frame 0 is fetched alone so the page opens on a picture, then the
rest stream in order six at a time. Scrubbing ahead of the download paints the
nearest decoded frame rather than blanking — a slightly stiff scrub that
resolves as the stream catches up, instead of a black screen.

**Degradation.** No GSAP → a built-in rAF scrub over the same mapping, so the
scrub survives (verified: both drivers produce identical frames, 0 / 185 / 463
at the same scroll positions). No frames → the canvas stays empty and the
procedural stage behind it carries the acts. `prefers-reduced-motion` → frame 0
is held and the page scrolls normally; the one-line change to keep scrubbing
for those users is commented in `filmScrub.ts`.

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

Fonts are self-hosted through `next/font` at build time and the film is a local
file, so **nothing on this page touches the network once built**. Venue Wi-Fi is
not a dependency.

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

## The seven acts

| | Act | What the canvas is doing |
|---|---|---|
| I | Overture | The film's first frames, scrubbed — the title holds still until you scroll |
| II | The Nation | The film scrub continues to its last frame behind three beats |
| III | The Network | Oman's coastline draws in, airports light in sequence, then the view pulls back and the international routes bloom |
| IV | The Scale | Figures count up, then the passenger trajectory plots itself |
| V | The Pillars | Three orbits, one per Vision 2040 axis |
| VI | The Roadmap | A rail fills from 2026 to 2040 across four phases |
| VII | The Ask | A radial burst settles behind the sign-off |

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
