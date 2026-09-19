"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

/**
 * Momentum scrolling wired into GSAP's ticker and ScrollTrigger.
 *
 * Lenis owns the scroll position, GSAP's ticker owns the clock, and
 * ScrollTrigger is told to update from Lenis rather than from native scroll
 * events — otherwise the two run on separate clocks and the canvas lags the
 * overlay by a frame. Disabled outright under prefers-reduced-motion, where
 * native scrolling is the correct behaviour.
 */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.15,
      // Long, soft tail: the weight is what makes the orbit feel cinematic.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [enabled]);
}
