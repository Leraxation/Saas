"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createFilmScrub, linearSegments, type Segment } from "@/lib/vision2040/filmScrub";

type Scrim = (ctx: CanvasRenderingContext2D, w: number, h: number, p: number) => void;

/**
 * Segment map for FILM ONE — the opening film, acts I–II.
 *
 * ── WEIGHTS MUST EQUAL THE ACT HEIGHTS IN app/vision-2040/page.tsx ────────
 * `weight` is each section's height in vh. These are the same numbers written
 * in two places and nothing ties them together at compile time, so
 * `createFilmScrub` measures the real sections on mount and on every
 * ScrollTrigger refresh and warns in the console when they drift. Change an
 * act's height and change its weight with it.
 *
 * `linearSegments` derives each segment's slice of the frame sequence from the
 * weights, so the film runs first frame to last across the whole page and the
 * arithmetic cannot fall out of step. To park the picture while a passage is
 * read, set that segment's `from` and `to` equal afterwards; to cut, leave a
 * gap to the next segment's `from`. That is what the segment model is for —
 * neither is expressible as one linear map.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const FILM_SEGMENTS = linearSegments([
  { section: "overture", weight: 230 },
  // The film finishes inside Act II rather than exactly on its boundary, and
  // the last frame then holds for the rest of the act. Running it to the
  // boundary meant the closing frames were only reached as the canvas was
  // already fading — the end of the film was never actually seen. The hold
  // also gives the damped scrub time to settle on the final frame.
  { section: "nation", weight: 260 },
  { section: "nation", weight: 80, hold: true },
]);

/**
 * Segment map for FILM TWO — the 58-second closing film, acts X–XI.
 *
 * Same rule as above: these weights are the act heights in vh and the runtime
 * check warns if they drift. Act X is the film's own act and gives it all of
 * its scroll; the film then runs the first fifth of Act XI and holds its last
 * frame under the asks and the sign-off, so the deck ends on the picture it
 * opened with rather than cutting away from it.
 *
 * 800vh of advancing scroll against 464 frames is 15.5 px/frame on a 900px
 * viewport — the same scrub density as film one, which is what makes the two
 * feel like one instrument. See scripts/cut-frames.sh for that arithmetic.
 */
export const FILM_TWO_SEGMENTS = linearSegments([
  { section: "horizon", weight: 700 },
  { section: "close", weight: 100 },
  { section: "close", weight: 180, hold: true },
]);

/** Film one: the footage is the subject, so one light scrim throughout. */
const openingScrim: Scrim = (ctx, w, h) => {
  const v = ctx.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, "rgba(3,6,13,0.36)");
  v.addColorStop(0.42, "rgba(4,10,22,0.12)");
  v.addColorStop(1, "rgba(3,6,13,0.46)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  const side = ctx.createLinearGradient(0, 0, w * 0.68, 0);
  side.addColorStop(0, "rgba(3,6,13,0.36)");
  side.addColorStop(1, "rgba(3,6,13,0)");
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, w, h);
};

/**
 * Film two: opens as light as film one and deepens across its run, because the
 * sign-off sits on the last frames and white type has to hold there. `p` is the
 * scrub progress, so the darkening tracks the film rather than the clock.
 */
const closingScrim: Scrim = (ctx, w, h, p) => {
  const deepen = p * 0.2;
  const v = ctx.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, `rgba(3,6,13,${(0.42 + deepen).toFixed(3)})`);
  v.addColorStop(0.44, `rgba(4,10,22,${(0.18 + deepen * 0.9).toFixed(3)})`);
  v.addColorStop(1, `rgba(3,6,13,${(0.5 + deepen).toFixed(3)})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  const side = ctx.createLinearGradient(0, 0, w * 0.7, 0);
  side.addColorStop(0, `rgba(3,6,13,${(0.3 + deepen * 0.7).toFixed(3)})`);
  side.addColorStop(1, "rgba(3,6,13,0)");
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, w, h);
  // Act X's lines sit dead centre over a lit city, where a corner-to-corner
  // gradient does nothing for them. This is a soft pool under the type — wide
  // enough not to read as a panel, dark enough that the serif holds its edges
  // whatever the frame underneath is doing.
  const pool = ctx.createRadialGradient(
    w * 0.5, h * 0.5, 0,
    w * 0.5, h * 0.5, Math.max(w, h) * 0.52,
  );
  pool.addColorStop(0, "rgba(3,6,13,0.46)");
  pool.addColorStop(0.55, "rgba(3,6,13,0.3)");
  pool.addColorStop(1, "rgba(3,6,13,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, w, h);
};

export type FilmCanvasProps = {
  /** Id of the element whose scroll range the sequence maps onto. */
  triggerId: string;
  manifestUrl?: string;
  segments?: Segment[];
  scrim?: Scrim;
  /**
   * Hold this film's frame stream back until its acts are close.
   *
   * The closing film is 464 frames. Streaming them from the top of the page
   * would put them in the same queue as the opening film's 289 and the opening
   * act — the one thing on this page that has to be instant — would be what
   * gives way. Frame 0 is still fetched at once so the canvas is never empty;
   * the rest start when the range is within a few screens, or after a backstop
   * delay, whichever comes first.
   */
  deferStream?: boolean;
};

/** How near the range has to come, in viewports, before a deferred film streams. */
const NEAR_VIEWPORTS = 3;
/** Backstop: stream anyway after this long, for a slow, steady scroll. */
const DEFER_BACKSTOP_MS = 15000;

export default function FilmCanvas({
  triggerId,
  manifestUrl = "/vision2040/frames/manifest.json",
  segments = FILM_SEGMENTS,
  scrim = openingScrim,
  deferStream = false,
}: FilmCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const trigger = document.getElementById(triggerId);
    if (!canvas || !trigger) return;

    let releaseDefer: (() => void) | undefined;

    const handle = createFilmScrub({
      canvas,
      trigger,
      manifestUrl,
      segments,
      scrub: 0.5,
      gsap,
      ScrollTrigger,
      scrim,
      holdStream: deferStream
        ? () =>
            new Promise<void>((resolve) => {
              let done = false;
              const release = () => {
                if (done) return;
                done = true;
                window.removeEventListener("scroll", onScroll);
                clearTimeout(timer);
                resolve();
              };
              const onScroll = () => {
                if (trigger.getBoundingClientRect().top < window.innerHeight * NEAR_VIEWPORTS) {
                  release();
                }
              };
              const timer = setTimeout(release, DEFER_BACKSTOP_MS);
              window.addEventListener("scroll", onScroll, { passive: true });
              releaseDefer = release;
              onScroll();
            })
        : undefined,
      onFirstFrame: () => {
        canvas.dataset.ready = "true";
      },
    });

    return () => {
      releaseDefer?.();
      handle.destroy();
    };
  }, [triggerId, manifestUrl, segments, scrim, deferStream]);

  return <canvas ref={ref} className="v-filmcanvas" aria-hidden="true" />;
}

export { closingScrim };
