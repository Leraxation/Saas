"use client";

import { useEffect, useRef } from "react";
import type { StageApi } from "@/lib/vision2040/useStage";
import { clamp01, range } from "@/lib/vision2040/useStage";
import {
  makeMotes,
  paintBackdrop,
  paintClose,
  paintFinish,
  paintGrowth,
  paintNetwork,
  paintPillars,
  paintRoadmap,
  type Mote,
} from "@/lib/vision2040/scenes";

/**
 * The fixed stage behind the page's procedural scenes.
 *
 * Two layers, back to front:
 *   1. Canvas — every procedural scene. Transparent where a film shows.
 *   2. Finish — vignette and grain, painted onto the canvas last.
 *
 * Both films are scroll-scrubbed frame sequences owned by FilmCanvas, on
 * their own canvases below this one. There is deliberately no <video> here
 * any more: nothing on this page plays against a clock. Stage only reads
 * whether a film is currently painting, so it can hold its backdrop back
 * rather than muddying the footage with a gradient drawn on top of it.
 */
export default function Stage({ api }: { api: StageApi }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motes = useRef<Mote[]>([]);
  // The film is owned by FilmCanvas/filmScrub now. Stage only needs to know
  // whether it is painting, so it can hold its own backdrop back.
  const filmCanvases = useRef<HTMLElement[] | null>(null);

  if (motes.current.length === 0) motes.current = makeMotes(320);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let cw = 0;
    let ch = 0;

    const unsubscribe = api.subscribe((s) => {
      // Resize only when the backing store is actually wrong — resizing a
      // canvas clears it and is expensive.
      const w = Math.round(s.w * s.dpr);
      const h = Math.round(s.h * s.dpr);
      if (w !== cw || h !== ch) {
        cw = w;
        ch = h;
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${s.w}px`;
        canvas.style.height = `${s.h}px`;
      }

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, s.w, s.h);

      const a = s.acts;
      const overture = a.overture ?? 0;
      const nation = a.nation ?? 0;
      const network = a.network ?? 0;
      const scale = a.scale ?? 0;
      const operators = a.operators ?? 0;
      const outlook = a.outlook ?? 0;
      const pillars = a.pillars ?? 0;
      const roadmap = a.roadmap ?? 0;
      const close = a.close ?? 0;

      // How much of the film is showing right now. The backdrop is held back
      // by exactly this much so the footage is never muddied.
      // One continuous playhead across the overture and Act II: the presenter
      // starts on the first frame of the film under the title and arrives at
      // the last frame as Act II hands over. Every one of the eight shots is
      // scrolled through, not just the stretch that fits one act.
      // FilmCanvas marks itself ready once its first frame is painted. While
      // it is showing, Stage holds its own backdrop back so the footage is
      // never muddied by a gradient drawn on top of it.
      // There are two of these — the opening film and the closing film — and
      // either one painting is reason enough for the backdrop to stand back.
      if (!filmCanvases.current?.length) {
        filmCanvases.current = Array.from(
          document.querySelectorAll<HTMLElement>(".v-filmcanvas"),
        );
      }
      // The film now runs behind every act, so the backdrop stands back for
      // the whole page and the film's own scrim does the darkening.
      // The film covers acts I-IV only. Past its range it fades out and the
      // procedural backdrop takes the page back.
      const filmPainting = !!filmCanvases.current?.some(
        (c) => c.dataset.ready === "true" && c.dataset.past !== "true",
      );
      const filmIn = filmPainting ? 1 : 0;

      // Warmth rises in the dusk acts and cools for the data acts.
      const warmth = clamp01(
        0.85 - range(nation, 0.3, 1) * 0.5 - network * 0.35 + close * 0.6,
      );

      ctx.save();
      ctx.globalAlpha = 1 - filmIn * 0.88;
      paintBackdrop(ctx, s.w, s.h, s.time, warmth, motes.current, s.quality);
      ctx.restore();

      if (network > 0.001 && scale < 0.02) {
        paintNetwork(ctx, s.w, s.h, s.time, network, s.quality);
      }
      // Each scene is dropped when the act that follows it takes over, so the
      // gates below name the NEXT act, not a fixed index.
      if (scale > 0.001 && operators < 0.02) {
        paintGrowth(ctx, s.w, s.h, s.time, scale);
      }
      if (pillars > 0.001 && roadmap < 0.02) {
        paintPillars(ctx, s.w, s.h, s.time, pillars);
      }
      if (roadmap > 0.001 && outlook < 0.02) {
        paintRoadmap(ctx, s.w, s.h, s.time, roadmap);
      }
      // The closing film now runs underneath Act XI, so the light-burst scene
      // steps aside for it and only paints on a machine with no frames.
      if (close > 0.001 && !filmPainting) {
        paintClose(ctx, s.w, s.h, s.time, close, s.quality);
      }

      paintFinish(ctx, s.w, s.h, s.quality);
    });

    return unsubscribe;
  }, [api]);

  return (
    <div className="v-stage" aria-hidden="true">
      <canvas ref={canvasRef} className="v-canvas" />
    </div>
  );
}
