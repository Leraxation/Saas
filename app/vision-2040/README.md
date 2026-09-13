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

### 2. Fetch the films

```bash
./scripts/fetch-film.sh
```

There are **two** films, each scrubbed frame-by-frame off scroll position on
its own fixed canvas. Nothing plays: there is no `<video>` element anywhere on
this page, no playback clock and no decoder seek.

| Film | Length | Acts | Cut | Frames | Size |
|---|---|---|---|---|---|
| One — the opening | 12.04s | I–II (`#film-range`) | 24 fps, 1440px, JPEG | 289 | ~40 MB |
| Two — the close | 58.00s | X–XI (`#film-range-2`) | 8 fps, 1440px, WebP | 464 | ~54 MB |

The presentation **runs without either of them**. A canvas whose manifest is
missing stays empty and the procedural stage carries that act on its own —
nothing errors and nothing blocks.

> **Network note.** The default source for the 58-second master is a
> CloudFront host that some corporate and sandboxed networks deny outright. If
> `curl` fails, download the two masters by hand and point the script at them:
> `FILM_ONE=a.mp4 FILM_TWO=b.mp4 ./scripts/fetch-film.sh`. Nothing else in the
> pipeline touches the network.

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

**Match px/frame across the two films, not fps.** fps is an artefact of how
long each film is; what the hand feels is how far the page scrolls between one
frame and the next.

| | advancing scroll | frames | px/frame at 900px vh |
|---|---:|---:|---:|
| Film 1 @ 24 fps | 490vh = 4,410px | 289 | 15.3 |
| Film 2 @ 24 fps | 800vh = 7,200px | 1,392 | 5.2 — and 160 MB |
| **Film 2 @ 8 fps** | 800vh = 7,200px | **464** | **15.5** ← shipped |

Film 2 is five times longer for the same scroll, so cutting it at 24 fps would
buy three frames for every one the eye resolves and cost 160 MB to do it. At
8 fps it lands on film 1's exact scrub density. The source is a slow aerial
drift with almost no inter-frame motion — precisely the content where a lower
cut rate is invisible. It is cut to WebP rather than JPEG for the same reason
the count is lower: same pixel dimensions, fewer bytes.

**Film 1's cut is 24 fps: 289 frames, 1440px, `-q:v 2`, 40 MB** — every frame the source has.
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

**Segments, not a linear map.** Each film has its own weighted segment map in
`components/vision2040/FilmCanvas.tsx`. Weights are act heights in vh; holds
(`from === to`) take scroll but no film, and are excluded from the denominator
so the sequence still runs first frame to last:

```ts
export const FILM_SEGMENTS = linearSegments([
  { section: "overture", weight: 230 },
  { section: "nation",   weight: 260 },
  { section: "nation",   weight: 80, hold: true },   // last frame holds
]);

export const FILM_TWO_SEGMENTS = linearSegments([
  { section: "horizon", weight: 700 },
  { section: "close",   weight: 100 },
  { section: "close",   weight: 180, hold: true },   // holds under the ask
]);
```

The weights and the `vh` values in `app/vision-2040/page.tsx` are the same
numbers written twice, and nothing ties them together at compile time — so
`createFilmScrub` measures the real sections on mount and on every refresh and
warns in the console when they drift. **Change an act's height, change its
weight.**

**Only one film paints at a time.** Both canvases are fixed and full-bleed, so
a canvas outside its own range has to stand down or it simply covers the other
one. That is decided from geometry — the trigger's own rect against the
viewport, using the same bounds ScrollTrigger uses — rather than from
ScrollTrigger's enter/leave callbacks, for two reasons found the hard way:

- A long instant jump (End key, hash link, a presenter skipping acts) can land
  past a trigger without its leave callback ever firing, leaving the opening
  film painting over the closing one.
- At the page's very last scroll position the closing film's trigger reaches
  its end, so a leave-driven flag fades the picture out on exactly the frame
  the sign-off sits on.

**The closing film's stream is deferred.** Frame 0 is fetched immediately so
its canvas is never empty; frames 1–463 wait until its range is within three
viewports, or 15 seconds, whichever comes first. Without that its 464 frames
queue against the opening act — the one thing on this page that has to be
instant.

### Degradation

| If this fails | What happens |
|---|---|
| GSAP does not load | `filmScrub` falls back to its own rAF loop over the same mapping — the scrub still works |
| A frame manifest is missing | That canvas stays empty; the procedural stage carries the act |
| Frames are still downloading | The nearest decoded frame is held rather than blanking; it resolves as the stream lands |
| `prefers-reduced-motion` | Each canvas holds a single frame; the page scrolls normally |
