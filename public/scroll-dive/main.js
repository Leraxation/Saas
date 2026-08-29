/* =============================================================
   Scroll Dive — scroll-driven canvas image sequence
   HTML5 Canvas + GSAP ScrollTrigger

   The sequence is described as a list of segments rather than one flat
   run of frames, so a clip made of several shots keeps its structure:
   each shot gets its own stretch of the scroll track, and a `hold`
   segment parks on a single frame for as long as you give it.
   ============================================================= */

const CONFIG = {
  /* Segments in playback order.
       { from, to, weight } plays file numbers from → to (inclusive)
       { hold, weight }     parks on one file number
     `weight` is that segment's share of the scroll track. The weights below
     are 3 : 2 : 2, matching the 3 panels / 200vh spacer / 2 panels in the
     markup — keep the two in step if you change either. */
  segments: [
    { from: 1,   to: 168, weight: 3 },   // shot one: the fly-by into the engine
    { hold: 169,          weight: 2 },   // the black stretch already in the footage
    { from: 170, to: 245, weight: 2 },   // shot two: the cabin
  ],

  firstFrame: 1,           // number of the first file on disk
  pad: 4,                  // zero-padding width in the filename
  path: (n) => `frames/frame_${String(n).padStart(CONFIG.pad, "0")}.webp`,

  scrub: 1,                // seconds the canvas takes to catch up to the wheel
  concurrency: 6,          // parallel image requests while preloading
  readyThreshold: 0.12,    // fraction decoded before the loader is dismissed
};

/* ------------------------------------------------------------------
   Elements + 2D context
   ------------------------------------------------------------------ */
const canvas = document.getElementById("sequence");
const ctx = canvas.getContext("2d", { alpha: false });
const track = document.getElementById("track");
const loader = document.getElementById("loader");
const loaderFill = document.getElementById("loader-fill");
const loaderPct = document.getElementById("loader-pct");
const progressFill = document.getElementById("progress-fill");

/* Flatten the segments into the list of file numbers actually needed, so
   frames[] is a simple 0-based array however the segments are described. */
const files = [];
const layout = CONFIG.segments.map((seg) => {
  const start = files.length;
  if (seg.hold != null) {
    files.push(seg.hold);
  } else {
    for (let n = seg.from; n <= seg.to; n++) files.push(n);
  }
  return { ...seg, start, end: files.length - 1 };
});

const total = files.length;
const frames = new Array(total).fill(null); // decoded HTMLImageElements, by index

/* Playhead. The ScrollTrigger timeline drives `state.frame`; the renderer reads it. */
const state = { frame: 0 };
let painted = -1;        // last index actually drawn, so we skip no-op redraws
let rafPending = false;
let sized = false;

const prefersReducedMotion =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------
   Rendering

   The canvas backing store is kept at the source frame's own pixel
   size and CSS scales it to the viewport with `object-fit: cover`.
   That means no re-draw is needed on resize and the browser handles
   the crop on the compositor.
   ------------------------------------------------------------------ */
function sizeCanvasTo(img) {
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  sized = true;
}

/** Nearest already-decoded frame, so fast scrolling never blanks out. */
function resolveFrame(index) {
  if (frames[index]) return frames[index];
  for (let offset = 1; offset < total; offset++) {
    const before = index - offset;
    const after = index + offset;
    if (before >= 0 && frames[before]) return frames[before];
    if (after < total && frames[after]) return frames[after];
  }
  return null;
}

function paint() {
  rafPending = false;

  const index = Math.min(total - 1, Math.max(0, Math.round(state.frame)));
  const img = resolveFrame(index);
  if (!img) return;

  if (!sized) sizeCanvasTo(img);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  painted = frames[index] ? index : -1; // force a repaint once the real frame lands
}

/** Coalesce every request into at most one draw per animation frame. */
function render() {
  const index = Math.min(total - 1, Math.max(0, Math.round(state.frame)));
  if (index === painted || rafPending) return;
  rafPending = true;
  requestAnimationFrame(paint);
}

