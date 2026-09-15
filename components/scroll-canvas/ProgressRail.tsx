"use client";

import { useEffect, useRef, useState } from "react";
import type { Vehicle } from "@/lib/vehicles/manifest";

/** Fixed rail: scroll depth, plus which vehicle currently holds the canvas. */
export default function ProgressRail({ vehicles }: { vehicles: Vehicle[] }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barRef.current) {
        barRef.current.style.transform = `scaleY(${max > 0 ? window.scrollY / max : 0})`;
      }
    };
    raf = requestAnimationFrame(tick);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = vehicles.findIndex((v) => v.id === e.target.id);
          if (i >= 0) setActive(i);
        });
      },
      { threshold: 0.35 },
    );
    vehicles.forEach((v) => {
      const el = document.getElementById(v.id);
      if (el) io.observe(el);
    });

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [vehicles]);

  return (
    <aside className="pointer-events-none fixed left-0 top-0 z-40 hidden h-screen w-28 flex-col justify-center gap-6 pl-6 md:flex">
      <div className="relative h-36 w-px bg-white/10">
        <div
          ref={barRef}
          className="absolute inset-0 origin-top bg-white/70"
          style={{ transform: "scaleY(0)" }}
        />
      </div>
      <ul className="pointer-events-auto flex flex-col gap-3">
        {vehicles.map((v, i) => (
          <li key={v.id}>
            <a
              href={`#${v.id}`}
              className="block font-mono text-[10px] uppercase tracking-[0.2em] transition-colors"
              style={{ color: active === i ? v.accent : "rgba(255,255,255,0.28)" }}
            >
              {v.shortName}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
