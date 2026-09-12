#!/usr/bin/env bash
#
# Fetch the Vision 2040 film assets into public/vision2040/.
#
#   ./scripts/fetch-film.sh           download the film, the scrub encode, the poster
#   ./scripts/fetch-film.sh --frames  also cut the film to a canvas frame sequence
#   ./scripts/fetch-film.sh --60fps   also build a 60fps master locally (needs ffmpeg)
#
# --frames is the one that turns Act II into a true scroll-driven canvas: the
# film is cut to stills up front and the act paints frame N directly onto the
# canvas as you scroll. No video element, no playback clock, no decoder seek.
# Without it Act II falls back to seeking the all-keyframe encode, which looks
# nearly identical but leans on the browser's decoder to land each frame.
#
# The presentation runs without these files — the canvas carries every act on
# its own. The film is what turns the overture, Act II and the close from a
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
  FPS="${FRAME_FPS:-4}"       # frames per second of film
  WIDTH="${FRAME_WIDTH:-1280}"
  DIR="$OUT/frames"
  echo
  echo "Cutting the film to a canvas frame sequence (${FPS} fps, ${WIDTH}px wide)."
  rm -rf "$DIR"
  mkdir -p "$DIR"
  ffmpeg -hide_banner -loglevel error -stats -y -i "$OUT/film.mp4" \
    -vf "fps=$FPS,scale=$WIDTH:-2" -q:v 4 "$DIR/f%04d.jpg"
  # ffmpeg numbers from 1; the player indexes from 0, so shift the set down.
  i=0
  for f in "$DIR"/f*.jpg; do
    mv "$f" "$DIR/tmp_$(printf '%04d' "$i").jpg"
    i=$((i + 1))
  done
  for f in "$DIR"/tmp_*.jpg; do mv "$f" "${f/tmp_/f}"; done
  COUNT=$(ls -1 "$DIR"/f*.jpg | wc -l | tr -d ' ')
  printf '{"count":%s,"pattern":"/vision2040/frames/f%%04d.jpg","width":%s,"fps":%s}\n' \
    "$COUNT" "$WIDTH" "$FPS" > "$DIR/manifest.json"
  echo "  ✓ $COUNT frames in public/vision2040/frames/ ($(du -sh "$DIR" | cut -f1))"
  echo "    Act II will now paint these frames directly. Raise density with:"
  echo "    FRAME_FPS=8 ./scripts/fetch-film.sh --frames"
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
