# Scroll Dive — canvas image sequence

A scroll-driven "video" background: sequential stills painted onto a fixed
`<canvas>`, with the frame index tied to scroll position by GSAP ScrollTrigger.

```
public/scroll-dive/
├── index.html          markup: canvas + 700vh scroll track + overlay sections
├── styles.css          fixed/object-fit canvas, overlay typography, loader
├── main.js             preloader, renderer, segmented timeline (CONFIG at top)
├── frames/             frame_0001.webp … frame_0245.webp (8.2 MB)
└── vendor/             GSAP 3.12.5 + ScrollTrigger, local fallback for the CDN
```

## Running it

Any static server works, e.g. `npx serve public/scroll-dive`. In this Next.js app
the folder is served from `public/`, so `npm run dev` puts it at
<http://localhost:3000/scroll-dive/index.html>. It also opens directly from
`file://` — that is what the vendored GSAP copy is for.

## The current sequence

Extracted from a 25 s, 24 fps, 1920×1080 source at **12 fps and 1600 px wide**:

```bash
# shot one — the fly-by, up to the point the footage goes black
ffmpeg -i clip.mp4 -ss 0 -to 13.958 -vf "fps=12,scale=1600:-2:flags=lanczos" \
  -c:v libwebp -quality 76 -compression_level 6 a/%04d.webp

# shot two — the cabin, from where the black ends
ffmpeg -i clip.mp4 -ss 18.75 -vf "fps=12,scale=1600:-2:flags=lanczos" \
  -c:v libwebp -quality 76 -compression_level 6 b/%04d.webp
```

Find the black stretch rather than eyeballing it:

```bash
ffmpeg -i clip.mp4 -vf "blackdetect=d=0.3:pix_th=0.06" -an -f null -
# black_start:13.958333 black_end:18.75 black_duration:4.791667
```

## Segments and the gap

`CONFIG.segments` in `main.js` describes the sequence as shots rather than one
flat run of frames, so a multi-shot clip keeps its structure:

```js
segments: [
  { from: 1,   to: 168, weight: 3 },   // shot one: the fly-by into the engine
  { hold: 169,          weight: 2 },   // the black stretch already in the footage
  { from: 170, to: 245, weight: 2 },   // shot two: the cabin
],
```

- `{ from, to, weight }` plays a range of file numbers.
- `{ hold, weight }` parks on a single frame for that share of the scroll.
- `weight` is the segment's share of the track. **The weights must match the
  markup**: 3 : 2 : 2 here is three `100vh` panels, the `200vh` `.spacer`, then
  two more panels — `700vh` of `.track` in total. Change one, change the other.

The gap is not a synthetic fade. The source already fades to black between the
two shots, so the hold parks on that black frame and the transition is the
footage's own.

## Choosing a frame rate

Extract at or below the source's rate — a 24 fps source sampled at 30 fps just
duplicates six frames a second for 25% more bytes and no extra information.

Below that ceiling, what matters is frames per unit of *scroll*, not per second,
because the viewer sets the pace. At 12 fps over a 700vh track this sequence
advances a frame roughly every 24 px of scroll, which reads as continuous. Going
to 24 fps would halve that to ~12 px and double the payload to ~16 MB.

WebP is worth it here: at matched quality it came in at 32 KB/frame against
55 KB for JPEG (SSIM 0.984 at `-quality 72`, 0.988 at 82). Support is universal
in current browsers; add a JPEG set and swap `CONFIG.path` if you need to go
further back.

## How it works

- **Canvas sizing.** The backing store is set once to the source frame's pixel
  size (`canvas.width/height`), and CSS stretches it over the viewport with
  `object-fit: cover`. Cropping is done by the compositor, so resizing the window
  costs nothing and never triggers a redraw.
- **Playhead.** One ScrollTrigger timeline spans the track with a tween per
  segment, each tween's `duration` being that segment's weight. `scrub: 1` eases
  the canvas toward the scroll position; `snap: "frame"` keeps it on whole frames.
- **Drawing.** `render()` coalesces updates into at most one `drawImage` per
  animation frame, and skips the call entirely when the index has not changed.
- **Preloading.** Frame 1 is fetched and painted first; the rest stream in six at
  a time via `img.decode()`, so no frame is ever drawn mid-decode. Until a frame
  arrives, the nearest decoded one is shown instead of a blank canvas, and the
  page is uncovered once 12% is ready (`readyThreshold`).
- **Graceful degradation.** If GSAP fails to load entirely, the first frame is
  still painted and the page scrolls as ordinary content. `prefers-reduced-motion`
  disables the text reveals (scroll-driven frames stay, since the user is
  driving them).

`window.scrollDive` exposes `{ config, files, layout, state, frames, render }`
for tuning from the console.
