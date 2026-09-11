"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createFilmScrub, type Segment } from "@/lib/vision2040/filmScrub";

/**
 * Segment map for the film.
 *
 * ── KEEP IN SYNC WITH THE ACT HEIGHTS IN app/vision-2040/page.tsx ──────────
 * `weight` is the section's height in vh. These are the same numbers written
 * in two places and nothing enforces it at compile time, so `createFilmScrub`
 * measures the real sections on mount and on every ScrollTrigger refresh, and
 * warns in the console if they diverge. Change one, change the other.
 *
 * `from`/`to` are each segment's slice of the frame sequence. Because the
 * sequence is modelled as weighted segments rather than one linear map, it can
 * also hold (from === to parks the picture while a passage is read) and cut
 * (one segment's `to` not matching the next one's `from` skips frames) — which
 * is what makes room for more shots later without touching the engine.
 * ──────────────────────────────────────────────────────────────────────────
 */
export const FILM_SEGMENTS: Segment[] = [
  { section: "overture", weight: 230, from: 0, to: 0.4 },
  { section: "nation", weight: 340, from: 0.4, to: 1 },
];

/**
 * The fixed, full-bleed film canvas. Everything else on the page scrolls over
 * the top of it.
 */
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
      // Gold type over a lit city needs help; the scrim is part of the frame,
      // not a DOM layer, so it scales with the canvas and never mis-registers.
      scrim: (ctx, w, h) => {
        const v = ctx.createLinearGradient(0, 0, 0, h);
        v.addColorStop(0, "rgba(3,6,13,0.72)");
        v.addColorStop(0.42, "rgba(4,10,22,0.5)");
        v.addColorStop(1, "rgba(3,6,13,0.82)");
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, w, h);
        const side = ctx.createLinearGradient(0, 0, w * 0.68, 0);
        side.addColorStop(0, "rgba(3,6,13,0.6)");
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
