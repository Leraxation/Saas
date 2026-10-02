"use client";

import { useEffect, useRef } from "react";
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
 * weights, so the film runs first frame to last across acts I-IV and the
 * arithmetic cannot fall out of step. To park the picture while a passage is
 * read, set that segment's `from` and `to` equal afterwards; to cut, leave a
 * gap to the next segment's `from`. That is what the segment model is for —
 * neither is expressible as one linear map.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const FILM_SEGMENTS = linearSegments([
  { section: "overture", weight: 230 },
  { section: "nation", weight: 340 },
  { section: "network", weight: 420 },
  // The film reaches its last frame 60% into Act IV — exactly where the
  // passenger trajectory chart begins — and then holds while the chart draws.
  { section: "scale", weight: 216 },
  { section: "scale", weight: 144, hold: true },
]);

/** Where the footage stops being the subject and becomes a backdrop. */
const DATA_ACTS_START = (230 + 340) / 1306;

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
      loadDriver: async () => {
        try {
          const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
            import("gsap"),
            import("gsap/ScrollTrigger"),
          ]);
          return { gsap, ScrollTrigger };
        } catch {
          return null;
        }
      },
      scrim: (ctx, w, h, p) => {
        // Light while the film carries the opening; deeper once the map and
        // the charts have to read over the top of it.
        const deep = Math.min(1, Math.max(0, (p - DATA_ACTS_START) / 0.12));
        // Lighter than before throughout — the footage is the point, and the
        // type carries on its own weight against it.
        const top = 0.36 + deep * 0.2;
        const mid = 0.12 + deep * 0.34;
        const bot = 0.46 + deep * 0.18;
        const v = ctx.createLinearGradient(0, 0, 0, h);
        v.addColorStop(0, `rgba(3,6,13,${top})`);
        v.addColorStop(0.42, `rgba(4,10,22,${mid})`);
        v.addColorStop(1, `rgba(3,6,13,${bot})`);
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, w, h);
        const side = ctx.createLinearGradient(0, 0, w * 0.68, 0);
        side.addColorStop(0, `rgba(3,6,13,${0.36 + deep * 0.12})`);
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
