"use client";

import { useEffect, useRef, useState } from "react";
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

const FILM = "/vision2040/film.mp4";
const POSTER = "/vision2040/poster.jpg";
/**
 * The fixed stage behind the whole page.
 *
 * Three layers, back to front:
 *   1. Film   — the cinematic master, played in the overture and the close,
 *               and scrubbed frame-by-frame by scroll through Act II.
 *   2. Canvas — every procedural scene. Transparent where the film shows.
 *   3. Finish — vignette and grain, painted onto the canvas last.
 *
 * The film is optional. If the assets are absent the canvas simply goes
 * opaque and the presentation is unchanged in structure — nothing breaks
 * on a machine that has not run `scripts/fetch-film.sh`.
 */
export default function Stage({ api }: { api: StageApi }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLVideoElement>(null);
  const motes = useRef<Mote[]>([]);
  const [hasFilm, setHasFilm] = useState(false);
  // The film is owned by FilmCanvas/filmScrub now. Stage only needs to know
  // whether it is painting, so it can hold its own backdrop back.
  const filmCanvas = useRef<HTMLElement | null>(null);

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
      if (!filmCanvas.current) {
        filmCanvas.current = document.querySelector(".v-filmcanvas");
      }
      // The film now runs behind every act, so the backdrop stands back for
      // the whole page and the film's own scrim does the darkening.
      const filmPainting = filmCanvas.current?.dataset.ready === "true";
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
      if (scale > 0.001 && pillars < 0.02) {
        paintGrowth(ctx, s.w, s.h, s.time, scale);
      }
      if (pillars > 0.001 && roadmap < 0.02) {
        paintPillars(ctx, s.w, s.h, s.time, pillars);
      }
      if (roadmap > 0.001 && close < 0.02) {
        paintRoadmap(ctx, s.w, s.h, s.time, roadmap);
      }
      if (close > 0.001) {
        paintClose(ctx, s.w, s.h, s.time, close, s.quality);
      }

      paintFinish(ctx, s.w, s.h, s.quality);

      // ── Film layers ──────────────────────────────────────────────────
      const play = playRef.current;
      if (play && hasFilm) {
        // Playback belongs to the close alone. The opening is scrubbed, so it
        // holds still while the minister talks and only moves on scroll.
        const vis = range(close, 0.12, 0.4) * (1 - range(close, 0.9, 1));
        play.style.opacity = String(vis);
        // Only spend decode budget when the film is actually on screen.
        if (vis > 0.01 && play.paused) void play.play().catch(() => {});
        else if (vis <= 0.01 && !play.paused) play.pause();
      }

    });

    return unsubscribe;
  }, [api, hasFilm]);

  return (
    <div className="v-stage" aria-hidden="true">
      <video
        ref={playRef}
        className="v-film"
        src={FILM}
        poster={POSTER}
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={() => setHasFilm(true)}
        onError={() => setHasFilm(false)}
      />
      <canvas ref={canvasRef} className="v-canvas" />
    </div>
  );
}
