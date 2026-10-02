import { Fragment } from "react";
import type { Metadata } from "next";
import { VEHICLES } from "@/lib/vehicles/manifest";
import { generatedAsset } from "@/lib/vehicles/assets";
import CollectionHero from "@/components/scroll-canvas/CollectionHero";
import ProgressRail from "@/components/scroll-canvas/ProgressRail";
import ScrollCanvas from "@/components/scroll-canvas/ScrollCanvas";
import SourceSheet from "@/components/scroll-canvas/SourceSheet";
import VehicleSection from "@/components/scroll-canvas/VehicleSection";

export const metadata: Metadata = {
  title: "Under Cover — Private Collection",
  description:
    "A scroll-driven WebGL canvas: each vehicle turns through a full 360 as its cover lifts away.",
};

/**
 * The vehicle sections are transparent spacers; ScrollCanvas paints them from a
 * single fixed WebGL context behind the page, so the hero and the closing sheet
 * carry their own opaque backgrounds to hide it at either end.
 */
export default function CollectionPage() {
  // The hero backdrop is a generated still, like everything else on the page.
  // Null until it has been rendered, which leaves the opener black by design.
  const heroPlate =
    generatedAsset(VEHICLES[0].display.hero) ?? VEHICLES[0].remote?.hero ?? null;

  return (
    <main className="relative text-white antialiased">
      <div className="fixed inset-0 -z-30 bg-[#050506]" aria-hidden />

      <ScrollCanvas vehicles={VEHICLES} />
      <ProgressRail vehicles={VEHICLES} />

      <CollectionHero count={VEHICLES.length} plate={heroPlate} />

      {VEHICLES.map((vehicle, i) => (
        <Fragment key={vehicle.id}>
          {/* Black space between vehicles: the canvas has already faded out by
              here, so one reveal ends in the dark before the next begins. */}
          {i > 0 && <div className="h-[50vh] bg-[#050506]" aria-hidden />}
          <VehicleSection vehicle={vehicle} />
        </Fragment>
      ))}

      <div className="h-[50vh] bg-[#050506]" aria-hidden />
      <SourceSheet vehicles={VEHICLES} />
    </main>
  );
}
