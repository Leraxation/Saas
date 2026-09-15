# Reveal clip pipeline

How a photograph becomes a scroll-scrubbed 360 reveal on `/collection`.

```
public/vehicles/part-N/source/*.jpg     photos you uploaded, grouped by part
        │
        ▼  Higgsfield generate_video (shot contract below)
   reveal.mp4                            10s, 1080p, 16:9, no audio
        │
        ▼  node scripts/extract-frames.mjs part-N ./reveal.mp4
   frames/0001.jpg … + poster.jpg + reveal.json
        │
        ▼  components/scroll-canvas/revealSource.ts
   scroll-scrubbed WebGL canvas
```

Until a part has a `reveal.json`, its section scrubs that part's source photos
instead. Nothing needs to be switched on — dropping the files in is the switch.

## Part mapping

Photos arrive in parts; a vehicle declares which part(s) it draws from in
`lib/vehicles/manifest.ts`. One part per vehicle is the normal case.

| Part | Vehicle | Source photos |
|---|---|---|
| `part-1` | Harley-Davidson V-Rod Muscle (VRSCF) | 4 |
| `part-2` | Ferrari 458 Italia | 5 |
| `part-3` | *Also* the V-Rod — the part re-sent Part 1's photos and added one new angle | 1 |

Adding a vehicle:

1. `mkdir -p public/vehicles/part-4/source` and drop its photos in.
2. Add one `VEHICLES` entry in `lib/vehicles/manifest.ts` listing `part-4`.
3. Generate and extract (below). The page picks it up with no further changes.

## Shot contract

Every clip must share one environment, or the sections will not cut together.
The environment clause is fixed; only the subject and cover change per vehicle,
and both live on each vehicle's `brief` in the manifest.

**Fixed environment clause** — identical in every prompt:

> minimalist high-end architectural studio, dark moody showroom, polished dark
> epoxy floor with soft reflections, dramatic cinematic rim lighting separating
> the silhouette from the background, subtle volumetric fog, deep charcoal
> negative space, no text, no people, no other vehicles

**Fixed camera and action clause** — identical in every prompt:

> smooth continuous 360 degree orbit around the vehicle at low hero height,
> constant radius, constant speed, starting and ending at the same angle so the
> loop is seamless; the vehicle begins fully draped under a tailored fitted
> cover which lifts and peels away cleanly in one continuous motion during the
> first third of the shot, revealing the vehicle underneath; high-end commercial
> automotive film, photorealistic materials, crisp reflections, 4K, smooth 60fps
> pacing, no cuts, no camera shake

**Per-vehicle clause** — `brief.subject` and `brief.cover` from the manifest.

Assembled prompt:

```
<brief.subject>, draped under <brief.cover>.
<camera and action clause>
<environment clause>
```

### Generation parameters

| Parameter | Value | Why |
|---|---|---|
| Model | `seedance_2_5` | Image-to-video with a start frame and reliable camera control |
| `medias` role | `start_image` | Locks frame one to your actual photo, so the reveal lands on the real car |
| Duration | 10s | One unhurried revolution; shorter reads as a spin |
| Resolution | `1080p` | Renders full-bleed behind type — 720p upscales visibly |
| `generate_audio` | `false` | The page is silent; audio is wasted cost |
| `aspect_ratio` | `16:9` | Matches the canvas cover-fit |

Cost at time of writing: **90 credits** per clip at 1080p, 65 at 720p.

### Extraction

```bash
node scripts/extract-frames.mjs part-1 ./vrod-reveal.mp4 120 1600
```

120 frames over 10s is one frame per ~83ms of clip — dense enough that scrubbing
reads as continuous motion, and about 4–6 MB per vehicle at `-q:v 4`. Raise the
count for slower, more deliberate scroll pacing; the manifest and the canvas
both follow whatever the script writes.

## Rendering tiers

`components/scroll-canvas/capabilities.ts` picks one at runtime.

| Tier | When | Behaviour |
|---|---|---|
| `full` | WebGL, fine pointer, no reduced-motion preference | Frame sequence, bloom, grain, vignette, DPR capped at 2 |
| `lite` | Coarse pointer on a narrow viewport, or `deviceMemory <= 4` | Scrubs `reveal.mp4` instead of a decoded sequence, post-processing off, every 2nd frame, DPR capped at 1.5 |
| `fallback` | No WebGL context | Canvas is not mounted; sections show their poster photograph |

Memory is bounded by `reconcileTextures` in `ScrollCanvas.tsx`: only the active
vehicle and its immediate neighbours hold decoded imagery, and each vehicle owns
exactly one GPU texture whose contents are swapped per frame rather than one
texture per frame.
