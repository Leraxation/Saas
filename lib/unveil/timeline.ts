import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { SceneParams } from "./scene";

/**
 * The sequence.
 *
 * One GSAP timeline, ten beats long, scrubbed by one ScrollTrigger that pins
 * the stage for `SCROLL_LENGTH` viewport-heights. Every number the scene
 * reads and every line of type on top of it is a tween on this timeline, so
 * the car, the camera, the lamps and the copy are phase-locked and reverse
 * together when the user scrolls back.
 *
 * Positions are absolute (in beats) rather than chained, so a beat can be
 * moved without the ones after it sliding.
 */

gsap.registerPlugin(ScrollTrigger);

export const TOTAL = 10;
/** How far the user scrolls while the stage is pinned, in viewport heights. */
export const SCROLL_LENGTH = 7.5;

export const CHAPTERS = [
  { id: "cover", at: 0.0, index: "01", title: "Under cover" },
  { id: "reveal", at: 3.3, index: "02", title: "The reveal" },
  { id: "anatomy", at: 5.4, index: "03", title: "Anatomy" },
  { id: "assembly", at: 7.4, index: "04", title: "Assembly" },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];

export type TimelineDom = {
  /** The section ScrollTrigger pins. */
  trigger: HTMLElement;
  cue: HTMLElement | null;
  chapters: Partial<Record<ChapterId | "finale", HTMLElement | null>>;
  callouts: HTMLElement[];
  onUpdate?: (progress: number, chapter: number) => void;
};

const HIDE_BELOW = "inset(0% 0% 100% 0%)";
const SHOW = "inset(0% 0% 0% 0%)";
const HIDE_ABOVE = "inset(100% 0% 0% 0%)";

