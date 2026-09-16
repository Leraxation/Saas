/**
 * Part-based vehicle manifest.
 *
 * Photos arrive grouped by upload part: Part 1, Part 2, Part 3... Each part
 * lives in its own folder under `reference/<part>/`, and a vehicle declares
 * which part(s) it draws from. A vehicle normally maps to one part, but may
 * list several when the same car was uploaded across more than one (Part 3
 * turned out to be additional angles of the Part 1 bike).
 *
 * Reference photos are never displayed. They sit outside `public/` so they
 * cannot be served: they exist to inform generation prompts. Everything the
 * page shows comes from `public/vehicles/<part>/` and is generated.
 *
 * Adding a vehicle: drop its photos in reference/part-N/, add one VEHICLES
 * entry listing that part, and the pipeline and page pick it up.
 */

export type PartId = `part-${number}`;

/**
 * One upload part and the reference photos it contributed.
 *
 * Paths are repo-relative and NOT public URLs — nothing renders these. They
 * record what fed the prompt, and let the page state how many photos a part
 * carried without showing any of them.
 */
export type SourcePart = {
  part: PartId;
  /** Repo-relative paths, when the reference files are checked in. */
  images?: string[];
  /** Used instead of `images` when the files were not committed. */
  count?: number;
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
  /** Omitted when no registration is legible in the reference photographs. */
  plate?: string;
  colour: string;
  /** Section accent, used for the rail, tagline and bloom tint. */
  accent: string;
  /**
   * Which body shape the cover is cut to, and which stand-in form is drawn
   * before a render exists. The cover has to fit the vehicle or it reads as a
   * curtain rather than something tailored to the car underneath.
   */
  silhouette: "motorcycle" | "car" | "truck";
  /** Manufacturer published figures for the model, not readings from this car. */
  specs: Spec[];
  /** Every upload part that contributed photos of this vehicle. */
  sources: SourcePart[];
  /**
   * Generated assets the page may display. Produced by Higgsfield and written
   * into public/vehicles/<part>/ — see docs/higgsfield-pipeline.md. Absent
   * files are handled: the section falls back to hero, then to a dark plate.
   */
  display: { hero: string; poster: string };
  /**
   * The same renders on Higgsfield's CDN, used until they are ingested locally.
   * The browser fetches these directly, so the collection shows real footage
   * before anyone runs scripts/ingest-renders.mjs. These links can expire —
   * ingesting is what makes the assets permanent.
   */
  remote?: { hero?: string; video?: string };
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
    hero: `${root}/hero.png`,
  };
}

