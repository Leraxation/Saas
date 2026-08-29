# Scroll Dive — canvas image sequence

A scroll-driven "video" background: sequential JPEGs painted onto a fixed
`<canvas>`, with the frame index tied to scroll position by GSAP ScrollTrigger.

```
public/scroll-dive/
├── index.html          markup: canvas + 400vh scroll track + overlay sections
├── styles.css          fixed/object-fit canvas, overlay typography, loader
├── main.js             preloader, renderer, ScrollTrigger wiring (CONFIG at top)
├── frames/             frame_0001.jpg … frame_0016.jpg (the demo sequence)
└── vendor/             GSAP 3.12.5 + ScrollTrigger, local fallback for the CDN
```

## Running it

Any static server works, e.g. `npx serve public/scroll-dive`. In this Next.js app
the folder is served from `public/`, so `npm run dev` puts it at
<http://localhost:3000/scroll-dive/index.html>. It also opens directly from
`file://` — that is what the vendored GSAP copy is for.

## Using your own footage

1. Export numbered JPEGs. A 6 second clip at 24 fps gives 144 frames:

   ```bash
   ffmpeg -i clip.mp4 -vf fps=24 -q:v 4 frames/frame_%04d.jpg
   ```

   Downscale to the largest size you actually need (`-vf "fps=24,scale=1920:-2"`);
   the whole sequence is downloaded, so file size is the main performance lever.
   Aim for well under 200 KB per frame.

2. Point `CONFIG` in `main.js` at it:

   ```js
   const CONFIG = {
     frameCount: 144,   // how many files
     firstFrame: 1,     // number of the first file
     pad: 4,            // zero padding in the filename
     path: (n) => `frames/frame_${String(n).padStart(CONFIG.pad, "0")}.jpg`,
     scrub: 1,          // seconds of catch-up easing (true = instant)
     ...
   };
   ```

3. Adjust the runway. `.track { height: 400vh }` in `styles.css` sets how much
   scrolling plays the whole sequence — taller means slower, more deliberate
   playback. Content sections are `100vh` each, so keep the count in step.

## How it works

- **Canvas sizing.** The backing store is set once to the source frame's pixel
  size (`canvas.width/height`), and CSS stretches it over the viewport with
  `object-fit: cover`. Cropping is done by the compositor, so resizing the window
  costs nothing and never triggers a redraw.
- **Playhead.** ScrollTrigger tweens a plain object (`state.frame`) from `0` to
  `frameCount - 1` across the track with `scrub: 1` and `snap: "frame"`, so the
  canvas eases toward the scroll position and always lands on a whole frame.
- **Drawing.** `render()` coalesces updates into at most one `drawImage` per
  animation frame, and skips the call entirely when the index has not changed.
- **Preloading.** Frame 1 is fetched and painted first; the rest stream in six at
  a time via `img.decode()`, so no frame is ever drawn mid-decode. Until a frame
  arrives, the nearest decoded one is shown instead of a blank canvas, and the
  page is uncovered once 25% is ready (`readyThreshold`).
- **Graceful degradation.** If GSAP fails to load entirely, the first frame is
  still painted and the page scrolls as ordinary content. `prefers-reduced-motion`
  disables the text reveals (scroll-driven frames stay, since the user is
  driving them).

`window.scrollDive` exposes `{ config, state, frames, render }` for tuning from
the console.
