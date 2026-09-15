import type { Vehicle } from "@/lib/garage/vehicles";

/** Closing contact sheet — every frame the collection was built from. */
export default function StillsGrid({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <section className="relative bg-[#050506] px-6 py-24 md:px-12 md:py-36">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/35">
          Contact sheet
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
          Everything, uncovered.
        </h2>

        {vehicles.map((v) => (
          <div key={v.slug} className="mt-16">
            <div className="flex items-baseline gap-4 border-b border-white/10 pb-3">
              <h3 className="text-sm uppercase tracking-[0.3em] text-white/70">
                {v.marque} {v.shortName}
              </h3>
              <span className="font-mono text-[10px] text-white/30">{v.plate}</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              {v.stills.map((src) => (
                <figure
                  key={src}
                  className="group relative aspect-[4/3] overflow-hidden rounded-sm bg-black/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${v.marque} ${v.shortName}`}
                    loading="lazy"
                    className="h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-[1.04] group-hover:opacity-100"
                  />
                  <span
                    className="absolute inset-x-0 bottom-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ background: v.accent }}
                  />
                </figure>
              ))}
            </div>
          </div>
        ))}

        <footer className="mt-24 flex flex-col gap-2 border-t border-white/10 pt-8 text-[11px] text-white/30 md:flex-row md:items-center md:justify-between">
          <span>Private collection · Sultanate of Oman</span>
          <span className="font-mono">
            Spec figures are manufacturer published figures for the model.
          </span>
        </footer>
      </div>
    </section>
  );
}
