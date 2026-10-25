# Nocturne · 458 Italia — The Unveiling

A scroll-controlled, pinned 3D sequence: a Ferrari 458 Italia under a silk cover,
the cover pulled away as you scroll, the car taken apart into its three
assemblies and put back together, all in one continuous camera move. Scroll
back and every frame runs in reverse.

Route: **`/unveil`**. Single-file build: `npm run build:unveil` →
`public/unveil-standalone.html`.

---

## What is real and what is procedural

Nothing on this page is loaded from a model library. That is a ceiling as much
as a feature, and the page says so in its own footer. The table below is the
hand-off list for a production build.

| Element | Today | External asset that replaces it | Where it plugs in |
|---|---|---|---|
| **The car** | `public/unveil/car.glb`: the Ferrari 458 Italia by [vicent091036](https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6) that ships with the three.js examples, Draco-decoded and recompressed with meshopt (13 MB → 2.2 MB). Paint, glass and lamps are re-materialled; wheels are regrouped about their hubs so they roll and steer. **Check the model's licence on Sketchfab before commercial use.** | A scan or OEM-grade model of the owner's exact car. The procedural Vespera (`lib/unveil/car.ts`) remains as the fallback when the file fails to load, or when `CAR_MODEL_URL` is null. | `lib/unveil/model.ts` → `CAR_MODEL_URL`, `MODEL_MANIFEST` |
| **The cover** | Procedural drape. A height field is rasterised from the car's triangles, relaxed into a taut tent (chamfer distance transform), blurred, wrinkled, and then displaced on the GPU by a closed-form sweep: a hem travels nose → tail, the uncovered fabric folds back, rises into an arc and flutters. Per-vertex normals are rebuilt by finite differences so the fabric lights correctly mid-pull. **It is not a cloth simulation**: nothing collides, nothing has mass, the fabric never catches on a mirror. | A **baked cloth simulation** (Blender cloth, Houdini Vellum, Marvelous Designer) exported as glTF with per-frame morph targets, or an alembic cache (`.abc`, via `three/examples/jsm/loaders` + a morph pipeline). Scrub the bake with the same `pull` scalar. | `lib/unveil/cover.ts` (shader), `lib/unveil/heightfield.ts` (rest shape). Replace `buildCover` with a loader that maps `pull` → morph influence / frame index. |
| **The studio** | Three.js `RoomEnvironment` through PMREM for reflections; a canvas-drawn floor texture; four lights (top spot, warm key, cold rim spot, hemisphere fill) and a floor ring, all driven by the timeline. | A real **studio HDRI** (Poly Haven, CC0, 2k is plenty) for `scene.environment`; a 4k floor **normal + roughness** set. | `lib/unveil/scene.ts` → the `PMREMGenerator` block and `makeFloorTexture`. |
| **Sound** | None. | A fabric-slide bed and a two-note sting, started on first interaction, scrubbed with the timeline. | `components/unveil/Unveil.tsx` effect. |
| **Type** | Syncopate, Manrope, JetBrains Mono via `next/font` (self-hosted at build). | — | `app/unveil/layout.tsx` |

---

## How the sequence is built

One GSAP timeline, ten beats long, scrubbed by one `ScrollTrigger` that pins
the stage for 9 viewport heights (`SCROLL_LENGTH` in `lib/unveil/timeline.ts`).

Every number the scene reads lives in one object, `SceneParams`
(`lib/unveil/scene.ts`): cover pull, lift and opacity; exploded-view amount;
lamp intensities; the five light levels; exposure; and the camera rig in
cylindrical coordinates about its look target. The timeline tweens those
numbers; the scene turns numbers into a picture every frame. Because the
scene never decides *when* anything happens, the whole sequence is a pure
function of scroll position and reverses exactly.

| Beat | Scroll | What happens |
|---|---|---|
| 0.0 – 0.8 | 0 – 8 % | Hold under a single top light. Camera creeps in. |
| 0.8 – 3.6 | 8 – 36 % | The pull. Key, rim, fill and the floor ring wake as the fabric travels; lamps strike at 27 %; the cover lifts clear and fades. Camera drops from a high frontal to a low raking three-quarter. |
| 3.8 – 5.4 | 38 – 54 % | The car rolls forward and turns on the stage, wheels turning by the distance covered, while the camera swings around the tail. Rim light dominates. |
| 5.4 – 7.4 | 54 – 74 % | Anatomy. Body lifts, canopy a little further, skateboard drops, wheels roll outward and spin. Cells glow. Callouts draw out from their parts (anchored every frame by projecting 3D points). |
| 7.4 – 9.0 | 74 – 90 % | Assembly. Everything returns; camera descends to a low front three-quarter; light warms. |
| 9.0 – 10 | 90 – 100 % | Finale: the car rolls toward the lens, front wheels steer and square up, headlamps up, wordmark and invitation. |

Type is scrubbed too: lines are unmasked with `clip-path` wipes and the
display words tighten their tracking as they land. Nothing fades in on a
timer.

### Reduced motion

With `prefers-reduced-motion: reduce` the scroll scrub becomes immediate (no
smoothing), the camera stops its ambient sway and the fabric stops fluttering
on its own. The sequence itself still scrubs; it is user-driven motion.

### Performance

- Renders only while the pinned stage is on screen (IntersectionObserver +
  `visibilitychange`).
- Device pixel ratio capped at 1.75.
- Height-field rasterisation is CPU, O(triangles), a few ms for the
  procedural car; the drape relaxation is two chamfer passes on a 144 × 256
  grid.
- The cover is 132 × 236 quads with all displacement in the vertex shader;
  its shadow uses a matching custom depth material.

---

## Swapping the car model

1. Put the file at `public/unveil/car.glb`. Use meshopt compression
   (`gltf-transform optimize in.glb out.glb --compress meshopt`): the decoder
   is bundled with three, so nothing is fetched from a CDN. Draco also works
   in the Next route but not in the published preview, whose sandbox blocks
   the decoder download.
2. Make sure node and material names let `MODEL_MANIFEST` find the parts:
   wheel groups (`wheel_fl` … or `tire|rim_*`), chassis
   (`chassis|underbody|battery`), glasshouse (`glass`), lamp materials
   (`projector|headlight`, `taillight`). Unmatched nodes stay with the body.
3. Set `fitLength` to the real length and `rotationY` so the nose points +Z.
4. The cover re-rasterises itself from the loaded triangles. Nothing else
   changes.

## Files

```
app/unveil/            route: layout (fonts), page, stylesheet, this README
components/unveil/     Unveil.tsx — markup, refs, the one effect that wires it
lib/unveil/
  car.ts               procedural Vespera (loft, wells, lamps, wheels, skateboard)
  cover.ts             drape shader + material patching
  heightfield.ts       rasteriser, drape relaxation, texture packing
  scene.ts             renderer, lights, camera rig, params → picture
  timeline.ts          the ten-beat GSAP timeline + ScrollTrigger pin
  model.ts             optional glTF loader + manifest
  content.ts           copy, specs, asset notes
  curves.ts            monotone cubic profiles, helpers
  standalone.tsx       entry for the single-file build
scripts/build-unveil-standalone.mjs
```
