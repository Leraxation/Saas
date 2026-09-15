import type { Metadata } from "next";
import { VEHICLES } from "@/lib/garage/vehicles";
import GarageHero from "@/components/garage/GarageHero";
import ProgressRail from "@/components/garage/ProgressRail";
import StillsGrid from "@/components/garage/StillsGrid";
import VehicleReveal from "@/components/garage/VehicleReveal";

export const metadata: Metadata = {
  title: "Under Cover — Private Collection",
  description:
    "A scroll-driven canvas showcase: each vehicle turns through a full 360 as its cover is pulled away.",
};

export default function GaragePage() {
  return (
    <main className="bg-[#050506] text-white antialiased">
      <ProgressRail vehicles={VEHICLES} />
      <GarageHero count={VEHICLES.length} />
      {VEHICLES.map((v, i) => (
        <VehicleReveal key={v.slug} vehicle={v} index={i} />
      ))}
      <StillsGrid vehicles={VEHICLES} />
    </main>
  );
}
