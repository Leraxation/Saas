"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createFilmScrub, linearSegments } from "@/lib/vision2040/filmScrub";

/**
 * Segment map for the film.
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

export default function FilmCanvas({ triggerId }: { triggerId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const trigger = document.getElementById(triggerId);
    if (!canvas || !trigger) return;

    const handle = createFilmScrub({
      canvas,
      trigger,
      manifestUrl: "/vision2040/frames/manifest.json",
      segments: FILM_SEGMENTS,
      scrub: 0.5,
      gsap,
      ScrollTrigger,
      // The film only covers the opening two acts now, where it is the subject
      // rather than a backdrop, so the scrim is one light setting throughout —
      // just enough for gold type to hold over a lit city.
      scrim: (ctx, w, h) => {
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
      },
      onFirstFrame: () => {
        canvas.dataset.ready = "true";
      },
    });

    return () => handle.destroy();
  }, [triggerId]);

  return <canvas ref={ref} className="v-filmcanvas" aria-hidden="true" />;
}
