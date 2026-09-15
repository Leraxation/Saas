import type { Vehicle } from "@/lib/vehicles/manifest";

/**
 * Closing contact sheet, grouped by upload part so the page shows the same
 * structure the manifest and the generation pipeline use.
 */
export default function SourceSheet({ vehicles, plate }: { vehicles: Vehicle[]; plate: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#050506] px-6 py-24 md:px-12 md:py-36">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-fixed opacity-[0.38]"
        style={{
          backgroundImage: `url('${plate}')`,
          backgroundPosition: "center 40%",
          filter: "grayscale(0.85) brightness(0.3)",
        }}
      />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, #050506 0%, rgba(5,5,6,0.72) 34%, rgba(5,5,6,0.88) 100%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/35">
          Source parts
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
          Everything, uncovered.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/50">
          Every photograph that feeds the reveal pipeline, grouped by the upload part
          it arrived in.
        </p>

        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="mt-16">
            <div className="flex flex-wrap items-baseline gap-4 border-b border-white/10 pb-3">
              <h3 className="text-sm uppercase tracking-[0.3em] text-white/70">
                {vehicle.marque} {vehicle.shortName}
              </h3>
              <span className="font-mono text-[10px] text-white/30">{vehicle.plate}</span>
            </div>

            {vehicle.sources.map((source) => (
              <div key={source.part} className="mt-6">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.3em]"
                    style={{ color: vehicle.accent }}
                  >
                    {source.part.replace("-", " ")}
                  </span>
                  <span className="font-mono text-[10px] text-white/30">
                    {source.images.length} {source.images.length === 1 ? "photo" : "photos"}
                  </span>
                  {source.note && (
                    <span className="text-[11px] italic text-white/35">{source.note}</span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                  {source.images.map((src) => (
                    <figure
                      key={src}
                      className="group relative m-0 aspect-[4/3] max-w-full overflow-hidden bg-black/40"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`${vehicle.marque} ${vehicle.shortName}`}
                        loading="lazy"
                        className="h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-[1.04] group-hover:opacity-100"
                      />
                      <span
                        className="absolute inset-x-0 bottom-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                        style={{ background: vehicle.accent }}
                      />
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        <footer className="mt-24 flex flex-col gap-2 border-t border-white/10 pt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 md:flex-row md:items-center md:justify-between">
          <span>Private collection &middot; Sultanate of Oman</span>
          <span>Figures as published by the manufacturer</span>
        </footer>
      </div>
    </section>
  );
}
