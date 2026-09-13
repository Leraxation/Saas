#!/usr/bin/env bash
#
# Cut a film into the still sequence the scroll-scrub canvas paints from.
#
#   ./scripts/cut-frames.sh path/to/film.mp4
#   FPS=24 WIDTH=1440 OUT=frames  ./scripts/cut-frames.sh film-one.mp4
#   FPS=8  WIDTH=1440 OUT=frames-2 FORMAT=webp ./scripts/cut-frames.sh film-two.mp4
#
# Output: public/vision2040/$OUT/f0000.<ext> … + manifest.json
#
# ── CHOOSING THE FRAME RATE ─────────────────────────────────────────────────
#
# Scrub frame rate is NOT playback frame rate. Nothing plays: the scroll
# position is the playhead, so the only thing that matters is how far the page
# scrolls between one frame and the next.
#
#   scroll_px_per_frame = advancing_scroll_px / (duration_s * FPS)
#   advancing_scroll_px = (sum_of_ADVANCING_segment_weights_vh / 100) * viewport_h
#
# Hold segments take scroll but no film, so they are not in that numerator.
#
# Below ~6 px/frame you are paying for frames nobody can distinguish.
# Above ~20 px/frame the picture visibly steps when someone scrolls quickly —
# though the engine cross-dissolves between frames, which buys back a few px.
# The band worth hitting is roughly 8-15 px/frame.
#
# THE TWO FILMS IN THIS DECK, and why their frame rates differ:
#
#   Film 1 — 12.04s, acts I-II, 490vh advancing = 4410px at a 900px viewport.
#     FPS=24 → 289 frames → 15.3 px/frame → 40MB at 1440px.       ← shipped
#     Twelve seconds is short, so 24fps costs little and the source is a
#     hand-held push with real motion in it. 24fps was asked for and it fits.
#
#   Film 2 — 58.00s, acts X-XI, 800vh advancing = 7200px at a 900px viewport.
#     FPS=24 → 1392 frames →  5.2 px/frame → 160MB. Unshippable, and three
#                             frames for every one the eye resolves.
#     FPS=12 →  696 frames → 10.3 px/frame →  68MB. Still too heavy to share.
#     FPS=8  →  464 frames → 15.5 px/frame →  46MB at 1440px.      ← shipped
#     Eight fps lands film 2 at the SAME px/frame as film 1 — the scrub feels
#     identical under the hand — because it is five times longer for the same
#     scroll. The source is a slow aerial drift with almost no inter-frame
#     motion, which is exactly the content where a lower cut rate is invisible.
#
# So: match px/frame across films, not fps. fps is an artefact of duration.
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
FFMPEG="${FFMPEG:-ffmpeg}"
if ! command -v "$FFMPEG" >/dev/null 2>&1; then
  echo "!! ffmpeg not found. Install it, or set FFMPEG=/path/to/ffmpeg." >&2
  exit 1
fi

FPS="${FPS:-8}"
# INTERPOLATE=<fps> synthesises intermediate frames with motion interpolation
# before cutting. Use it when the film is short relative to the scroll it has
# to cover and the source simply does not contain enough frames — see the
# px/frame note above. Costs CPU; adds no real detail, only smoothness.
INTERPOLATE="${INTERPOLATE:-}"
WIDTH="${WIDTH:-1440}"
QUALITY="${QUALITY:-5}"          # jpg: ffmpeg -q:v, 2 = best, 31 = worst
FORMAT="${FORMAT:-jpg}"          # jpg | webp
WEBP_Q="${WEBP_Q:-76}"           # webp: 0-100, higher = better
OUT="${OUT:-frames}"             # subdirectory under public/vision2040/
# A light temporal denoise before encoding. Source grain is re-randomised
# every frame, so it both costs bytes and flickers under a scrub that the eye
# tracks one frame at a time. Set DENOISE=none to keep the grain.
DENOISE="${DENOISE:-hqdn3d=2:1.5:3:3}"

case "$FORMAT" in
  jpg)  EXT=jpg;  ENC=(-q:v "$QUALITY") ;;
  webp) EXT=webp; ENC=(-c:v libwebp -quality "$WEBP_Q" -compression_level 6 -preset picture) ;;
  *)    echo "!! FORMAT must be jpg or webp" >&2; exit 1 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/public/vision2040/$OUT"

# ffprobe ships with most ffmpeg builds but not all; fall back to parsing
# ffmpeg's own banner so a slim install still works.
if command -v ffprobe >/dev/null 2>&1; then
  DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
else
  # `ffmpeg -i` with no output exits non-zero by design, so shield the
  # pipeline from `set -e` / `pipefail`.
  DURATION=$( { "$FFMPEG" -i "$SRC" 2>&1 || true; } | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' \
    | head -1 | awk -F: '{printf "%.3f", ($1*3600)+($2*60)+$3}' )
fi
[ -z "$DURATION" ] && DURATION=0
echo "Source: $SRC"
printf 'Duration: %.2fs · cutting at %s fps, %spx wide, %s\n' "$DURATION" "$FPS" "$WIDTH" "$FORMAT"

rm -rf "$DIR"
mkdir -p "$DIR"

SCALE="scale=$WIDTH:-2:flags=lanczos"
[ "$DENOISE" = "none" ] || SCALE="$DENOISE,$SCALE"

# -vsync 0 so ffmpeg emits exactly the frames fps= selects, with no duplication.
if [ -n "$INTERPOLATE" ]; then
  echo "Motion-interpolating to ${INTERPOLATE} fps first — this is CPU-heavy."
  VF="minterpolate=fps=$INTERPOLATE:mi_mode=mci:mc_mode=obmc:me_mode=bidir:me=epzs,$SCALE"
else
  VF="fps=$FPS,$SCALE"
fi

"$FFMPEG" -hide_banner -loglevel error -stats -y -i "$SRC" \
  -vf "$VF" -vsync 0 "${ENC[@]}" "$DIR/f%04d.$EXT"

# ffmpeg numbers from 1; the player indexes from 0. Shift the whole set down
# via a temporary prefix so no rename ever collides with a file not yet moved.
i=0
for f in "$DIR"/f*."$EXT"; do
  mv "$f" "$DIR/tmp_$(printf '%04d' "$i").$EXT"
  i=$((i + 1))
done
for f in "$DIR"/tmp_*."$EXT"; do mv "$f" "${f/tmp_/f}"; done

COUNT=$(find "$DIR" -name "f*.$EXT" | wc -l | tr -d ' ')
SIZE=$(du -sh "$DIR" | cut -f1)

cat > "$DIR/manifest.json" <<JSON
{
  "count": $COUNT,
  "interpolated": ${INTERPOLATE:-null},
  "pattern": "/vision2040/$OUT/f%04d.$EXT",
  "width": $WIDTH,
  "fps": $FPS,
  "duration": $DURATION
}
JSON

echo
echo "  ✓ $COUNT frames · $SIZE · public/vision2040/$OUT/"
echo
echo "  Segment weights live in components/vision2040/FilmCanvas.tsx and MUST"
echo "  match the act heights in app/vision-2040/page.tsx. The page checks this"
echo "  at runtime and warns in the console if they drift apart."