/* ------------------------------------------------------------------
   Preloading

   Frame 1 is fetched on its own and painted immediately so the page
   has a background as early as possible; the rest stream in behind a
   small concurrency window so the browser is not flooded with
   requests on slow connections.
   ------------------------------------------------------------------ */
function loadFrame(index) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.src = CONFIG.path(files[index]);

    const done = () => {
      frames[index] = img;
      resolve(img);
    };

    if (img.decode) {
      img.decode().then(done, () => {
        // decode() rejects on some browsers for cached/file:// images —
        // fall back to the load event rather than dropping the frame.
        img.onload = done;
        img.onerror = () => resolve(null);
        if (img.complete && img.naturalWidth) done();
      });
    } else {
      img.onload = done;
      img.onerror = () => resolve(null);
    }
  });
}

let loaded = 0;
let readyResolved = false;
let resolveReady;
const ready = new Promise((r) => (resolveReady = r));

function onFrameLoaded() {
  loaded++;
  const pct = Math.round((loaded / total) * 100);
  loaderFill.style.width = pct + "%";
  loaderPct.textContent = pct + "%";

  render(); // a newly arrived frame may replace the stand-in currently on screen

  if (!readyResolved && loaded / total >= CONFIG.readyThreshold) {
    readyResolved = true;
    resolveReady();
  }
  if (loaded === total && window.ScrollTrigger) {
    // Layout can shift while images resolve; re-measure the trigger.
    ScrollTrigger.refresh();
  }
}

async function preload() {
  // Frame 1 first, so something is on screen straight away.
  await loadFrame(0);
  onFrameLoaded();
  painted = -1;
  render();

  // Remaining frames, `concurrency` at a time, in playback order.
  let next = 1;
  const workers = Array.from({ length: CONFIG.concurrency }, async () => {
    while (next < total) {
      const index = next++;
      await loadFrame(index);
      onFrameLoaded();
    }
  });
  await Promise.all(workers);
}

/* ------------------------------------------------------------------
   Scroll wiring

   One timeline across the whole track, with a tween per segment. Because
   the durations are the segment weights, each shot occupies exactly its
   share of the scroll — and a `hold` simply spends its share sitting on
   one frame.
   ------------------------------------------------------------------ */
function initScroll() {
  gsap.registerPlugin(ScrollTrigger);

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      scrub: CONFIG.scrub,      // frames ease toward the scroll position
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        progressFill.style.width = (self.progress * 100).toFixed(2) + "%";
      },
    },
    onUpdate: render,           // paint on every tick, including inside a hold
  });

  layout.forEach((seg, i) => {
    timeline.to(state, {
      frame: seg.end,           // a hold has start === end, so it just parks
      duration: seg.weight,
      ease: "none",
      snap: "frame",            // land on whole frames, never a fraction
      immediateRender: i === 0,
    });
  });

  if (prefersReducedMotion) return;

  // Overlay copy: fade + rise as each panel enters the viewport.
  document.body.classList.add("js-reveal");
  document.querySelectorAll(".panel").forEach((panel) => {
    gsap.to(panel.querySelectorAll("[data-reveal]"), {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.12,
      scrollTrigger: {
        trigger: panel,
        start: "top 72%",
        toggleActions: "play none none reverse",
      },
    });
  });
}

/* Handy while tuning: scrollDive.state.frame, scrollDive.layout, etc. */
window.scrollDive = { config: CONFIG, files, layout, state, frames, render };

/* ------------------------------------------------------------------
   Boot
   ------------------------------------------------------------------ */
(async function start() {
  if (!window.gsap || !window.ScrollTrigger) {
    // No GSAP (offline CDN, blocked script): still show the first frame
    // and let the page scroll as plain content.
    loader.classList.add("is-done");
    await loadFrame(0);
    render();
    return;
  }

  initScroll();
  preload();                       // keeps streaming in the background
  await ready;                     // ...but we uncover the page early
  loader.classList.add("is-done");
  ScrollTrigger.refresh();
})();