export function buildTimeline(p: SceneParams, dom: TimelineDom, opts: { reducedMotion?: boolean } = {}) {
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: dom.trigger,
      start: "top top",
      end: () => `+=${window.innerHeight * SCROLL_LENGTH}`,
      scrub: opts.reducedMotion ? true : 0.8,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (st) => {
        const t = st.progress * TOTAL;
        let ch = 0;
        for (let i = 0; i < CHAPTERS.length; i++) if (t >= CHAPTERS[i].at) ch = i;
        dom.onUpdate?.(st.progress, ch);
      },
    },
  });

  // Keep the timeline exactly TOTAL beats long whatever the last tween is.
  tl.set({}, {}, TOTAL);

  /* ── Beat 0–0.8 · Under cover ─────────────────────────────────────────── */
  tl.to(p, { rad: 7.2, duration: 0.8, ease: "sine.inOut" }, 0);
  if (dom.cue) tl.to(dom.cue, { clipPath: HIDE_ABOVE, y: -10, duration: 0.5, ease: "power2.in" }, 0.3);

  /* ── Beat 0.8–3.6 · The pull ──────────────────────────────────────────── */
  tl.to(p, { pull: 1, duration: 2.8, ease: "power2.inOut" }, 0.8);
  tl.to(p, { top: 0.22, duration: 1.6, ease: "sine.inOut" }, 1.6);
  tl.to(p, { key: 1.1, warmth: 0.85, duration: 1.8, ease: "sine.inOut" }, 1.6);
  tl.to(p, { fill: 0.35, duration: 1.6, ease: "sine.inOut" }, 2.0);
  tl.to(p, { ring: 1, duration: 1.4, ease: "sine.inOut" }, 2.0);
  tl.to(p, { env: 1, duration: 1.8, ease: "sine.inOut" }, 1.8);
  tl.to(p, { exposure: 1.02, duration: 2.0, ease: "sine.inOut" }, 1.6);
  tl.to(p, { rim: 1, duration: 1.4, ease: "sine.inOut" }, 2.4);
  tl.to(p, { headlamp: 3.2, duration: 0.3, ease: "power3.out" }, 2.7);
  tl.to(p, { taillamp: 2.4, duration: 0.3, ease: "power3.out" }, 2.9);
  tl.to(p, { lift: 1, duration: 0.9, ease: "power2.in" }, 3.1);
  tl.to(p, { coverAlpha: 0, duration: 0.5, ease: "sine.in" }, 3.45);
  // Camera: high frontal → front three-quarter → low raking side.
  tl.to(p, { ang: 0.6, rad: 6.3, h: 1.15, fov: 36, duration: 1.6, ease: "sine.inOut" }, 0.8);
  tl.to(p, { ang: 1.12, rad: 5.2, h: 0.78, fov: 38, ty: 0.5, duration: 1.4, ease: "sine.inOut" }, 2.4);

  /* ── Beat 3.8–5.4 · Orbit ─────────────────────────────────────────────── */
  tl.to(p, { ang: 3.85, rad: 6.0, h: 1.25, duration: 1.6, ease: "power1.inOut" }, 3.8);
  tl.to(p, { key: 0.75, warmth: 0.45, duration: 1.2, ease: "sine.inOut" }, 4.0);
  tl.to(p, { rim: 1.7, duration: 1.0, ease: "sine.inOut" }, 4.2);

  /* ── Beat 5.4–7.4 · Anatomy ───────────────────────────────────────────── */
  tl.to(p, { explode: 1, duration: 1.5, ease: "power2.inOut" }, 5.6);
  tl.to(p, { cells: 1.6, duration: 0.6, ease: "sine.out" }, 6.2);
  tl.to(p, { ang: 5.6, rad: 7.7, h: 3.6, fov: 40, ty: 0.75, duration: 2.0, ease: "sine.inOut" }, 5.4);
  tl.to(p, { key: 0.6, fill: 0.6, rim: 1.2, exposure: 1.08, warmth: 0.35, duration: 1.4, ease: "sine.inOut" }, 5.6);

  /* ── Beat 7.4–9.0 · Assembly ──────────────────────────────────────────── */
  tl.to(p, { cells: 0, duration: 0.5, ease: "sine.in" }, 7.4);
  tl.to(p, { explode: 0, duration: 1.3, ease: "power3.inOut" }, 7.5);
  tl.to(p, { ang: 6.75, rad: 6.5, h: 0.62, fov: 32, ty: 0.52, duration: 1.6, ease: "sine.inOut" }, 7.4);
  tl.to(p, { key: 1.25, warmth: 0.9, fill: 0.3, rim: 1.0, ring: 0.7, exposure: 1.05, duration: 1.4, ease: "sine.inOut" }, 7.6);

  /* ── Beat 9.0–10 · Finale ─────────────────────────────────────────────── */
  tl.to(p, { ang: 6.32, rad: 8.2, h: 0.8, fov: 28, ty: 0.15, duration: 1.0, ease: "sine.inOut" }, 9.0);
  tl.to(p, { headlamp: 4.5, duration: 0.5, ease: "sine.inOut" }, 9.3);

  /* ── Type ─────────────────────────────────────────────────────────────── */
  const lines = (el: HTMLElement | null | undefined) => (el ? Array.from(el.querySelectorAll<HTMLElement>("[data-line]")) : []);
  const display = (el: HTMLElement | null | undefined) => (el ? Array.from(el.querySelectorAll<HTMLElement>("[data-display]")) : []);

  const ch = dom.chapters;

  // 01 · Under cover: present from the start, wiped away as the fabric lets go.
  const c0 = lines(ch.cover);
  gsap.set(c0, { clipPath: SHOW });
  tl.to(c0, { clipPath: HIDE_ABOVE, y: -14, duration: 0.5, stagger: 0.06, ease: "power2.in" }, 1.0);

  // 02 · The reveal: the model name is unmasked as the cover leaves frame,
  // its tracking tightening as it lands.
  const c1 = lines(ch.reveal);
  const d1 = display(ch.reveal);
  gsap.set(c1, { clipPath: HIDE_BELOW, y: 28 });
  gsap.set(d1, { letterSpacing: "0.32em" });
  tl.to(c1, { clipPath: SHOW, y: 0, duration: 0.7, stagger: 0.12, ease: "power3.out" }, 3.45);
  tl.to(d1, { letterSpacing: "0.04em", duration: 1.0, ease: "power2.out" }, 3.45);
  tl.to(c1, { clipPath: HIDE_ABOVE, y: -20, duration: 0.5, stagger: 0.05, ease: "power2.in" }, 5.0);

  // 03 · Anatomy: label, then the callouts draw out from their parts.
  const c2 = lines(ch.anatomy);
  gsap.set(c2, { clipPath: HIDE_BELOW, y: 20 });
  tl.to(c2, { clipPath: SHOW, y: 0, duration: 0.5, stagger: 0.1, ease: "power3.out" }, 5.6);
  tl.to(c2, { clipPath: HIDE_ABOVE, y: -16, duration: 0.4, stagger: 0.05, ease: "power2.in" }, 7.25);

  const callLines = dom.callouts.map((c) => c.querySelector<HTMLElement>("[data-leader]"));
  const callText = dom.callouts.map((c) => c.querySelector<HTMLElement>("[data-label]"));
  const callDots = dom.callouts.map((c) => c.querySelector<HTMLElement>("[data-dot]"));
  gsap.set(callLines, { scaleX: 0 });
  gsap.set(callText, { clipPath: HIDE_BELOW, y: 8 });
  gsap.set(callDots, { scale: 0 });
  tl.to(callDots, { scale: 1, duration: 0.2, stagger: 0.1, ease: "back.out(2)" }, 6.45);
  tl.to(callLines, { scaleX: 1, duration: 0.3, stagger: 0.1, ease: "power2.out" }, 6.55);
  tl.to(callText, { clipPath: SHOW, y: 0, duration: 0.3, stagger: 0.1, ease: "power2.out" }, 6.7);
  tl.to(callText, { clipPath: HIDE_ABOVE, y: -6, duration: 0.25, stagger: 0.04, ease: "power2.in" }, 7.25);
  tl.to(callLines, { scaleX: 0, duration: 0.25, stagger: 0.04, ease: "power2.in" }, 7.3);
  tl.to(callDots, { scale: 0, duration: 0.2, stagger: 0.04, ease: "power2.in" }, 7.35);

  // 04 · Assembly: a single line while the parts return.
  const c3 = lines(ch.assembly);
  gsap.set(c3, { clipPath: HIDE_BELOW, y: 20 });
  tl.to(c3, { clipPath: SHOW, y: 0, duration: 0.5, stagger: 0.1, ease: "power3.out" }, 7.7);
  tl.to(c3, { clipPath: HIDE_ABOVE, y: -16, duration: 0.4, stagger: 0.05, ease: "power2.in" }, 8.85);

  // Finale: headline and the invitation, held.
  const c4 = lines(ch.finale);
  const d4 = display(ch.finale);
  gsap.set(c4, { clipPath: HIDE_BELOW, y: 26 });
  gsap.set(d4, { letterSpacing: "0.2em" });
  tl.to(c4, { clipPath: SHOW, y: 0, duration: 0.6, stagger: 0.12, ease: "power3.out" }, 9.15);
  tl.to(d4, { letterSpacing: "0.02em", duration: 0.8, ease: "power2.out" }, 9.15);

  return tl;
}
