"use client";

import { useEffect, useRef } from "react";

/**
 * Opening panel. The title sheet lifts on first scroll, which sets up the
 * same gesture every vehicle section then repeats.
 */
export default function GarageHero({ count }: { count: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const rect = root.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      if (innerRef.current) {
        innerRef.current.style.opacity = String(1 - p * 1.4);
        innerRef.current.style.transform = `translateY(${-p * 60}px) scale(${1 - p * 0.06})`;
      }
      if (cueRef.current) cueRef.current.style.opacity = String(1 - p * 3);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section ref={rootRef} className="relative h-[180vh] bg-[#050506]">
      <div className="sticky top-0 grid h-screen place-items-center overflow-hidden">
        {/* Slow sweep of light across the empty floor */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              "radial-gradient(120% 70% at 50% 120%, rgba(255,255,255,0.11) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        <div
          ref={innerRef}
          className="relative px-6 text-center"
          style={{ willChange: "transform, opacity" }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.6em] text-white/40">
            Muscat · Private Collection
          </p>
          <h1 className="mt-6 text-[13vw] font-semibold leading-[0.85] tracking-tighter text-white md:text-[9vw]">
            UNDER
            <br />
            <span className="text-white/25">COVER</span>
          </h1>
          <p className="mx-auto mt-8 max-w-md text-sm leading-relaxed text-white/45">
            {count} machines, each one sealed under a sheet. Scroll to pull the covers
            away and turn them through a full three hundred and sixty degrees.
          </p>
        </div>

        <div
          ref={cueRef}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/35">
            Scroll
          </span>
          <div className="mx-auto mt-3 h-10 w-px overflow-hidden bg-white/10">
            <div className="h-4 w-px animate-[cueDrop_1.8s_ease-in-out_infinite] bg-white/60" />
          </div>
        </div>
      </div>
    </section>
  );
}
