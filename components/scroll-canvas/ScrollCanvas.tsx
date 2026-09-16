"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Vehicle } from "@/lib/vehicles/manifest";
import { detectCapabilities, type Capabilities } from "./capabilities";
import { loadRevealSource } from "./revealSource";
import { RevealStage } from "./RevealStage";
import { useSmoothScroll } from "./useSmoothScroll";
import { VehicleTextures } from "./VehicleTextures";

/** Share of each section spent lifting the cover before the orbit runs on. */
const COVER_PHASE = 0.26;
/** How far into a section the dissolve toward the next vehicle begins. */
const HANDOVER = 0.94;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const span = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

type Props = { vehicles: Vehicle[] };

/**
 * The scroll engine. Owns the single WebGL context, decides which vehicle is on
 * screen, and drives both the GPU and the DOM overlays from one rAF pass.
 *
 * Overlays are addressed through data attributes rather than props: they update
 * every frame, and routing that through React state would re-render the tree
 * sixty times a second.
 */
export default function ScrollCanvas({ vehicles }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [loadPct, setLoadPct] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => setCaps(detectCapabilities()), []);
  useSmoothScroll(Boolean(caps && caps.tier !== "fallback" && !caps.reducedMotion));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !caps || caps.tier === "fallback") return;

    gsap.registerPlugin(ScrollTrigger);

    const stage = new RevealStage(canvas, caps);
    const textures = new Map<number, VehicleTextures>();
    const sections: HTMLElement[] = vehicles
      .map((v) => document.querySelector<HTMLElement>(`[data-vehicle-section="${v.id}"]`))
      .filter((el): el is HTMLElement => Boolean(el));

    let disposed = false;
    let activeIndex = 0;
    let firstReady = false;

    /**
     * Keeps decoded imagery for the active vehicle and its neighbours only.
     * Everything else is disposed, so memory stays flat however many parts the
     * manifest grows to.
     */
    const reconcileTextures = (index: number) => {
      const wanted = new Set(
        [index - 1, index, index + 1].filter((i) => i >= 0 && i < vehicles.length),
      );

      textures.forEach((tex, i) => {
        if (!wanted.has(i)) {
          tex.dispose();
          textures.delete(i);
        }
      });

      wanted.forEach((i) => {
        if (textures.has(i)) return;

        // Claim the slot immediately so a second pass does not double-load it.
        const pending = new VehicleTextures({ mode: "none" }, caps.frameStride);
        textures.set(i, pending);

        void (async () => {
          const source = await loadRevealSource(vehicles[i], { preferVideo: caps.preferVideo });
          if (disposed || textures.get(i) !== pending) return;

          const resolved = new VehicleTextures(source, caps.frameStride);
          const isPrimary = i === activeIndex;
          await resolved.load(isPrimary ? (p) => setLoadPct(Math.round(p * 100)) : undefined);

          if (disposed || textures.get(i) !== pending) {
            resolved.dispose();
            return;
          }

          pending.dispose();
          textures.set(i, resolved);

          // The stage is usable once the first vehicle resolves, whether or not
          // anything has been generated for it yet.
          if (!firstReady) {
            firstReady = true;
            setReady(true);
          }
        })();
      });
    };

    /** Section progress, read straight from layout so it survives resizes. */
    const progressOf = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      return travel > 0 ? clamp01(-rect.top / travel) : 0;
    };

    const setOverlay = (id: string, progress: number, visible: boolean) => {
      const root = document.querySelector<HTMLElement>(`[data-overlay="${id}"]`);
      if (!root) return;

      const shown = visible ? span(progress, COVER_PHASE * 0.55, COVER_PHASE + 0.1) : 0;
      const specs = visible ? span(progress, COVER_PHASE + 0.06, COVER_PHASE + 0.3) : 0;
      const out = 1 - span(progress, 0.9, 1);

      root.style.opacity = String(shown * out);
      root.style.transform = `translateY(${(1 - shown) * 26}px)`;

      const specEl = root.querySelector<HTMLElement>("[data-specs]");
      if (specEl) {
        specEl.style.opacity = String(specs * out);
        specEl.style.transform = `translateY(${(1 - specs) * 20}px)`;
      }

      const dial = document.querySelector<HTMLElement>(`[data-dial="${id}"]`);
      if (dial) {
        dial.style.opacity = String(shown * out);
        dial.style.transform = `rotate(${progress * 360}deg)`;
      }

      const angle = document.querySelector<HTMLElement>(`[data-angle="${id}"]`);
      if (angle) angle.textContent = `${Math.round(progress * 360)}°`;
    };

    // Picking the active section from ScrollTrigger rather than polling every
    // section keeps the per-frame work constant as vehicles are added.
    const triggers = sections.map((section, i) =>
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          if (!self.isActive) return;
          activeIndex = i;
          reconcileTextures(i);
        },
      }),
    );

    reconcileTextures(0);

    const onResize = () => {
      stage.resize();
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", onResize);

    const tick = () => {
      if (disposed) return;

      const active = sections[activeIndex];
      if (!active) return;

      const p = progressOf(active);
      const blend = span(p, HANDOVER, 1);

      const a = textures.get(activeIndex);
      const b = textures.get(activeIndex + 1);

      if (a) {
        a.seek(p);
        stage.setTextures("A", a.texture, a.size, vehicles[activeIndex].accent);
      }
      if (b) {
        b.seek(0);
        stage.setTextures("B", b.texture, b.size, vehicles[activeIndex + 1].accent);
      } else if (a) {
        stage.setTextures("B", a.texture, a.size, vehicles[activeIndex].accent);
      }

      // The scrim leads the type: the ground settles first, then the headline
      // arrives onto a prepared backdrop rather than onto a bright floor.
      const overlayIn = span(p, COVER_PHASE * 0.35, COVER_PHASE + 0.02) * (1 - span(p, 0.9, 1));

      stage.setState(
        { a: span(p, 0, COVER_PHASE), b: 0 },
        { a: overlayIn, b: 0 },
        b ? blend : 0,
        gsap.ticker.time,
      );
      stage.render();

      vehicles.forEach((v, i) => setOverlay(v.id, i === activeIndex ? p : 0, i === activeIndex));
    };

    gsap.ticker.add(tick);

    return () => {
      disposed = true;
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", onResize);
      triggers.forEach((t) => t.kill());
      textures.forEach((t) => t.dispose());
      textures.clear();
      stage.dispose();
    };
  }, [caps, vehicles]);

  // No WebGL: the sections fall back to their poster photographs, which the
  // markup already renders behind the canvas.
  if (caps?.tier === "fallback") return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 h-screen w-full"
      />
      {!ready && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-[#050506]">
          <div className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/40">
              Preparing the collection
            </p>
            <div className="mx-auto mt-5 h-px w-40 overflow-hidden bg-white/10">
              <div
                className="h-px bg-white/70 transition-[width] duration-300"
                style={{ width: `${loadPct}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
