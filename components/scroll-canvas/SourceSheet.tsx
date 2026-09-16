import type { Vehicle } from "@/lib/vehicles/manifest";
import { referenceCount } from "@/lib/vehicles/manifest";
import { generatedAsset } from "@/lib/vehicles/assets";

/**
 * Closing section: the generated hero of each vehicle, plus a written record of
 * which upload part fed which car.
 *
 * The reference photographs themselves are never shown — they live outside
 * `public/` and exist only to inform the generation prompts — so the parts are
 * accounted for in words and counts rather than as a contact sheet.
 */
export default function SourceSheet({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#050506] px-6 py-24 md:px-12 md:py-36">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(90% 60% at 50% 0%, rgba(255,255,255,0.05) 0%, rgba(5,5,6,0) 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/35">
          The collection
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
          Everything, uncovered.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/50">
          Each vehicle was rendered into the same lit stage — black ground, one
          hard spotlight, a full orbit — so the collection reads as one film
          rather than a folder of photographs.
        </p>

        <div className="mt-14 grid gap-10 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle) => {
            const hero = generatedAsset(vehicle.display.hero);
            return (
            <article key={vehicle.id}>
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/60">
                {hero ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={hero}
                    alt={`${vehicle.marque} ${vehicle.model}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="grid h-full w-full place-items-center"
                    style={{
                      background:
                        "radial-gradient(70% 55% at 50% 66%, rgba(255,255,255,0.07) 0%, rgba(5,5,6,0) 72%), #08080b",
                    }}
                  >
                    <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/25">
                      Render pending
                    </span>
                  </div>
                )}
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5"
                  style={{ background: vehicle.accent }}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-baseline gap-3">
                <h3 className="text-sm uppercase tracking-[0.3em] text-white/75">
                  {vehicle.marque} {vehicle.shortName}
                </h3>
                {vehicle.plate && (
                  <span className="font-mono text-[10px] text-white/30">{vehicle.plate}</span>
                )}
              </div>

              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-white/10 pt-3">
                <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/38">
                  Parts
                </dt>
                <dd className="font-mono text-[11px] text-white/70">
                  {vehicle.sources.map((s) => s.part.replace("-", " ")).join(" + ")}
                </dd>

                <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/38">
                  References
                </dt>
                <dd className="font-mono text-[11px] text-white/70">
                  {referenceCount(vehicle)} photographs, not displayed
                </dd>

                <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/38">
                  Cover
                </dt>
                <dd className="text-[12px] text-white/60">{vehicle.brief.cover}</dd>
              </dl>

              {vehicle.sources
                .filter((s) => s.note)
                .map((s) => (
                  <p key={s.part} className="mt-3 text-[11px] italic text-white/35">
                    {s.note}
                  </p>
                ))}
            </article>
            );
          })}
        </div>

        <footer className="mt-24 flex flex-col gap-2 border-t border-white/10 pt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 md:flex-row md:items-center md:justify-between">
          <span>Private collection &middot; Sultanate of Oman</span>
          <span>Figures as published by the manufacturer</span>
        </footer>
      </div>
    </section>
  );
}
