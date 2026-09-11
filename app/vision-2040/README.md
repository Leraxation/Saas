# Oman Vision 2040 — Aviation Briefing

A scroll-driven canvas presentation built for the aviation sector convening in
Muscat, **23 September 2026**.

Route: **`/vision-2040`**

---

## Before the meeting — do these three things

### 1. Replace the illustrative figures

Every number lives in **`lib/vision2040/data.ts`**. Each one is a `Figure` that
carries a `source` and a `verified` flag:

```ts
{
  value: 16.5,
  suffix: "M",
  decimals: 1,
  label: "Passengers handled",
  source: "ILLUSTRATIVE — replace with the published Oman Airports annual figure.",
  verified: false,   // ← flip to true once the value is confirmed
}
```

The figures shipped here are **illustrative placeholders chosen so the page
reads correctly out of the box**. They are not official statistics.

Three things stop a placeholder being read out as fact:

- a small **`illustrative`** tag renders beside every unverified figure, always visible;
- a **pre-flight check** lists every unverified figure the first time the page is opened;
- **review mode** (press `V`) highlights them in amber with their source line.

Set `verified: true` and the tag disappears. Once every figure is verified, the
pre-flight check says so and clears.

The same applies to:

- **`GROWTH`** — the passenger trajectory chart series.
- **`PILLARS.source`** — confirm the exact official wording of the Vision 2040
  axis names against the published document.
- **`DESTINATIONS`** in `lib/vision2040/geo.ts` — the international route list is
  illustrative. Replace it with the current published schedule.

### 2. Fetch the film

```bash
./scripts/fetch-film.sh
```

This pulls three files into `public/vision2040/`:

| File | What it is |
|---|---|
| `film.mp4` | The 58-second cinematic master, 1080p |
| `film-scrub.mp4` | An all-keyframe encode, scrubbed frame-by-frame by scroll in Act II |
| `poster.jpg` | Hero still, also the video poster frame |

The presentation **runs without them** — the canvas carries every act on its own
and the film layers simply stay dark. With them, the overture, Act II and the
close become footage.

Optional, on a machine with `ffmpeg` and time to spare:

```bash
./scripts/fetch-film.sh --60fps
```

This rebuilds the master at 60fps by motion interpolation (20–40 minutes of CPU).
The 24fps original is kept as `film-24.mp4`. Note that 24fps is the correct
cadence for cinematic footage — interpolating to 60 is a preference, not an
upgrade, and it can introduce artefacts on fast camera moves.

### 3. Build once, then go offline

```bash
npm run build && npm start
```

Fonts are self-hosted through `next/font` at build time and the film is a local
file, so **nothing on this page touches the network once built**. Venue Wi-Fi is
not a dependency.

---

## Presenting

| Key | Action |
|---|---|
| `Space` · `→` | Next section |
| `←` | Previous section |
| `Home` · `End` | First · last section |
| `F` | Fullscreen |
| `P` | Presenter mode — section name, elapsed clock, position |
| `V` | Review mode — flag unverified figures |
| `H` · `?` | Keyboard help |
| `Esc` | Close a panel |

Each key press lands the next act **pinned and centred**, so the presenter never
has to hunt with a scroll wheel. The act rail on the right is also clickable, for
jumping out of order if the room takes the conversation somewhere else.

Add `?preflight` to the URL to see the pre-flight check again on a device that
has already dismissed it.

---

## The seven acts

| | Act | What the canvas is doing |
|---|---|---|
| I | Overture | The film plays under the title |
| II | The Nation | Scroll scrubs the film frame-by-frame behind three beats |
| III | The Network | Oman's coastline draws in, airports light in sequence, then the view pulls back and the international routes bloom |
| IV | The Scale | Figures count up, then the passenger trajectory plots itself |
| V | The Pillars | Three orbits, one per Vision 2040 axis |
| VI | The Roadmap | A rail fills from 2026 to 2040 across four phases |
| VII | The Ask | A radial burst settles behind the sign-off |

---

## How it is built

- **One `requestAnimationFrame` loop** owns all motion (`lib/vision2040/useStage.ts`).
  Scroll position is critically damped toward the real value — that damping is
  what makes it feel like film rather than a scrollbar.
- **Scroll never triggers a React render.** Beats and counters write opacity,
  a `--beat-y` custom property, and text content straight to the DOM.
- **One canvas** renders every procedural scene (`lib/vision2040/scenes.ts`),
  sized to `devicePixelRatio` and capped at 2×.
- **Quality degrades automatically.** The loop measures its own frame cost and
  steps particle and arc budgets down if the machine cannot hold the frame
  budget — it never steps back up, so the tier cannot visibly oscillate
  mid-presentation.
- **`prefers-reduced-motion`** disables the scroll damping and the ambient
  animations.

### A note on the map

The Oman outline in `lib/vision2040/geo.ts` is a **stylised silhouette drawn for
visual effect**. It is not a cartographic or legal boundary and the caption under
the map says so. Do not present it as one.
