#!/usr/bin/env bash
#
# Install the closing film's frame sequence from a pre-cut zip.
#
#   ./scripts/install-frames-2.sh path/to/vision2040-film2-frames-464.zip
#
# Use this instead of cut-frames.sh when the frames were cut somewhere else —
# on a machine that can reach the film's CDN, say. The zip holds the same 464
# WebP stills cut-frames.sh would produce at FPS=8 WIDTH=1440 FORMAT=webp, so
# the result is byte-identical in everything the page cares about.
#
# ffmpeg numbers image sequences from 1 and the player indexes from 0, so the
# frames arrive as f0001..f0464 and are shifted down to f0000..f0463 here.

set -euo pipefail

SRC="${1:-}"
if [ -z "$SRC" ] || [ ! -s "$SRC" ]; then
  echo "usage: ./scripts/install-frames-2.sh <frames.zip>" >&2
  exit 1
fi
command -v unzip >/dev/null 2>&1 || { echo "!! unzip not found" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/public/vision2040/frames-2"
FPS="${FPS:-8}"
WIDTH="${WIDTH:-1440}"
DURATION="${DURATION:-58.000}"

rm -rf "$DIR"
mkdir -p "$DIR"
unzip -q -j "$SRC" '*.webp' -d "$DIR"

COUNT=$(find "$DIR" -name '*.webp' | wc -l | tr -d ' ')
if [ "$COUNT" -eq 0 ]; then
  echo "!! no .webp frames in $SRC" >&2
  exit 1
fi

# Shift the whole set down one via a temporary prefix, so no rename ever
# collides with a file that has not been moved yet.
i=0
for f in $(find "$DIR" -name '*.webp' | sort); do
  mv "$f" "$DIR/tmp_$(printf '%04d' "$i").webp"
  i=$((i + 1))
done
for f in "$DIR"/tmp_*.webp; do mv "$f" "${f/tmp_/f}"; done

cat > "$DIR/manifest.json" <<JSON
{
  "count": $COUNT,
  "interpolated": null,
  "pattern": "/vision2040/frames-2/f%04d.webp",
  "width": $WIDTH,
  "fps": $FPS,
  "duration": $DURATION
}
JSON

echo "  ✓ $COUNT frames · $(du -sh "$DIR" | cut -f1) · public/vision2040/frames-2/"
echo "    first: $(basename "$(find "$DIR" -name 'f*.webp' | sort | head -1)")"
echo "    last:  $(basename "$(find "$DIR" -name 'f*.webp' | sort | tail -1)")"
echo
echo "    FILM_TWO_SEGMENTS in components/vision2040/FilmCanvas.tsx expects 464"
echo "    frames across 800vh of advancing scroll — 15.5 px/frame at a 900px"
echo "    viewport. A different count still works; the scrub just runs coarser."
