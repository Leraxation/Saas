import type { Metadata } from "next";
import { VEHICLES } from "@/lib/vehicles/manifest";
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
  const heroPlate = VEHICLES[1]?.sources[0].images[2] ?? VEHICLES[0].sources[0].images[0];
  const sheetPlate = VEHICLES[0].sources[0].images[2] ?? VEHICLES[0].sources[0].images[0];

  return (
    <main className="relative text-white antialiased">
      <div className="fixed inset-0 -z-30 bg-[#050506]" aria-hidden />

      <ScrollCanvas vehicles={VEHICLES} />
      <ProgressRail vehicles={VEHICLES} />

      <CollectionHero count={VEHICLES.length} plate={heroPlate} />
      {VEHICLES.map((vehicle) => (
        <VehicleSection key={vehicle.id} vehicle={vehicle} />
      ))}
      <SourceSheet vehicles={VEHICLES} plate={sheetPlate} />
    </main>
  );
}
