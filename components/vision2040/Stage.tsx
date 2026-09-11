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
const SCRUB = "/vision2040/film-scrub.mp4";
const POSTER = "/vision2040/poster.jpg";
const FRAMES_MANIFEST = "/vision2040/frames/manifest.json";

type FrameSeq = {
  count: number;
  /** e.g. "/vision2040/frames/f%04d.jpg" */
  pattern: string;
  images: HTMLImageElement[];
  loaded: boolean[];
};

/** Substitute the zero-padded index into a printf-style frame pattern. */
function framePath(pattern: string, i: number) {
  return pattern.replace(/%(0(\d+))?d/, (_m, _p, width) =>
    String(i).padStart(width ? parseInt(width, 10) : 1, "0"),
  );
}

/** Cover-fit draw, the canvas equivalent of object-fit: cover. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  iw: number,
  ih: number,
  w: number,
  h: number,
) {
  const s = Math.max(w / iw, h / ih);
  const dw = iw * s;
  const dh = ih * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

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
  const scrubRef = useRef<HTMLVideoElement>(null);
  const motes = useRef<Mote[]>([]);
  const [hasFilm, setHasFilm] = useState(false);
  const [hasScrub, setHasScrub] = useState(false);
  const frames = useRef<FrameSeq | null>(null);
  const [hasFrames, setHasFrames] = useState(false);

  if (motes.current.length === 0) motes.current = makeMotes(320);

  /**
   * Frame sequence for Act II.
   *
   * This is the scroll-driven canvas in its literal form: the film is cut to
   * stills ahead of time and the act paints frame N straight onto the canvas,
   * so the picture advances only as far as the presenter has scrolled. There
   * is no playback clock and no decoder seek involved at all.
   *
   * It is optional. Without `scripts/fetch-film.sh --frames` there is no
   * manifest, and Act II falls back to seeking the all-keyframe encode, and
   * failing that to the canvas scenes alone.
   */
  useEffect(() => {
    let cancelled = false;
    fetch(FRAMES_MANIFEST)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no manifest"))))
      .then((m: { count: number; pattern: string }) => {
        if (cancelled || !m || !m.count || !m.pattern) return;
        const seq: FrameSeq = {
          count: m.count,
          pattern: m.pattern,
          images: new Array(m.count),
          loaded: new Array(m.count).fill(false),
        };
        frames.current = seq;
        // Load in order so the early frames — the ones the presenter reaches
        // first — are always the ones that are ready first.
        let next = 0;
        const CONCURRENCY = 6;
        const pump = () => {
          if (cancelled || next >= seq.count) return;
          const i = next++;
          const img = new Image();
          img.decoding = "async";
          img.onload = () => {
            seq.loaded[i] = true;
            if (i === 0) setHasFrames(true);
            pump();
          };
          img.onerror = pump;
          img.src = framePath(seq.pattern, i);
          seq.images[i] = img;
        };
        for (let c = 0; c < CONCURRENCY; c++) pump();
      })
      .catch(() => {
        /* no frame sequence on this machine — the fallbacks cover it */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      const inNation = nation > 0.001 && nation < 0.999;
      // Frames win Act II when they exist; the video is the fallback.
      const nationHasPicture = inNation && (hasFrames || hasScrub);
      const filmIn =
        Math.max(
          hasFilm ? 1 - range(overture, 0.55, 0.95) : 0,
          nationHasPicture ? 1 : 0,
          hasFilm ? range(close, 0.12, 0.4) * (1 - range(close, 0.86, 1)) : 0,
        ) * (overture > 0 || nation > 0 || close > 0 ? 1 : 0);

      // Warmth rises in the dusk acts and cools for the data acts.
      const warmth = clamp01(
        0.85 - range(nation, 0.3, 1) * 0.5 - network * 0.35 + close * 0.6,
      );

      ctx.save();
      ctx.globalAlpha = 1 - filmIn * 0.88;
      paintBackdrop(ctx, s.w, s.h, s.time, warmth, motes.current, s.quality);
      ctx.restore();

      // ── Act II frame sequence ────────────────────────────────────────
      const seq = frames.current;
      if (seq && hasFrames && inNation) {
        const want = Math.round(nation * (seq.count - 1));
        // Show the nearest frame that has actually arrived, so an incomplete
        // preload degrades to a slightly stale frame rather than a black one.
        let idx = -1;
        for (let d = 0; d < seq.count; d++) {
          if (want - d >= 0 && seq.loaded[want - d]) { idx = want - d; break; }
          if (want + d < seq.count && seq.loaded[want + d]) { idx = want + d; break; }
        }
        if (idx >= 0) {
          const img = seq.images[idx];
          const fade = range(nation, 0, 0.05) * (1 - range(nation, 0.94, 1));
          ctx.save();
          ctx.globalAlpha = fade;
          drawCover(ctx, img, img.naturalWidth, img.naturalHeight, s.w, s.h);
          const sc = ctx.createLinearGradient(0, 0, 0, s.h);
          sc.addColorStop(0, "rgba(3,6,13,0.7)");
          sc.addColorStop(0.45, "rgba(4,10,22,0.45)");
          sc.addColorStop(1, "rgba(3,6,13,0.8)");
          ctx.fillStyle = sc;
          ctx.fillRect(0, 0, s.w, s.h);
          ctx.restore();
        }
      }

      // An act's scene keeps painting once started and is only dropped when
      // the *following* act has taken over, so the canvas never goes empty
      // during the moment one pinned frame hands off to the next.
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
        const vis = Math.max(
          1 - range(overture, 0.55, 0.95),
          range(close, 0.12, 0.4) * (1 - range(close, 0.9, 1)),
        );
        play.style.opacity = String(vis);
        // Only spend decode budget when the film is actually on screen.
        if (vis > 0.01 && play.paused) void play.play().catch(() => {});
        else if (vis <= 0.01 && !play.paused) play.pause();
      }

      const scrub = scrubRef.current;
      if (scrub && hasScrub && !hasFrames && scrub.duration) {
        const on = inNation;
        scrub.style.opacity = on ? String(range(nation, 0, 0.06) * (1 - range(nation, 0.94, 1))) : "0";
        if (on) {
          // Scroll drives the playhead directly. This is the scroll-driven
          // canvas proper: the film advances only as fast as the presenter
          // talks. The scrub encode is all-keyframe so every seek lands.
          const target = nation * (scrub.duration - 0.05);
          if (Math.abs(scrub.currentTime - target) > 0.016) scrub.currentTime = target;
        }
      }
    });

    return unsubscribe;
  }, [api, hasFilm, hasScrub, hasFrames]);

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
      <video
        ref={scrubRef}
        className="v-film v-film--scrub"
        src={SCRUB}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={() => setHasScrub(true)}
        onError={() => setHasScrub(false)}
      />
      <canvas ref={canvasRef} className="v-canvas" />
    </div>
  );
}
