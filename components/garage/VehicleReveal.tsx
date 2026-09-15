"use client";

import { useEffect, useRef, useState } from "react";
import type { Vehicle } from "@/lib/garage/vehicles";
import { framePath, loadRevealSource, type RevealSource } from "./revealSource";

/** Fraction of the section's scroll spent pulling the cover off. */
const COVER_PHASE = 0.26;
/** How hard the scrubbed frame chases the raw scroll position. */
const LERP = 0.16;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Maps a value in [a,b] to [0,1], flat outside. */
function span(value: number, a: number, b: number) {
  return clamp01((value - a) / (b - a));
}

type Props = { vehicle: Vehicle; index: number };

export default function VehicleReveal({ vehicle, index }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const specsRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef<HTMLSpanElement>(null);

  const [source, setSource] = useState<RevealSource>({ mode: "stills", frames: vehicle.stills });
  const [loadPct, setLoadPct] = useState(0);
  const [ready, setReady] = useState(false);
  const framesRef = useRef<HTMLImageElement[]>([]);

  // Resolve which footage this section plays, then preload every frame.
  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;

    (async () => {
      const resolved = await loadRevealSource(vehicle.slug, vehicle.stills, ctrl.signal);
      if (cancelled) return;
      setSource(resolved);

      if (resolved.mode === "video") {
        setReady(true);
        setLoadPct(100);
        return;
      }

      const urls =
        resolved.mode === "frames"
          ? Array.from({ length: resolved.count }, (_, i) => framePath(resolved.pattern, i + 1))
          : resolved.frames;

      const images: HTMLImageElement[] = [];
      let done = 0;
      let cursor = 0;

      // Bounded concurrency: a 120-frame orbit should not open 120 sockets.
      const worker = async (): Promise<void> => {
        while (cursor < urls.length && !cancelled) {
          const i = cursor++;
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.decoding = "async";
            img.onload = img.onerror = () => {
              images[i] = img;
              done += 1;
              setLoadPct(Math.round((done / urls.length) * 100));
              resolve();
            };
            img.src = urls[i];
          });
        }
      };

      await Promise.all(Array.from({ length: Math.min(6, urls.length) }, worker));
      if (cancelled) return;
      framesRef.current = images;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [vehicle.slug, vehicle.stills]);

  // Scroll-driven render loop. Everything here mutates the DOM directly —
  // running this through React state would re-render on every frame.
  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    let smoothed = 0;
    let lastDrawn = -1;
    let dpr = 1;
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastDrawn = -1;
    };

    /** Draws `src` cropped to fill the canvas, preserving aspect. */
    const drawCover = (src: CanvasImageSource, sw: number, sh: number) => {
      if (!sw || !sh) return;
      const scale = Math.max(cssW / sw, cssH / sh);
      const w = sw * scale;
      const h = sh * scale;
      ctx.drawImage(src, (cssW - w) / 2, (cssH - h) / 2, w, h);
    };

    /**
     * The cover itself: an opaque sheet whose lower edge sweeps up and off the
     * vehicle, with a soft wave so it reads as fabric rather than a wipe.
     */
    const drawSheet = (t: number) => {
      if (t >= 1) return;
      const eased = easeOutCubic(t);
      // Edge travels from just below the canvas to well above it.
      const edge = cssH * 1.12 - eased * (cssH * 1.32);
      const amp = 26 * (1 - eased) + 8;
      const phase = eased * Math.PI * 2;
      const edgeAt = (x: number) =>
        edge + Math.sin(phase + (x / cssW) * Math.PI * 2.4) * amp;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(cssW, -4);
      for (let x = cssW; x >= 0; x -= cssW / 24) {
        ctx.lineTo(x, edgeAt(x));
      }
      ctx.lineTo(0, edgeAt(0));
      ctx.closePath();
      ctx.clip();

      const g = ctx.createLinearGradient(0, 0, cssW * 0.4, edge);
      g.addColorStop(0, "#15151a");
      g.addColorStop(0.45, "#1e1e25");
      g.addColorStop(0.7, "#111116");
      g.addColorStop(1, "#08080b");
      ctx.fillStyle = g;
      ctx.fillRect(0, -8, cssW, cssH + 16);

      // Folds: soft vertical bands so the sheet reads as cloth, not a wipe.
      const folds = 7;
      for (let i = 0; i < folds; i++) {
        const cx = ((i + 0.5) / folds) * cssW + Math.sin(phase + i) * 18;
        const w = cssW / folds;
        const fg = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
        fg.addColorStop(0, "rgba(0,0,0,0.34)");
        fg.addColorStop(0.5, "rgba(255,255,255,0.055)");
        fg.addColorStop(1, "rgba(0,0,0,0.34)");
        ctx.fillStyle = fg;
        ctx.fillRect(cx - w / 2, -8, w, cssH + 16);
      }

      // The shape underneath, pressing into the cloth.
      const bulge = ctx.createRadialGradient(
        cssW / 2, cssH * 0.62, 10,
        cssW / 2, cssH * 0.62, Math.max(cssW, cssH) * 0.42,
      );
      bulge.addColorStop(0, "rgba(255,255,255,0.07)");
      bulge.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = bulge;
      ctx.fillRect(0, -8, cssW, cssH + 16);
      ctx.restore();

      // Sheen along the trailing edge so the sheet catches light as it lifts.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, edgeAt(0));
      for (let x = 0; x <= cssW; x += cssW / 24) ctx.lineTo(x, edgeAt(x));
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.2 * (1 - eased)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    };

    const drawVignette = () => {
      const g = ctx.createRadialGradient(
        cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.28,
        cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.78,
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.72)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cssW, cssH);
    };

    const paint = (p: number) => {
      ctx.fillStyle = vehicle.backdrop;
      ctx.fillRect(0, 0, cssW, cssH);

      if (source.mode === "video") {
        const v = videoRef.current;
        if (v && v.readyState >= 2) {
          if (Number.isFinite(v.duration) && v.duration > 0) {
            const target = p * (v.duration - 0.05);
            if (Math.abs(v.currentTime - target) > 0.02) v.currentTime = target;
          }
          drawCover(v, v.videoWidth, v.videoHeight);
        }
      } else {
        const imgs = framesRef.current;
        if (imgs.length) {
          const i = Math.min(imgs.length - 1, Math.floor(p * imgs.length));
          const img = imgs[i];
          if (img?.complete && img.naturalWidth) {
            drawCover(img, img.naturalWidth, img.naturalHeight);
          }
        }
      }

      drawSheet(span(p, 0, COVER_PHASE));
      drawVignette();

      // Scrim under the headline block, faded in with the text itself.
      const scrim = span(p, COVER_PHASE * 0.55, COVER_PHASE + 0.1);
      if (scrim > 0) {
        const sg = ctx.createLinearGradient(0, cssH * 0.38, 0, cssH);
        sg.addColorStop(0, "rgba(0,0,0,0)");
        sg.addColorStop(1, `rgba(0,0,0,${0.82 * scrim})`);
        ctx.fillStyle = sg;
        ctx.fillRect(0, cssH * 0.38, cssW, cssH * 0.62);
      }
    };

    const syncOverlay = (p: number) => {
      const revealed = span(p, COVER_PHASE * 0.55, COVER_PHASE + 0.1);
      if (titleRef.current) {
        titleRef.current.style.opacity = String(revealed);
        titleRef.current.style.transform = `translateY(${(1 - revealed) * 26}px)`;
      }
      const specsIn = span(p, COVER_PHASE + 0.06, COVER_PHASE + 0.3);
      if (specsRef.current) {
        specsRef.current.style.opacity = String(specsIn * (1 - span(p, 0.9, 1)));
        specsRef.current.style.transform = `translateY(${(1 - specsIn) * 20}px)`;
      }
      if (dialRef.current) {
        dialRef.current.style.opacity = String(revealed * (1 - span(p, 0.93, 1)));
        dialRef.current.style.transform = `rotate(${p * 360}deg)`;
      }
      if (angleRef.current) {
        angleRef.current.textContent = `${Math.round(p * 360)}°`;
      }
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;

      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const raw = travel > 0 ? clamp01(-rect.top / travel) : 0;

      smoothed = reduceMotion ? raw : smoothed + (raw - smoothed) * LERP;
      const p = clamp01(smoothed);

      if (Math.abs(p - lastDrawn) < 0.0008 && lastDrawn >= 0) return;
      lastDrawn = p;
      paint(p);
      syncOverlay(p);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) lastDrawn = -1;
      },
      { rootMargin: "120px" },
    );
    io.observe(section);

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [source, vehicle.backdrop, ready]);

  const num = String(index + 1).padStart(2, "0");

  return (
    <section
      ref={sectionRef}
      id={vehicle.slug}
      className="relative h-[340vh] md:h-[440vh]"
      style={{ background: vehicle.backdrop }}
      aria-label={`${vehicle.marque} ${vehicle.model}`}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {source.mode === "video" && (
          <video
            ref={videoRef}
            src={source.src}
            className="pointer-events-none absolute h-px w-px opacity-0"
            muted
            playsInline
            preload="auto"
            crossOrigin="anonymous"
          />
        )}

        {/* Section index + marque, always visible so the page reads while covered */}
        <div className="pointer-events-none absolute left-0 top-0 flex w-full items-start justify-between p-6 md:p-12">
          <div className="flex items-baseline gap-3">
            <span
              className="font-mono text-xs tracking-[0.4em]"
              style={{ color: vehicle.accent }}
            >
              {num}
            </span>
            <span className="text-xs uppercase tracking-[0.35em] text-white/45">
              {vehicle.marque}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!ready && loadPct < 100 && (
              <span className="font-mono text-[10px] tracking-[0.3em] text-white/35">
                {loadPct}%
              </span>
            )}
            <div className="relative h-9 w-9">
              <div
                ref={dialRef}
                className="absolute inset-0 rounded-full border border-white/15 opacity-0"
                style={{ transition: "opacity 300ms" }}
              >
                <span
                  className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2"
                  style={{ background: vehicle.accent }}
                />
              </div>
              <span
                ref={angleRef}
                className="absolute inset-0 grid place-items-center font-mono text-[9px] text-white/40"
              >
                0°
              </span>
            </div>
          </div>
        </div>

        {/* Headline, revealed as the cover comes off */}
        <div
          ref={titleRef}
          className="pointer-events-none absolute bottom-0 left-0 w-full p-6 opacity-0 md:p-12"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-4xl font-semibold leading-[0.95] tracking-tight text-white md:text-7xl">
                {vehicle.model}
              </h2>
              <p
                className="mt-3 text-lg font-light italic md:text-2xl"
                style={{ color: vehicle.accent }}
              >
                {vehicle.tagline}
              </p>
              <p className="mt-4 hidden text-sm leading-relaxed text-white/55 md:block">
                {vehicle.body}
              </p>
            </div>

            <div ref={specsRef} className="opacity-0">
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-2">
                {vehicle.specs.map((s) => (
                  <div key={s.label} className="border-t border-white/10 pt-2">
                    <dt className="text-[10px] uppercase tracking-[0.25em] text-white/35">
                      {s.label}
                    </dt>
                    <dd className="mt-0.5 text-sm text-white/85">{s.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 font-mono text-[10px] tracking-[0.25em] text-white/30">
                {vehicle.colour.toUpperCase()} · {vehicle.plate.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
