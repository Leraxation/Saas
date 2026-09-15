"use client";

import { useEffect, useRef, useState } from "react";
import type { Vehicle } from "@/lib/garage/vehicles";

/** Fixed side rail: overall scroll depth plus which vehicle is on screen. */
export default function ProgressRail({ vehicles }: { vehicles: Vehicle[] }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      if (barRef.current) barRef.current.style.transform = `scaleY(${p})`;
    };
    raf = requestAnimationFrame(tick);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = vehicles.findIndex((v) => v.slug === e.target.id);
          if (i >= 0) setActive(i);
        });
      },
      { threshold: 0.35 },
    );
    vehicles.forEach((v) => {
      const el = document.getElementById(v.slug);
      if (el) io.observe(el);
    });

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [vehicles]);

  return (
    <aside className="pointer-events-none fixed left-0 top-0 z-40 hidden h-screen w-24 flex-col justify-center gap-6 pl-6 md:flex">
      <div className="relative h-40 w-px bg-white/10">
        <div
          ref={barRef}
          className="absolute inset-0 origin-top bg-white/70"
          style={{ transform: "scaleY(0)" }}
        />
      </div>
      <ul className="pointer-events-auto flex flex-col gap-3">
        {vehicles.map((v, i) => (
          <li key={v.slug}>
            <a
              href={`#${v.slug}`}
              className="block text-[10px] uppercase tracking-[0.2em] transition-colors"
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
