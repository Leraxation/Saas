/**
 * Scroll-scrubbed film on a fixed canvas.
 *
 * The film is cut to stills ahead of time (scripts/cut-frames.sh) and this
 * paints frame N straight onto a fixed, full-bleed canvas at scroll position
 * N. Nothing plays: there is no video element, no playback clock and no
 * decoder seek anywhere in the path. Content sections scroll over the top.
 *
 * GSAP ScrollTrigger drives it with `scrub`. If GSAP is unavailable the module
 * falls back to its own rAF loop over the same mapping, so the worst case is
 * still a working scrub — and if even the frames fail, frame 0 is painted and
 * the page scrolls normally.
 */

export type Segment = {
  /**
   * The DOM id of the section this segment covers. Used for the sync check.
   */
  section: string;
  /**
   * Scroll weight for this segment.
   *
   * ── THIS MUST EQUAL THE SECTION'S HEIGHT IN vh ───────────────────────────
   * The weights below and the `height` values in the markup are two copies of
   * the same number, and nothing in the type system ties them together. If you
   * change one, change the other. `createFilmScrub` measures the real sections
   * at runtime and warns in the console when they drift apart, because the
   * failure mode is otherwise silent: the film simply runs at the wrong rate
   * against the text and no one can say why.
   * ─────────────────────────────────────────────────────────────────────────
   */
  weight: number;
  /** Start of this segment's slice of the frame sequence, 0..1. */
  from: number;
  /** End of its slice, 0..1. */
  to: number;
};

export type FilmScrubOptions = {
  canvas: HTMLCanvasElement;
  /** Element whose scroll range the whole sequence maps onto. */
  trigger: HTMLElement;
  manifestUrl: string;
  segments: Segment[];
  /** Seconds of catch-up for the scrub. 0 ties the frame directly to scroll. */
  scrub?: number;
  /** Painted over every frame; use it to keep type legible. */
  scrim?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  /** Called once the first frame is on screen. */
  onFirstFrame?: () => void;
  /**
   * GSAP and ScrollTrigger. Pass them in when they are bundled (the app), or
   * leave them out and they are picked up from the globals (a CDN script tag).
   * Either way, missing them is not fatal — see `start`.
   */
  gsap?: any;
  ScrollTrigger?: any;
};

export type FilmScrubHandle = {
  destroy: () => void;
  /** Current frame index, for tests and debugging. */
  readonly frame: number;
  /** How many frames have decoded so far. */
  readonly decoded: number;
};

type Manifest = { count: number; pattern: string; width?: number; fps?: number };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Substitute a zero-padded index into a printf-style pattern. */
export function framePath(pattern: string, i: number) {
  return pattern.replace(/%(?:0(\d+))?d/, (_m, width) =>
    String(i).padStart(width ? parseInt(width, 10) : 1, "0"),
  );
}

/**
 * Map overall scroll progress to a position in the frame sequence.
 *
 * Segments are weighted rather than laid out as one linear map, so the
 * sequence can hold (from === to: the picture parks while text is read) or
 * skip (one segment's `to` not matching the next one's `from`: a cut). A
 * single linear mapping cannot express either.
 */
export function progressToFrameT(p: number, segments: Segment[]): number {
  const total = segments.reduce((a, s) => a + s.weight, 0);
  if (total <= 0) return 0;
  const target = clamp01(p) * total;
  let acc = 0;
  for (const seg of segments) {
    if (target <= acc + seg.weight || seg === segments[segments.length - 1]) {
      const local = seg.weight > 0 ? clamp01((target - acc) / seg.weight) : 0;
      return seg.from + (seg.to - seg.from) * local;
    }
    acc += seg.weight;
  }
  return segments[segments.length - 1].to;
}

