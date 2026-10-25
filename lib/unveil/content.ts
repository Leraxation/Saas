/**
 * Copy for the showroom page. Nocturne Automobili is a fictional showroom;
 * the car is a real Ferrari 458 Italia and its figures are the factory's.
 */

export const MARQUE = {
  name: "Nocturne",
  wordmark: "NOCTURNE",
  tagline: "Automobili",
  model: "458 Italia",
  year: "2009–2015",
  strap: "Mid-engined. Naturally aspirated. Rosso Corsa.",
};

export const CHAPTER_COPY = {
  cover: {
    kicker: "01 — Under cover",
    lines: ["One car.", "One sheet of silk.", "Scroll to lift it."],
  },
  reveal: {
    kicker: "02 — The reveal",
    display: "458 Italia",
    lines: ["Ferrari · 4.5 L V8 · 9,000 rpm", "The car in the photograph, now on the floor."],
  },
  anatomy: {
    kicker: "03 — Anatomy",
    lines: ["Three assemblies.", "Nothing hidden behind a bumper."],
  },
  assembly: {
    kicker: "04 — Assembly",
    lines: ["Every part finds its seat.", "Scaglietti-built, Maranello-tuned, one shape."],
  },
  finale: {
    display: "Nocturne",
    lines: ["This 458 Italia is on the showroom floor now.", "Rosso Corsa. Yellow calipers. One careful owner."],
    cta: "Book a viewing",
  },
};

export type Callout = {
  anchor: "shell" | "canopy" | "battery" | "wheel" | "splitter" | "tail";
  side: "left" | "right";
  title: string;
  detail: string;
};

export const CALLOUTS: Callout[] = [
  { anchor: "shell", side: "left", title: "Aluminium body", detail: "Spaceframe and panels built by Scaglietti" },
  { anchor: "canopy", side: "right", title: "Glasshouse", detail: "Low-rake screen, single wiper" },
  { anchor: "battery", side: "right", title: "Flat underbody", detail: "4.5 L V8 behind the seats · rear diffuser" },
  { anchor: "wheel", side: "right", title: "Corner", detail: "20″ forged · yellow calipers · carbon-ceramic discs" },
];

export const SPECS: Array<{ label: string; value: string; note?: string }> = [
  { label: "Engine", value: "4,497 cc V8", note: "naturally aspirated, mid-rear" },
  { label: "Power", value: "570 cv", note: "419 kW at 9,000 rpm" },
  { label: "Torque", value: "540 Nm", note: "at 6,000 rpm" },
  { label: "0–100 km/h", value: "3.4 s" },
  { label: "Top speed", value: "325 km/h" },
  { label: "Gearbox", value: "7-speed F1 dual-clutch" },
  { label: "Dry weight", value: "1,380 kg" },
  { label: "Length", value: "4,527 mm" },
  { label: "Width", value: "1,937 mm" },
  { label: "Height", value: "1,213 mm" },
  { label: "Produced", value: "2009–2015", note: "Maranello" },
];

export type Photo = { src: string; alt: string; caption: string; remote?: boolean };

/**
 * The owner's photographs. The first is the original; the second is the
 * same car composited into a showroom by an AI image edit. The second lives
 * on the image service's CDN, so it is hidden wherever that host is blocked.
 */
export const PHOTOS: Photo[] = [
  {
    src: "unveil/reference/ferrari-458.jpg",
    alt: "Red Ferrari 458 Italia photographed outdoors, front three-quarter view",
    caption: "As photographed",
  },
  {
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_3FF4sUHGETln9sIK24fQ8Tj9Uky/hf_20261025_191910_29a9fb82-5fd5-4052-9734-b288b0acadd9.png",
    alt: "The same Ferrari 458 Italia composited into a dark indoor showroom",
    caption: "In the showroom (AI composite)",
    remote: true,
  },
];

/**
 * What on this page is real, what is procedural, and what would replace it.
 */
export const ASSET_NOTES: Array<{ what: string; now: string; upgrade: string; where: string }> = [
  {
    what: "The car",
    now: "A Ferrari 458 Italia glTF by vicent091036 (Sketchfab), as shipped in the three.js examples: 1.08 M vertices, meshopt-compressed to 2.2 MB. Paint, glass and lamps are re-materialled to match the photograph. Check the model's licence before commercial use.",
    upgrade: "A scan or OEM-grade model of this exact car, with its plate, wheel finish and interior.",
    where: "lib/unveil/model.ts → CAR_MODEL_URL, MODEL_MANIFEST",
  },
  {
    what: "The cover",
    now: "Procedural drape: a height field relaxed over the car's triangles and a closed-form GPU displacement that sweeps, folds and flutters. Reversible, weightless, no collisions. It is not a cloth simulation.",
    upgrade: "A baked simulation (Blender cloth, Houdini Vellum, Marvelous Designer) exported as glTF with per-frame morph targets or as an alembic cache, scrubbed by the same `pull` value.",
    where: "lib/unveil/cover.ts, lib/unveil/heightfield.ts",
  },
  {
    what: "The studio",
    now: "Three.js RoomEnvironment for reflections; procedural floor texture; four lights driven by the timeline.",
    upgrade: "A real studio HDRI (Poly Haven, CC0, 2k is enough) for the environment map, and a 4k floor normal/roughness set for the stage.",
    where: "lib/unveil/scene.ts → PMREMGenerator",
  },
  {
    what: "Sound",
    now: "None.",
    upgrade: "A fabric-slide bed and the V8's idle, started on first interaction and scrubbed with the timeline.",
    where: "components/unveil/Unveil.tsx",
  },
];
