"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The scroll engine behind the canvas stage.
 *
 * Design notes
 * ------------
 * - A single requestAnimationFrame loop owns all motion. Components never
 *   animate on their own timers, so everything stays phase-locked.
 * - Scroll position is critically damped toward the real value. That damping
 *   is what makes the canvas feel like film rather than a scrollbar.
 * - Values live in refs, not state, so scrolling never triggers a React
 *   render. Only the coarse "current act" is state.
 * - The loop measures its own frame cost and drops quality tiers if the
 *   machine cannot hold the frame budget — a projector laptop must never
 *   stutter in front of a room.
 */

export type QualityTier = "high" | "medium" | "low";

export type StageState = {
  /** Damped scrollY, in pixels. */
  scroll: number;
  /** Damped progress through the whole document, 0..1. */
  progress: number;
  /** Seconds since mount, for ambient motion. */
  time: number;
  /** Local 0..1 progress for each registered act, keyed by act id. */
  acts: Record<string, number>;
  /** Viewport. */
  w: number;
  h: number;
  dpr: number;
  quality: QualityTier;
  /** True when the user has asked for reduced motion. */
  calm: boolean;
};

export type StageApi = {
  state: React.MutableRefObject<StageState>;
  registerAct: (id: string, el: HTMLElement | null) => void;
  /** Subscribe to the shared rAF loop. Returns an unsubscribe function. */
  subscribe: (fn: (s: StageState) => void) => () => void;
  /** Index of the act currently filling the viewport. */
  activeIndex: number;
  /** Smooth-scroll to an act by index. */
  goTo: (index: number) => void;
  actCount: number;
};

const DAMPING = 0.16;

export function useStage(actIds: string[]): StageApi {
  const els = useRef<Record<string, HTMLElement | null>>({});
  /** Document-relative geometry per act, remeasured on layout changes. */
  const geom = useRef<Record<string, { top: number; height: number }>>({});
  const subs = useRef(new Set<(s: StageState) => void>());
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef(0);

  const state = useRef<StageState>({
    scroll: 0,
    progress: 0,
    time: 0,
    acts: {},
    w: 0,
    h: 0,
    dpr: 1,
    quality: "high",
    calm: false,
  });

  const registerAct = useCallback((id: string, el: HTMLElement | null) => {
    els.current[id] = el;
  }, []);

  /**
   * Measure each act against the document, not its offsetParent.
   * offsetTop is relative to the nearest positioned ancestor, which here is
   * the page wrapper — close enough to right that it hides in testing and
   * wrong enough to shift every act's progress. getBoundingClientRect plus
   * scrollY is unambiguous.
   */
  const remeasure = useCallback(() => {
    const y = window.scrollY;
    for (const id of Object.keys(els.current)) {
      const el = els.current[id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      geom.current[id] = { top: r.top + y, height: r.height };
    }
  }, []);

  const subscribe = useCallback((fn: (s: StageState) => void) => {
    subs.current.add(fn);
    return () => {
      subs.current.delete(fn);
    };
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const id = actIds[Math.max(0, Math.min(actIds.length - 1, index))];
      const g = geom.current[id];
      if (!g) return;
      window.scrollTo({ top: g.top + 2, behavior: "smooth" });
    },
    [actIds],
  );

  useEffect(() => {
    const s = state.current;
    const calmQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    s.calm = calmQuery.matches;
    const onCalm = () => {
      s.calm = calmQuery.matches;
    };
    calmQuery.addEventListener("change", onCalm);

    const measure = () => {
      s.w = window.innerWidth;
      s.h = window.innerHeight;
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      remeasure();
    };
    measure();
    // Web fonts and the film metadata can both land after first paint and
    // change layout, so measure again once things have settled.
    const settle = window.setTimeout(measure, 400);
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    // Start already settled so the first frame is not an animation from zero.
    s.scroll = window.scrollY;

    let raf = 0;
    const t0 = performance.now();
    let last = t0;
    // Rolling frame-cost average, used to step quality down (never up, so the
    // tier cannot oscillate visibly mid-presentation).
    let avgFrame = 16.7;
    let sinceCheck = 0;

    const loop = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      s.time = (now - t0) / 1000;

      avgFrame += (dt - avgFrame) * 0.05;
      sinceCheck += dt;
      if (sinceCheck > 2500) {
        sinceCheck = 0;
        if (avgFrame > 34 && s.quality === "high") s.quality = "medium";
        else if (avgFrame > 52 && s.quality === "medium") s.quality = "low";
      }

      const target = window.scrollY;
      // Frame-rate independent damping.
      const k = 1 - Math.pow(1 - DAMPING, dt / 16.7);
      s.scroll += (target - s.scroll) * (s.calm ? 1 : k);
      if (Math.abs(target - s.scroll) < 0.05) s.scroll = target;

      const doc = Math.max(1, document.body.scrollHeight - s.h);
      s.progress = Math.min(1, Math.max(0, s.scroll / doc));

      let active = 0;
      for (let i = 0; i < actIds.length; i++) {
        const id = actIds[i];
        const g = geom.current[id];
        if (!g) {
          s.acts[id] = 0;
          continue;
        }
        const top = g.top;
        const span = Math.max(1, g.height - s.h);
        const p = (s.scroll - top) / span;
        s.acts[id] = Math.min(1, Math.max(0, p));
        // The act filling the viewport is the last one whose top we passed.
        if (s.scroll + s.h * 0.45 >= top) active = i;
      }

      if (active !== activeRef.current) {
        activeRef.current = active;
        setActiveIndex(active);
      }

      subs.current.forEach((fn) => fn(s));
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      calmQuery.removeEventListener("change", onCalm);
    };
  }, [actIds, remeasure]);

  return { state, registerAct, subscribe, activeIndex, goTo, actCount: actIds.length };
}

/* ── Easing helpers shared by the scenes ─────────────────────────────────── */

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Map x from [a,b] into [0,1], clamped. */
export const range = (x: number, a: number, b: number) => clamp01((x - a) / (b - a || 1));

/** Rise, hold, fall — for beats that appear and leave. */
export const pulse = (x: number, a: number, b: number, c: number, d: number) =>
  Math.min(range(x, a, b), 1 - range(x, c, d));

export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeInOut = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const easeOutBack = (x: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};
