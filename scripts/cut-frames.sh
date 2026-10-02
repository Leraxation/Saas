#!/usr/bin/env bash
#
# Cut a film into the JPEG sequence the scroll-scrub canvas paints from.
#
#   ./scripts/cut-frames.sh path/to/film.mp4
#   FPS=8 WIDTH=1600 ./scripts/cut-frames.sh path/to/film.mp4
#
# Output: public/vision2040/frames/f0000.jpg … + manifest.json
#
# ── CHOOSING THE FRAME RATE ─────────────────────────────────────────────────
#
# Scrub frame rate is NOT playback frame rate. Nothing plays: the scroll
# position is the playhead, so the only thing that matters is how far the page
# scrolls between one frame and the next.
#
#   scroll_px_per_frame = advancing_scroll_px / (duration_s * FPS)
#   advancing_scroll_px = (sum_of_advancing_segment_weights_vh / 100) * viewport_h
#                         - viewport_h
#
# Below ~8 px/frame you are paying for frames nobody can distinguish on this
# footage. Above ~20 px/frame a hard-cut scrub starts to show stepping on an
# aggressive scroll. This implementation already cross-dissolves neighbours and
# holds the nearest decoded frame while the rest stream in, so it tolerates a
# little more spacing than a bare frame-swapper would.
#
# For this presentation the film advances across 1206vh of scroll
# (230vh overture + 340vh nation + 420vh network + 216vh of scale), then HOLDS
# for the last 144vh of Act IV. The hold takes scroll but no new frames.
# On a 900px-tall viewport that is 9954px of advancing travel; on a 1080p
# projector, 11944px.
#
#   FPS=4  → 232 frames → 42.9 px/frame → obviously coarse
#   FPS=8  → 464 frames → 21.5 px/frame → acceptable with blending, ~half of 12fps  ← default
#   FPS=12 → 696 frames → 14.3 px/frame → smoother, ~50% more bytes
#   FPS=24 → 1393 frames →  7.1 px/frame → source cadence, much heavier
#
# 8 fps is the default because the last 144vh is already a hold, the player
# blends between adjacent frames, and the damped scrub makes the low-20s
# px/frame spacing read well enough on this material for roughly half the bytes
# of 12 fps. If a venue test rig still shows stepping, 12 fps is the first bump
# to try.
#
# Raise FPS if the film has fast camera moves; lower it if bytes matter more
# than the fling case.
# ────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SRC="${1:-}"
if [ -z "$SRC" ] || [ ! -s "$SRC" ]; then
  echo "usage: ./scripts/cut-frames.sh <film.mp4>" >&2
  exit 1
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "!! ffmpeg not found. Install it and re-run." >&2
  exit 1
fi

FPS="${FPS:-8}"
# INTERPOLATE=<fps> synthesises intermediate frames with motion interpolation
# before cutting. Use it when the film is short relative to the scroll it has
# to cover and the source simply does not contain enough frames — see the
# px/frame note above. Costs CPU; adds no real detail, only smoothness.
INTERPOLATE="${INTERPOLATE:-}"
WIDTH="${WIDTH:-1600}"
QUALITY="${QUALITY:-5}"          # ffmpeg -q:v, 2 = best, 31 = worst

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/public/vision2040/frames"

# ffprobe ships with most ffmpeg builds but not all; fall back to parsing
# ffmpeg's own banner so a slim install still works.
if command -v ffprobe >/dev/null 2>&1; then
  DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
else
  # `ffmpeg -i` with no output exits non-zero by design, so shield the
  # pipeline from `set -e` / `pipefail`.
  DURATION=$( { ffmpeg -i "$SRC" 2>&1 || true; } | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' \
    | head -1 | awk -F: '{printf "%.3f", ($1*3600)+($2*60)+$3}' )
fi
[ -z "$DURATION" ] && DURATION=0
echo "Source: $SRC"
printf 'Duration: %.2fs · cutting at %s fps, %spx wide\n' "$DURATION" "$FPS" "$WIDTH"

rm -rf "$DIR"
mkdir -p "$DIR"

# -vsync 0 so ffmpeg emits exactly the frames fps= selects, with no duplication.
if [ -n "$INTERPOLATE" ]; then
  echo "Motion-interpolating to ${INTERPOLATE} fps first — this is CPU-heavy."
  VF="minterpolate=fps=$INTERPOLATE:mi_mode=mci:mc_mode=obmc:me_mode=bidir:me=epzs,scale=$WIDTH:-2:flags=lanczos"
else
  VF="fps=$FPS,scale=$WIDTH:-2:flags=lanczos"
fi

ffmpeg -hide_banner -loglevel error -stats -y -i "$SRC" \
  -vf "$VF" -vsync 0 -q:v "$QUALITY" "$DIR/f%04d.jpg"

# ffmpeg numbers from 1; the player indexes from 0. Shift the whole set down
# via a temporary prefix so no rename ever collides with a file not yet moved.
i=0
for f in "$DIR"/f*.jpg; do
  mv "$f" "$DIR/tmp_$(printf '%04d' "$i").jpg"
  i=$((i + 1))
done
for f in "$DIR"/tmp_*.jpg; do mv "$f" "${f/tmp_/f}"; done

COUNT=$(find "$DIR" -name 'f*.jpg' | wc -l | tr -d ' ')
SIZE=$(du -sh "$DIR" | cut -f1)

cat > "$DIR/manifest.json" <<JSON
{
  "count": $COUNT,
  "interpolated": ${INTERPOLATE:-null},
  "pattern": "/vision2040/frames/f%04d.jpg",
  "width": $WIDTH,
  "fps": $FPS,
  "duration": $DURATION
}
JSON

echo
echo "  ✓ $COUNT frames · $SIZE · public/vision2040/frames/"
echo
echo "  Segment weights live in components/vision2040/FilmCanvas.tsx and MUST match the"
echo "  act heights in app/vision-2040/page.tsx. The page checks this at runtime"
echo "  and warns in the console if they drift apart."