/** How many reference photos a vehicle drew on, without exposing any of them. */
export function referenceCount(vehicle: Vehicle): number {
  return vehicle.sources.reduce((n, s) => n + (s.images?.length ?? s.count ?? 0), 0);
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
    silhouette: "motorcycle",
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
          "reference/part-1/01-rear-quarter.jpg",
          "reference/part-1/02-beach-profile.jpg",
          "reference/part-1/03-front-quarter.jpg",
          "reference/part-1/04-rear.jpg",
        ],
      },
      {
        part: "part-3",
        images: ["reference/part-3/01-right-profile-sunlit.jpg"],
        note: "Part 3 re-sent Part 1's photos; only this angle was new.",
      },
    ],
    display: {
      hero: "/vehicles/part-1/hero.png",
      poster: "/vehicles/part-1/poster.jpg",
    },
    remote: {
      hero: "https://d8j0ntlcm91z4.cloudfront.net/user_3FF4sUHGETln9sIK24fQ8Tj9Uky/hf_20260916_005519_ac7b5fe3-2c48-430d-8020-60b82756ad83.png",
      video: "https://d8j0ntlcm91z4.cloudfront.net/user_3FF4sUHGETln9sIK24fQ8Tj9Uky/hf_20260916_000914_aa7b4ffc-26f1-4ef1-9b77-2aba3818dd80.mp4",
    },
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
    silhouette: "car",
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
          "reference/part-2/01-side-profile.jpg",
          "reference/part-2/02-rear-quarter-garage.jpg",
          "reference/part-2/03-rear-workshop.jpg",
          "reference/part-2/04-engine-bay.jpg",
          "reference/part-2/05-garage-wide.jpg",
        ],
      },
    ],
    display: {
      hero: "/vehicles/part-2/hero.png",
      poster: "/vehicles/part-2/poster.jpg",
    },
    remote: {
      hero: "https://d8j0ntlcm91z4.cloudfront.net/user_3FF4sUHGETln9sIK24fQ8Tj9Uky/hf_20260916_001436_602a3416-12e9-42ff-a4b7-4e17232bb335.png",
      video: "https://d8j0ntlcm91z4.cloudfront.net/user_3FF4sUHGETln9sIK24fQ8Tj9Uky/hf_20260916_000914_356dc474-7a7c-4a2d-822f-b48742f495a4.mp4",
    },
    brief: {
      subject:
        "a Rosso Corsa Ferrari 458 Italia, mid-engined berlinetta, glass engine cover showing the red-crackle V8, triple centre-exit exhaust, diamond-cut five-spoke wheels with red rim pinstripe",
      cover: "a deep oxblood tailored car cover with a soft matte finish",
      durationSeconds: 10,
      resolution: "1080p",
      aspectRatio: "16:9",
    },
  },
  {
    id: "gladiator-desert-chief",
    order: 3,
    marque: "Jeep",
    shortName: "Desert Chief",
    model: "Gladiator",
    designation: "JT Rubicon",
    tagline: "Built for where the road stops.",
    body:
      "A Gladiator is a Wrangler that decided it needed a bed, and this one has been taken considerably further: a long-travel suspension lifting it clear of its own arches, forty-inch mud-terrains on beadlock-style wheels, a winch bumper and light bar up front, and a rooftop tent over a bed rack carrying recovery boards and fuel. Painted in red over black with the Desert Chief mark on the flank, it is equipped to leave the tarmac and stay gone.",
    colour: "Firecracker Red",
    accent: "#e08b3a",
    silhouette: "truck",
    specs: [
      { label: "Engine", value: "3.6L Pentastar V6" },
      { label: "Power", value: "285 hp @ 6,400 rpm" },
      { label: "Torque", value: "353 Nm @ 4,400 rpm" },
      { label: "Gearbox", value: "8-speed automatic" },
      { label: "Transfer case", value: "Rock-Trac 4:1" },
      { label: "Axles", value: "Dana 44, front and rear" },
    ],
    sources: [
      {
        part: "part-4",
        count: 3,
        note: "Reference files not committed; the build was described from them.",
      },
    ],
    display: {
      hero: "/vehicles/part-4/hero.png",
      poster: "/vehicles/part-4/poster.jpg",
    },
    remote: {
      hero: "https://d8j0ntlcm91z4.cloudfront.net/user_3FF4sUHGETln9sIK24fQ8Tj9Uky/hf_20260916_005519_b0839a2b-975c-430f-8670-e803d5796eb9.png",
      video: "https://d8j0ntlcm91z4.cloudfront.net/user_3FF4sUHGETln9sIK24fQ8Tj9Uky/hf_20260916_005558_e33e98c1-adfa-4629-8137-7977f469d129.mp4",
    },
    brief: {
      subject:
        "a heavily built red Jeep Gladiator crew-cab pickup with black accents, long-travel suspension lift, forty-inch mud-terrain tyres on black beadlock-style wheels, a winch front bumper with an LED light bar, auxiliary cube lights, a rooftop tent on a bed rack carrying recovery boards and a fuel can, and a Desert Chief mark on the flank",
      cover: "a sand-coloured heavy canvas tailored cover with webbing straps",
      durationSeconds: 10,
      resolution: "1080p",
      aspectRatio: "16:9",
    },
  },
];

export const getVehicle = (id: string) => VEHICLES.find((v) => v.id === id);
