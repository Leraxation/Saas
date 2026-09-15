/**
 * Part-based vehicle manifest.
 *
 * Photos arrive grouped by upload part: Part 1, Part 2, Part 3... Each part
 * lives in its own folder under public/vehicles/<part>/source/, and a vehicle
 * declares which part(s) it draws from. A vehicle normally maps to one part,
 * but may list several when the same car was uploaded across more than one
 * (Part 3 turned out to be additional angles of the Part 1 bike).
 *
 * Adding a vehicle: drop its photos in public/vehicles/part-N/source/, add one
 * VEHICLES entry listing that part, and the pipeline and page pick it up.
 */

export type PartId = `part-${number}`;

/** One upload part and the source photos it contributed. */
export type SourcePart = {
  part: PartId;
  /** Public paths, ordered. The first is the primary Higgsfield reference. */
  images: string[];
  note?: string;
};

export type Spec = { label: string; value: string };

/**
 * Generation parameters handed to Higgsfield for this vehicle's reveal clip.
 * Held in the manifest so a re-render reproduces the same shot exactly.
 * See docs/higgsfield-pipeline.md for the shared style contract.
 */
export type RevealBrief = {
  /** Vehicle-specific clause spliced into the shared shot prompt. */
  subject: string;
  /** Cover material/colour, kept per vehicle so each reveal reads distinctly. */
  cover: string;
  durationSeconds: number;
  resolution: "720p" | "1080p";
  aspectRatio: "16:9";
};

export type Vehicle = {
  id: string;
  /** Running order on the page — also the order the covers come off. */
  order: number;
  marque: string;
  shortName: string;
  model: string;
  /** Factory designation or chassis code. */
  designation: string;
  tagline: string;
  body: string;
  plate: string;
  colour: string;
  /** Section accent, used for the rail, tagline and bloom tint. */
  accent: string;
  /** Manufacturer published figures for the model, not readings from this car. */
  specs: Spec[];
  /** Every upload part that contributed photos of this vehicle. */
  sources: SourcePart[];
  /** Source photos that are portrait or too tightly framed to run full-bleed. */
  portraitSources?: string[];
  brief: RevealBrief;
};

/** Where a vehicle's generated reveal assets live once the pipeline has run. */
export function revealPaths(vehicle: Vehicle) {
  const root = `/vehicles/${vehicle.sources[0].part}`;
  return {
    root,
    /** Written by scripts/extract-frames.mjs. */
    manifest: `${root}/reveal.json`,
    video: `${root}/reveal.mp4`,
    poster: `${root}/poster.jpg`,
  };
}

/** Flattened source photos across every part, in part order. */
export function allSourceImages(vehicle: Vehicle): string[] {
  return vehicle.sources.flatMap((s) => s.images);
}

/**
 * Photos usable as full-bleed scrub stand-ins before a reveal clip exists.
 * Portrait shots crop badly at 16:9, so they stay out of the scrub set.
 */
export function scrubImages(vehicle: Vehicle): string[] {
  const excluded = new Set(vehicle.portraitSources ?? []);
  const usable = allSourceImages(vehicle).filter((src) => !excluded.has(src));
  return usable.length ? usable : allSourceImages(vehicle);
}

export const VEHICLES: Vehicle[] = [
  {
    id: "vrod-muscle",
    order: 1,
    marque: "Harley-Davidson",
    shortName: "V-Rod Muscle",
    model: "V-Rod Muscle",
    designation: "VRSCF",
    tagline: "Liquid-cooled heresy.",
    body:
      "Porsche helped build the Revolution engine, and Milwaukee never quite forgave it. The V-Rod Muscle answers the question no other Harley asks: what if a cruiser were shaped entirely by the air moving past it? Slammed, shaved and finished in gloss black, it sits on a 240-section rear tyre that makes the whole machine look like it is leaning on something.",
    plate: "Oman · LK 8728",
    colour: "Vivid Black",
    accent: "#c8a24a",
    specs: [
      { label: "Engine", value: "1250cc Revolution 60° V-twin" },
      { label: "Cooling", value: "Liquid-cooled DOHC, 4v" },
      { label: "Power", value: "122 hp @ 8,250 rpm" },
      { label: "Torque", value: "113 Nm @ 7,000 rpm" },
      { label: "Gearbox", value: "5-speed, belt drive" },
      { label: "Rear tyre", value: "240/40 R18" },
    ],
    sources: [
      {
        part: "part-1",
        images: [
          "/vehicles/part-1/source/01-rear-quarter.jpg",
          "/vehicles/part-1/source/02-beach-profile.jpg",
          "/vehicles/part-1/source/03-front-quarter.jpg",
          "/vehicles/part-1/source/04-rear.jpg",
        ],
      },
      {
        part: "part-3",
        images: ["/vehicles/part-3/source/01-right-profile-sunlit.jpg"],
        note: "Part 3 re-sent Part 1's photos; only this angle was new.",
      },
    ],
    portraitSources: ["/vehicles/part-1/source/02-beach-profile.jpg"],
    brief: {
      subject:
        "a blacked-out Harley-Davidson V-Rod Muscle power cruiser motorcycle, gloss black bodywork, exposed liquid-cooled V-twin engine, polished forks, fat 240-section rear tyre, twin slash-cut mufflers on the right",
      cover: "a matte charcoal tailored motorcycle cover with subtle brushed sheen",
      durationSeconds: 10,
      resolution: "1080p",
      aspectRatio: "16:9",
    },
  },
  {
    id: "ferrari-458",
    order: 2,
    marque: "Ferrari",
    shortName: "458 Italia",
    model: "458 Italia",
    designation: "Tipo F142",
    tagline: "The last of the naturally aspirated.",
    body:
      "Nine thousand revolutions per minute, no turbochargers, nothing between your right foot and the noise. The 458 closed a line that ran back through the 360 and the 355, and everything Maranello built afterwards had to make peace with a compressor. Rosso over tan, glass engine cover, triple exit.",
    plate: "Oman · 247 AR",
    colour: "Rosso Corsa",
    accent: "#e2231a",
    specs: [
      { label: "Engine", value: "4.5L V8, F136 F" },
      { label: "Aspiration", value: "Naturally aspirated" },
      { label: "Power", value: "570 PS @ 9,000 rpm" },
      { label: "Torque", value: "540 Nm @ 6,000 rpm" },
      { label: "0–100 km/h", value: "3.4 s" },
      { label: "Gearbox", value: "7-speed F1 dual-clutch" },
    ],
    sources: [
      {
        part: "part-2",
        images: [
          "/vehicles/part-2/source/01-side-profile.jpg",
          "/vehicles/part-2/source/02-rear-quarter-garage.jpg",
          "/vehicles/part-2/source/03-rear-workshop.jpg",
          "/vehicles/part-2/source/04-engine-bay.jpg",
          "/vehicles/part-2/source/05-garage-wide.jpg",
        ],
      },
    ],
    portraitSources: [
      "/vehicles/part-2/source/02-rear-quarter-garage.jpg",
      "/vehicles/part-2/source/05-garage-wide.jpg",
    ],
    brief: {
      subject:
        "a Rosso Corsa Ferrari 458 Italia, mid-engined berlinetta, glass engine cover showing the red-crackle V8, triple centre-exit exhaust, diamond-cut five-spoke wheels with red rim pinstripe",
      cover: "a deep oxblood tailored car cover with a soft matte finish",
      durationSeconds: 10,
      resolution: "1080p",
      aspectRatio: "16:9",
    },
  },
];

export const getVehicle = (id: string) => VEHICLES.find((v) => v.id === id);
