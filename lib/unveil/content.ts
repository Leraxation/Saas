/**
 * Copy for the Vespera page. The marque and the car are fictional; the
 * figures are concept targets, labelled as such on the page.
 */

export const MARQUE = {
  name: "Nocturne",
  wordmark: "NOCTURNE",
  tagline: "Automobili",
  model: "Vespera",
  year: "2027",
  strap: "A grand tourer for the hour after sunset.",
};

export const CHAPTER_COPY = {
  cover: {
    kicker: "01 — Under cover",
    lines: ["One car.", "One sheet of silk.", "Scroll to lift it."],
  },
  reveal: {
    kicker: "02 — The reveal",
    display: "Vespera",
    lines: ["Grand tourer · Electric · 2027", MARQUE.strap],
  },
  anatomy: {
    kicker: "03 — Anatomy",
    lines: ["Three assemblies.", "Nothing hidden behind a bumper."],
  },
  assembly: {
    kicker: "04 — Assembly",
    lines: ["Every part finds its seat.", "Four hundred and twelve tolerances, one shape."],
  },
  finale: {
    display: "Nocturne",
    lines: ["Vespera arrives in autumn 2027.", "Sixty cars. One evening."],
    cta: "Reserve a seat at the unveil",
  },
};

export type Callout = {
  anchor: "shell" | "canopy" | "battery" | "wheel" | "splitter" | "tail";
  side: "left" | "right";
  title: string;
  detail: string;
};

export const CALLOUTS: Callout[] = [
  { anchor: "shell", side: "left", title: "Monocoque", detail: "Carbon tub, aluminium crash structures" },
  { anchor: "canopy", side: "right", title: "Glass canopy", detail: "Single-piece electrochromic roof" },
  { anchor: "battery", side: "right", title: "Skateboard", detail: "118 kWh cell-to-pack · 800 V" },
  { anchor: "wheel", side: "right", title: "Corner module", detail: "21″ forged · in-wheel torque vectoring" },
];

export const SPECS: Array<{ label: string; value: string; note?: string }> = [
  { label: "Drive", value: "Dual motor, all-wheel" },
  { label: "Power", value: "620 kW", note: "830 hp" },
  { label: "0–100 km/h", value: "2.9 s" },
  { label: "Range", value: "640 km", note: "WLTP, target" },
  { label: "Battery", value: "118 kWh", note: "800 V, 10–80 % in 18 min" },
  { label: "Length", value: "4,700 mm" },
  { label: "Width", value: "1,960 mm" },
  { label: "Height", value: "1,300 mm" },
  { label: "Kerb weight", value: "1,980 kg", note: "target" },
  { label: "Production", value: "60 cars", note: "autumn 2027" },
];

/**
 * What on this page is procedural and what a production build would bring
 * in. Shown on the page because a reader deserves to know which pixels are
 * a model of a car and which are a model of a model.
 */
export const ASSET_NOTES: Array<{ what: string; now: string; upgrade: string; where: string }> = [
  {
    what: "The car",
    now: "Procedural: a lofted superellipse body, glass canopy, carved wheel wells, built from numbers at load time. A design-studio clay, not a production car.",
    upgrade: "A licensed glTF/GLB of the real vehicle (≤ 250k triangles, PBR materials, wheels and glass as named nodes). Sketchfab and TurboSquid both sell CC-BY / royalty-free models suitable for web.",
    where: "lib/unveil/model.ts → CAR_MODEL_URL, MODEL_MANIFEST",
  },
  {
    what: "The cover",
    now: "Procedural drape: a height field relaxed over the car and a closed-form GPU displacement that sweeps, folds and flutters. Reversible, weightless, no collisions. It is not a cloth simulation.",
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
    upgrade: "A fabric-slide bed and a two-note sting, started on first interaction and scrubbed with the timeline.",
    where: "components/unveil/Unveil.tsx",
  },
];