export function createFilmScrub(opts: FilmScrubOptions): FilmScrubHandle {
  const { canvas, trigger, manifestUrl, segments, scrub = 0.5, scrim, onFirstFrame } = opts;
  const ctx = canvas.getContext("2d", { alpha: false });

  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

  let manifest: Manifest | null = null;
  let images: HTMLImageElement[] = [];
  let loaded: boolean[] = [];
  let decoded = 0;
  let current = 0;
  let firstPainted = false;
  let disposed = false;
  let raf = 0;
  let st: { kill: () => void } | null = null;

  /* ── Canvas sizing ─────────────────────────────────────────────────── */

  let cw = 0;
  let ch = 0;
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (w === cw && h === ch) return;
    cw = w;
    ch = h;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }

  /* ── Painting ──────────────────────────────────────────────────────── */

  /** object-fit: cover, in canvas terms. */
  function paint(index: number) {
    if (!ctx || !manifest) return;
    const img = images[index];
    if (!img || !img.naturalWidth) return;
    size();
    const w = canvas.width;
    const h = canvas.height;
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    if (scrim) {
      ctx.save();
      const dpr = w / window.innerWidth;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scrim(ctx, window.innerWidth, window.innerHeight);
      ctx.restore();
    }
    // Exposed for debugging and tests; written only when it actually changes.
    if (canvas.dataset.frame !== String(index)) canvas.dataset.frame = String(index);
    if (!firstPainted) {
      firstPainted = true;
      onFirstFrame?.();
    }
  }

  /**
   * Paint the wanted frame, or the nearest one already decoded.
   *
   * Scrubbing ahead of the download is the normal case on a cold load, and
   * blanking there is the thing that makes these look broken. Holding the
   * nearest decoded frame reads as a slightly stiff scrub instead — which
   * nobody notices — and it resolves as the stream catches up.
   */
  function render(want: number) {
    if (!manifest) return;
    const idx = Math.max(0, Math.min(manifest.count - 1, Math.round(want)));
    current = idx;
    if (loaded[idx]) return paint(idx);
    for (let d = 1; d < manifest.count; d++) {
      if (idx - d >= 0 && loaded[idx - d]) return paint(idx - d);
      if (idx + d < manifest.count && loaded[idx + d]) return paint(idx + d);
    }
  }

  /* ── Progressive loading ───────────────────────────────────────────── */

  function load(m: Manifest) {
    images = new Array(m.count);
    loaded = new Array(m.count).fill(false);

    const fetchOne = (i: number, onDone: () => void) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        loaded[i] = true;
        decoded++;
        // Repaint if this is the frame we are currently sitting on, or the
        // very first frame, which must appear as soon as it exists.
        if (i === current || !firstPainted) render(current);
        onDone();
      };
      img.onerror = onDone;
      img.src = framePath(m.pattern, i);
      images[i] = img;
    };

    // Frame 0 alone first: it is what the page opens on, so it must not queue
    // behind anything. The rest stream in order afterwards.
    fetchOne(0, () => {
      let next = 1;
      const CONCURRENCY = 6;
      const pump = () => {
        if (disposed || next >= m.count) return;
        fetchOne(next++, pump);
      };
      for (let c = 0; c < CONCURRENCY; c++) pump();
    });
  }

  /* ── Weight / markup sync check ────────────────────────────────────── */

  function checkWeights() {
    const vh = window.innerHeight;
    if (!vh) return;
    for (const seg of segments) {
      const el = document.getElementById(seg.section);
      if (!el) {
        console.warn(`[filmScrub] segment "${seg.section}" has no matching element`);
        continue;
      }
      const actual = (el.getBoundingClientRect().height / vh) * 100;
      // A percent or so of slack absorbs sub-pixel layout and scrollbar width.
      if (Math.abs(actual - seg.weight) > 1.5) {
        console.warn(
          `[filmScrub] segment "${seg.section}" weight ${seg.weight} does not match ` +
            `its section height ${actual.toFixed(1)}vh. The film will run at the wrong ` +
            `rate against the text. Update the weight in filmScrub segments or the ` +
            `height in the markup so the two agree.`,
        );
      }
    }
  }

  /* ── Driving ───────────────────────────────────────────────────────── */

  function apply(p: number) {
    if (!manifest) return;
    render(progressToFrameT(p, segments) * (manifest.count - 1));
  }

  /** Native fallback: same mapping, own rAF, used when GSAP is unavailable. */
  function startNativeScrub() {
    let smoothed = -1;
    const tick = () => {
      if (disposed) return;
      const top = trigger.offsetTop;
      const span = Math.max(1, trigger.offsetHeight - window.innerHeight);
      const raw = clamp01((window.scrollY - top) / span);
      if (smoothed < 0) smoothed = raw;
      // Match ScrollTrigger's scrub feel; snap directly under reduced motion.
      smoothed = calm.matches ? raw : smoothed + (raw - smoothed) * 0.16;
      apply(smoothed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function start() {
    checkWeights();
    // Which driver actually took the wheel, for debugging and tests.
    canvas.dataset.driver = "pending";

    // Reduced motion: hold a single frame rather than tying a full-bleed
    // moving image to the scrollbar. The content still scrolls normally.
    // To keep scrubbing for these users instead, delete this branch — the
    // native path below already snaps without smoothing when calm.matches.
    if (calm.matches) {
      canvas.dataset.driver = "calm";
      render(0);
      return;
    }

    const w = window as unknown as { gsap?: any; ScrollTrigger?: any };
    const g = opts.gsap ?? w.gsap;
    const ST = opts.ScrollTrigger ?? w.ScrollTrigger;

    if (g && ST) {
      canvas.dataset.driver = "gsap";
      g.registerPlugin(ST);
      st = ST.create({
        trigger,
        start: "top top",
        end: "bottom bottom",
        scrub,
        onUpdate: (self: { progress: number }) => apply(self.progress),
        onRefresh: () => {
          size();
          checkWeights();
          render(current);
        },
      });
      apply(0);
    } else {
      // GSAP did not load. Frame 0 is already on screen and the page scrolls;
      // this keeps the scrub working too rather than settling for a still.
      console.warn("[filmScrub] GSAP/ScrollTrigger unavailable — using native scrub");
      canvas.dataset.driver = "native";
      startNativeScrub();
    }
  }

  /* ── Boot ──────────────────────────────────────────────────────────── */

  size();
  const onResize = () => {
    size();
    render(current);
  };
  window.addEventListener("resize", onResize);

  fetch(manifestUrl)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no manifest"))))
    .then((m: Manifest) => {
      if (disposed || !m?.count || !m?.pattern) return;
      manifest = m;
      load(m);
      start();
    })
    .catch(() => {
      // No frames on this machine. The page is unaffected: the canvas simply
      // stays empty and whatever sits behind it shows through.
      console.warn("[filmScrub] no frame manifest — scrub disabled");
    });

  return {
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      st?.kill();
      images.forEach((i) => {
        if (i) i.src = "";
      });
    },
    get frame() {
      return current;
    },
    get decoded() {
      return decoded;
    },
  };
}
