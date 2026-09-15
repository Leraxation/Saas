export type Spec = { label: string; value: string };

export type Vehicle = {
  slug: string;
  /** Short name used in nav + progress rail */
  shortName: string;
  marque: string;
  model: string;
  /** Headline shown as the cover is pulled away */
  tagline: string;
  /** Two or three sentences of section copy */
  body: string;
  plate: string;
  colour: string;
  /** Hex used for the section accent + veil tint */
  accent: string;
  /** Deep background tone for the section */
  backdrop: string;
  /** Manufacturer figures for the model, not a reading from this car */
  specs: Spec[];
  /** Ordered stills; [0] is the poster used before the reveal media loads */
  stills: string[];
  /**
   * Subset of `stills` used for scroll scrubbing before a 360 render exists.
   * Portrait shots crop badly full-bleed, so they stay on the contact sheet only.
   */
  scrub: string[];
};

/**
 * Spec figures are the manufacturer's published figures for the model.
 * They are not measurements taken from these individual vehicles.
 */
export const VEHICLES: Vehicle[] = [
  {
    slug: "vrod-muscle",
    shortName: "V-Rod Muscle",
    marque: "Harley-Davidson",
    model: "V-Rod Muscle — VRSCF",
    tagline: "Liquid-cooled heresy.",
    body:
      "Porsche helped build the Revolution engine, and Milwaukee never quite forgave it. The V-Rod Muscle answers the question no other Harley asks: what if a cruiser were shaped entirely by the air moving past it? Slammed, shaved and finished in gloss black, it sits on a 240-section rear tyre that makes the whole machine look like it is leaning on something.",
    plate: "Oman · LK 8728",
    colour: "Vivid Black",
    accent: "#c8a24a",
    backdrop: "#07070a",
    specs: [
      { label: "Engine", value: "1250cc Revolution 60° V-twin" },
      { label: "Cooling", value: "Liquid-cooled, DOHC, 4v" },
      { label: "Power", value: "122 hp @ 8,250 rpm" },
      { label: "Torque", value: "113 Nm @ 7,000 rpm" },
      { label: "Gearbox", value: "5-speed, belt final drive" },
      { label: "Rear tyre", value: "240/40 R18" },
    ],
    stills: [
      "/garage/vrod-muscle/stills/05-right-profile-sunlit.jpg",
      "/garage/vrod-muscle/stills/03-front-quarter.jpg",
      "/garage/vrod-muscle/stills/01-rear-quarter.jpg",
      "/garage/vrod-muscle/stills/04-rear.jpg",
      "/garage/vrod-muscle/stills/02-beach-profile.jpg",
    ],
    scrub: [
      "/garage/vrod-muscle/stills/05-right-profile-sunlit.jpg",
      "/garage/vrod-muscle/stills/03-front-quarter.jpg",
      "/garage/vrod-muscle/stills/01-rear-quarter.jpg",
      "/garage/vrod-muscle/stills/04-rear.jpg",
    ],
  },
  {
    slug: "ferrari-458",
    shortName: "458 Italia",
    marque: "Ferrari",
    model: "458 Italia",
    tagline: "The last of the naturally aspirated.",
    body:
      "Nine thousand revolutions per minute, no turbochargers, nothing between your right foot and the noise. The 458 was the end of a line that ran back through the 360 and the 355, and everything Maranello built afterwards had to make peace with a compressor. Rosso over tan, glass engine cover, triple exit — this is the one people will still be pointing at in fifty years.",
    plate: "Oman · 247 AR",
    colour: "Rosso Corsa",
    accent: "#e2231a",
    backdrop: "#0a0607",
    specs: [
      { label: "Engine", value: "4.5L naturally aspirated V8 (F136 F)" },
      { label: "Power", value: "570 PS @ 9,000 rpm" },
      { label: "Torque", value: "540 Nm @ 6,000 rpm" },
      { label: "0–100 km/h", value: "3.4 seconds" },
      { label: "Top speed", value: "325 km/h" },
      { label: "Gearbox", value: "7-speed F1 dual-clutch" },
    ],
    stills: [
      "/garage/ferrari-458/stills/02-side-profile.jpg",
      "/garage/ferrari-458/stills/03-rear-quarter-garage.jpg",
      "/garage/ferrari-458/stills/01-rear-workshop.jpg",
      "/garage/ferrari-458/stills/04-engine-bay.jpg",
      "/garage/ferrari-458/stills/05-garage-wide.jpg",
    ],
    scrub: [
      "/garage/ferrari-458/stills/02-side-profile.jpg",
      "/garage/ferrari-458/stills/03-rear-quarter-garage.jpg",
      "/garage/ferrari-458/stills/01-rear-workshop.jpg",
      "/garage/ferrari-458/stills/04-engine-bay.jpg",
    ],
  },
];

export const getVehicle = (slug: string) => VEHICLES.find((v) => v.slug === slug);
