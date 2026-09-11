"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { StageApi } from "@/lib/vision2040/useStage";
import { clamp01, easeOut, range } from "@/lib/vision2040/useStage";
import type { Figure } from "@/lib/vision2040/data";

/**
 * An act: a tall scroll region with a pinned viewport-height frame inside it.
 * The height is what buys the act its share of the scroll, so it is also
 * what controls pacing. Longer act, slower beat.
 */
export function Act({
  api,
  id,
  vh,
  children,
  className,
}: {
  api: StageApi;
  id: string;
  vh: number;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    api.registerAct(id, ref.current);
    return () => api.registerAct(id, null);
  }, [api, id]);

  return (
    <section
      ref={ref}
      id={id}
      className={`v-act${className ? ` ${className}` : ""}`}
      style={{ height: `${vh}vh` }}
    >
      <div className="v-act__pin">{children}</div>
    </section>
  );
}

/**
 * A beat inside an act: appears over `[from, from+fade]` and leaves over
 * `[to-fade, to]` of that act's local scroll progress.
 *
 * Written straight to the DOM from the shared rAF loop — a beat never causes
 * a React render, so a page of forty beats costs nothing to scroll.
 */
export function Beat({
  api,
  act,
  from,
  to,
  children,
  className,
  lift = 30,
  hold,
}: {
  api: StageApi;
  act: string;
  from: number;
  to: number;
  children: ReactNode;
  className?: string;
  /** Pixels the beat travels as it arrives. */
  lift?: number;
  /** Stay visible to the end of the act instead of fading out. */
  hold?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    return api.subscribe((s) => {
      const el = ref.current;
      if (!el) return;
      const p = s.acts[act] ?? 0;
      const span = to - from || 1;
      const local = (p - from) / span;
      // A beat anchored at the very start of its act is already on screen when
      // the act arrives. That is what covers the hand-off: the previous act's
      // pinned frame is still scrolling up while this one rises into view, so
      // the screen is never empty between sections.
      const inn = from <= 0 ? 1 : easeOut(range(local, 0, 0.26));
      const out = hold ? 0 : range(local, 0.78, 1);
      const o = clamp01(Math.min(inn, 1 - out));
      el.style.opacity = String(o);
      // Written as a custom property, not a transform: the stylesheet composes
      // it with whatever centring that panel needs, so an inline transform can
      // never wipe out a translate(-50%) and drop a panel out of place.
      el.style.setProperty("--beat-y", `${(1 - o) * lift}px`);
      el.style.visibility = o < 0.008 ? "hidden" : "visible";
      el.style.pointerEvents = o < 0.4 ? "none" : "auto";
    });
  }, [api, act, from, to, lift, hold]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0, visibility: "hidden" }}>
      {children}
    </div>
  );
}

/**
 * A figure that counts up as its act is scrolled.
 *
 * An unverified figure always carries a visible "illustrative" tag. That tag
 * is deliberate: it is the thing that stops a placeholder being read out as
 * an official statistic. It disappears the moment `verified` is set true.
 */
export function Counter({
  api,
  act,
  figure,
  from = 0.15,
  to = 0.6,
}: {
  api: StageApi;
  act: string;
  figure: Figure;
  from?: number;
  to?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    return api.subscribe((s) => {
      const el = ref.current;
      if (!el) return;
      const p = s.acts[act] ?? 0;
      const v = figure.value * easeOut(range(p, from, to));
      const next = v.toFixed(figure.decimals ?? 0);
      if (el.textContent !== next) el.textContent = next;
    });
  }, [api, act, figure, from, to]);

  return (
    <div className="v-figure">
      <div className="v-figure__value">
        {figure.prefix && <span className="v-figure__affix">{figure.prefix}</span>}
        <span ref={ref}>{(0).toFixed(figure.decimals ?? 0)}</span>
        {figure.suffix && <span className="v-figure__affix">{figure.suffix}</span>}
      </div>
      <div className="v-figure__label">
        {figure.label}
        {!figure.verified && <span className="v-tag">illustrative</span>}
      </div>
      {figure.note && <div className="v-figure__note">{figure.note}</div>}
      <div className="v-figure__source">{figure.source}</div>
    </div>
  );
}

/** Small eyebrow label used above every act heading. */
export function Kicker({ children }: { children: ReactNode }) {
  return <span className="v-kicker">{children}</span>;
}
