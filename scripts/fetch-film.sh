#!/usr/bin/env bash
#
# Fetch the Vision 2040 film assets into public/vision2040/.
#
#   ./scripts/fetch-film.sh           download the film, the scrub encode, the poster
#   FPS=8 WIDTH=1600 ./scripts/fetch-film.sh --frames
#   ./scripts/fetch-film.sh --60fps   also build a 60fps master locally (needs ffmpeg)
#
# --frames is the one that turns acts I-IV into a true scroll-driven canvas:
# the film is cut to stills up front and the page paints frame N directly onto
# the canvas as you scroll. No video element, no playback clock, no decoder
# seek. Scrub fps is NOT playback fps; it is chosen for scroll pixels per
# frame. The shared cutter defaults to 8 fps because that is the best byte /
# smoothness trade for this page, and 12 fps is the first bump if a venue test
# still shows stepping.
#
# The presentation runs without these files — the canvas carries every act on
# its own. The film is what turns the overture, acts II-IV and the close from a
# dark stage into footage of the country.
#
# Run this once on the machine that will present, then `npm run build`. After
# that the whole thing is offline: no CDN, no fonts over the wire, nothing to
# fail at the podium.

set -euo pipefail

CDN="https://d2ol7oe51mr4n9.cloudfront.net/user_3FF4sUHGETln9sIK24fQ8Tj9Uky"
FILM_ID="80bd4104-8309-43d4-a96a-183b7059ae88"
SCRUB_ID="988b9bb2-d858-4e6a-8af6-0cd474abf441"
POSTER_ID="9a1000e4-4e15-49c6-9742-54c0b92ba4cb"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/public/vision2040"
mkdir -p "$OUT"

get() {
  local url="$1" dest="$2" label="$3"
  if [ -s "$dest" ]; then
    echo "  ✓ $label already present"
    return
  fi
  echo "  ↓ $label"
  # --fail so a 403 from an expired link is an error, not a 0-byte file.
  curl -fL --progress-bar -o "$dest.part" "$url"
  mv "$dest.part" "$dest"
}

# Cutting frames only needs the master that is already on disk, so it runs
# before — and instead of — any downloading.
if [ "${1:-}" = "--frames" ]; then
  if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "!! ffmpeg not found — cannot cut frames. Install ffmpeg and re-run."
    exit 1
  fi
  if [ ! -s "$OUT/film.mp4" ]; then
    echo "!! public/vision2040/film.mp4 is missing."
    echo "   Run ./scripts/fetch-film.sh first, then re-run with --frames."
    exit 1
  fi
  FPS="${FPS:-${FRAME_FPS:-8}}"
  WIDTH="${WIDTH:-${FRAME_WIDTH:-1600}}"
  QUALITY="${QUALITY:-${FRAME_QUALITY:-5}}"
  INTERPOLATE="${INTERPOLATE:-${FRAME_INTERPOLATE:-}}"
  echo
  echo "Cutting the film to a canvas frame sequence via scripts/cut-frames.sh."
  FPS="$FPS" WIDTH="$WIDTH" QUALITY="$QUALITY" INTERPOLATE="$INTERPOLATE" \
    "$ROOT/scripts/cut-frames.sh" "$OUT/film.mp4"
  echo
  echo "  Acts I-IV now scrub public/vision2040/frames/f0000.jpg … via manifest.json."
  echo "  Raise density with:"
  echo "    FPS=12 WIDTH=1600 ./scripts/fetch-film.sh --frames"
  exit 0
fi


echo "Vision 2040 — fetching film assets into public/vision2040/"
get "$CDN/$FILM_ID.mp4"   "$OUT/film.mp4"        "film.mp4        (1080p master, 58s)"
get "$CDN/$SCRUB_ID.mp4"  "$OUT/film-scrub.mp4"  "film-scrub.mp4  (all-keyframe, for scroll scrubbing)"
get "$CDN/$POSTER_ID.jpg" "$OUT/poster.jpg"      "poster.jpg      (hero still)"

if [ "${1:-}" = "--60fps" ]; then
  if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "!! ffmpeg not found — skipping the 60fps build."
    echo "   Install ffmpeg and re-run with --60fps."
    exit 0
  fi
  echo
  echo "Building a 60fps master by motion interpolation."
  echo "This is CPU-heavy and typically takes 20-40 minutes. Leave it running."
  ffmpeg -hide_banner -loglevel warning -stats -y -i "$OUT/film.mp4" \
    -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=obmc:me_mode=bidir:me=epzs:search_param=24" \
    -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p -movflags +faststart -an \
    "$OUT/film-60.mp4"
  mv "$OUT/film.mp4" "$OUT/film-24.mp4"
  mv "$OUT/film-60.mp4" "$OUT/film.mp4"
  echo "  ✓ film.mp4 is now 60fps; the 24fps original is film-24.mp4"
fi

echo
echo "Done. Now run:  npm run build && npm start"
echo "Then open:      http://localhost:3000/vision-2040"
