#!/usr/bin/env bash
#
# Cut a film into the JPEG sequence the scroll-scrub canvas paints from.
#
#   ./scripts/cut-frames.sh path/to/film.mp4
#   FPS=12 WIDTH=1920 ./scripts/cut-frames.sh path/to/film.mp4
#
# Output: public/vision2040/frames/f0000.jpg … + manifest.json
#
# ── CHOOSING THE FRAME RATE ─────────────────────────────────────────────────
#
# Scrub frame rate is NOT playback frame rate. Nothing plays: the scroll
# position is the playhead, so the only thing that matters is how far the page
# scrolls between one frame and the next.
#
#   scroll_px_per_frame = total_scroll_px / (duration_s * FPS)
#   total_scroll_px     = (sum_of_segment_weights_vh / 100) * viewport_h - viewport_h
#
# Below ~6 px/frame you are paying for frames nobody can distinguish.
# Above ~20 px/frame the picture visibly steps when someone scrolls quickly.
# The band worth hitting is roughly 8-12 px/frame.
#
# For this presentation: 58.04s of film across 570vh of scroll (230vh overture
# + 340vh Act II). On a 900px-tall viewport that is 5130 - 900 = 4230px of
# travel; on a 1080p projector, 5076px.
#
#   FPS=4  → 232 frames → 18.2 px/frame → steps on a fast scroll
#   FPS=8  → 464 frames →  9.1 px/frame → in band, ~50MB at 1600px   ← default
#   FPS=12 → 696 frames →  6.1 px/frame → ~40% more bytes, no visible gain
#   FPS=24 → 1393 frames →  3.0 px/frame → three frames per frame the eye gets
#
# 8 fps is the default because it lands mid-band at both 900px and 1080p, and
# because doubling it doubles the download for a difference that only shows up
# if someone flings the scrollbar — which the damped scrub already smooths.
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
echo "  Segment weights live in lib/vision2040/filmScrub.ts and MUST match the"
echo "  act heights in app/vision-2040/page.tsx. The page checks this at runtime"
echo "  and warns in the console if they drift apart."
