import type { Vehicle } from "@/lib/vehicles/manifest";
import { generatedAsset } from "@/lib/vehicles/assets";

/**
 * A vehicle's scroll track. The section itself is a transparent spacer — the
 * imagery is drawn by the shared WebGL canvas behind it — and everything here
 * is the overlay the engine fades in as the cover comes off.
 *
 * The poster sits at the very back so a device without WebGL still sees the
 * vehicle instead of an empty column.
 */
export default function VehicleSection({ vehicle }: { vehicle: Vehicle }) {
  const order = String(vehicle.order).padStart(2, "0");
  // Generated hero only. Reference photographs are never served, so there is
  // nothing else this layer could show; until the hero exists the section
  // renders as an empty lit stage.
  const poster = generatedAsset(vehicle.display.hero) ?? vehicle.remote?.hero ?? null;

  return (
    <section
      data-vehicle-section={vehicle.id}
      id={vehicle.id}
      aria-label={`${vehicle.marque} ${vehicle.model}`}
      className="relative h-[340vh] md:h-[440vh]"
    >
      {/* Behind the canvas: only ever seen when WebGL is unavailable. */}
      <div className="sticky top-0 -z-20 h-0">
        {poster ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={poster}
            alt=""
            aria-hidden
            className="h-screen w-full object-cover opacity-70"
          />
        ) : (
          <div
            aria-hidden
            className="h-screen w-full"
            style={{
              background:
                "radial-gradient(70% 45% at 50% 62%, rgba(255,255,255,0.07) 0%, rgba(5,5,6,0) 70%), #050506",
            }}
          />
        )}
      </div>

      <div className="pointer-events-none sticky top-0 h-screen">
        <div
          data-marque={vehicle.id}
          className="flex items-start justify-between p-6 opacity-0 md:p-12"
        >
          <div className="flex items-baseline gap-3">
            <span
              className="font-mono text-[11px] tracking-[0.34em]"
              style={{ color: vehicle.accent }}
            >
              {order}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">
              {vehicle.marque}
            </span>
          </div>

          <div className="relative h-9 w-9">
            <div
              data-dial={vehicle.id}
              className="absolute inset-0 rounded-full border border-white/15 opacity-0"
            >
              <span
                className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2"
                style={{ background: vehicle.accent }}
              />
            </div>
            <span
              data-angle={vehicle.id}
              className="absolute inset-0 grid place-items-center font-mono text-[9px] text-white/45"
            >
              0&deg;
            </span>
          </div>
        </div>

        <div
          data-overlay={vehicle.id}
          className="absolute bottom-0 left-0 w-full p-6 opacity-0 md:p-12"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-4xl font-semibold leading-[0.88] tracking-tight md:text-7xl">
                {vehicle.model}
              </h2>
              <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.34em] text-white/45">
                {vehicle.designation}
              </p>
              <p
                className="mt-3 text-lg font-light italic md:text-2xl"
                style={{ color: vehicle.accent }}
              >
                {vehicle.tagline}
              </p>
              <p className="mt-4 hidden max-w-lg text-sm leading-relaxed text-white/55 md:block">
                {vehicle.body}
              </p>
            </div>

            <div data-specs className="opacity-0">
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
                {vehicle.specs.map((spec) => (
                  <div key={spec.label} className="border-t border-white/10 pt-2">
                    <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/38">
                      {spec.label}
                    </dt>
                    <dd className="mt-0.5 text-sm tabular-nums text-white/85">{spec.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 font-mono text-[10px] tracking-[0.24em] text-white/32">
                {[vehicle.colour, vehicle.plate]
                  .filter(Boolean)
                  .map((part) => part!.toUpperCase())
                  .join(" \u00B7 ")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
