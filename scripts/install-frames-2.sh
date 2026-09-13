#!/usr/bin/env bash
#
# Install the closing film's frame sequence from a pre-cut zip.
#
#   ./scripts/install-frames-2.sh frames.zip
#   ./scripts/install-frames-2.sh part1.zip part2.zip part3.zip part4.zip
#
# Use this instead of cut-frames.sh when the frames were cut somewhere else —
# on a machine that can reach the film's CDN, say. The zips hold the same 464
# WebP stills cut-frames.sh would produce at FPS=8 WIDTH=1440 FORMAT=webp, so
# the result is byte-identical in everything the page cares about.
#
# Several zips are accepted because a single 26MB archive is more than some
# transports will carry; the set is split into four independently valid zips of
# 116 frames each. Order on the command line does not matter — the frames are
# sorted by filename before being renumbered — but all of them must be present,
# and the script says so if the count comes up short.
#
# ffmpeg numbers image sequences from 1 and the player indexes from 0, so the
# frames arrive as f0001..f0464 and are shifted down to f0000..f0463 here.

set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: ./scripts/install-frames-2.sh <frames.zip> [more.zip ...]" >&2
  exit 1
fi
for z in "$@"; do
  [ -s "$z" ] || { echo "!! $z is missing or empty" >&2; exit 1; }
done
command -v unzip >/dev/null 2>&1 || { echo "!! unzip not found" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/public/vision2040/frames-2"
FPS="${FPS:-8}"
WIDTH="${WIDTH:-1440}"
DURATION="${DURATION:-58.000}"

rm -rf "$DIR"
mkdir -p "$DIR"
# -j flattens any directory structure; -n never overwrites, so a frame that
# appears in two zips is taken once rather than silently clobbered.
for z in "$@"; do
  unzip -q -n -j "$z" '*.webp' -d "$DIR"
  echo "  + $(basename "$z")"
done

COUNT=$(find "$DIR" -name '*.webp' | wc -l | tr -d ' ')
if [ "$COUNT" -eq 0 ]; then
  echo "!! no .webp frames in any of those zips" >&2
  exit 1
fi

# A short count means a missing part, and a short sequence would run the film
# fast and end early rather than fail loudly — so fail loudly here instead.
EXPECT="${EXPECT:-464}"
if [ "$COUNT" -ne "$EXPECT" ]; then
  echo "!! got $COUNT frames, expected $EXPECT." >&2
  echo "   The set is split into four zips of 116; pass all of them, or set" >&2
  echo "   EXPECT=$COUNT to install this many deliberately." >&2
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
