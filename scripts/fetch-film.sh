#!/usr/bin/env bash
#
# Get both Vision 2040 films onto this machine and cut them to the still
# sequences the scroll-scrub canvases paint from.
#
#   ./scripts/fetch-film.sh                     both films, from the default sources
#   FILM_ONE=a.mp4 FILM_TWO=b.mp4 ./scripts/fetch-film.sh     from local masters
#
# The presentation RUNS WITHOUT EITHER FILM. Each canvas whose manifest is
# missing simply stays empty and the procedural stage carries that act on its
# own. Nothing errors, nothing blocks. With the films, acts I-II and X-XI
# become footage of the country.
#
# ── THE TWO FILMS ───────────────────────────────────────────────────────────
#
#   Film 1 — 12.04s, the opening. Acts I-II. Cut at 24 fps → 289 frames.
#   Film 2 — 58.00s, the close.   Acts X-XI. Cut at  8 fps → 464 frames.
#
# Both land at ~15.5 scroll-px per frame, which is why they feel like one
# instrument under the hand despite the different cut rates. The arithmetic is
# in scripts/cut-frames.sh — read it before changing either number.
#
# Run this once on the machine that will present, then `npm run build`. After
# that the whole thing is offline: no CDN, no fonts over the wire, nothing to
# fail at the podium.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/public/vision2040"
mkdir -p "$OUT"

# Where the masters come from if they are not already on disk.
#
# NOTE: this CDN is not reachable from every network — some corporate and
# sandboxed environments deny it outright. If curl fails here, download the two
# files by hand and point FILM_ONE / FILM_TWO at them instead. Nothing else in
# the pipeline needs the network.
CDN="https://d2ol7oe51mr4n9.cloudfront.net/user_3FF4sUHGETln9sIK24fQ8Tj9Uky"
FILM_TWO_ID="80bd4104-8309-43d4-a96a-183b7059ae88"   # the 58s master, 1080p

FILM_ONE="${FILM_ONE:-$OUT/master-1.mp4}"
FILM_TWO="${FILM_TWO:-$OUT/master-2.mp4}"

get() {
  local url="$1" dest="$2" label="$3"
  if [ -s "$dest" ]; then
    echo "  ✓ $label already present"
    return 0
  fi
  echo "  ↓ $label"
  # --fail so a 403 from an expired or blocked link is an error, not a 0-byte file.
  if curl -fL --progress-bar -o "$dest.part" "$url"; then
    mv "$dest.part" "$dest"
    return 0
  fi
  rm -f "$dest.part"
  echo "  !! could not fetch $label from $url"
  return 1
}

echo "Vision 2040 — preparing film assets in public/vision2040/"

if [ ! -s "$FILM_TWO" ]; then
  get "$CDN/$FILM_TWO_ID.mp4" "$FILM_TWO" "master-2.mp4  (58s closing film, 1080p)" || true
fi

cut() {
  local src="$1" out="$2" fps="$3" fmt="$4" label="$5"
  if [ ! -s "$src" ]; then
    echo "  — $label: no master at $src, skipping (that act falls back to the stage)"
    return 0
  fi
  echo
  echo "Cutting $label"
  FPS="$fps" WIDTH="${WIDTH:-1440}" FORMAT="$fmt" OUT="$out" "$ROOT/scripts/cut-frames.sh" "$src"
}

cut "$FILM_ONE" frames   24 jpg  "film 1 → public/vision2040/frames/"
cut "$FILM_TWO" frames-2  8 webp "film 2 → public/vision2040/frames-2/"

echo
echo "Done. Now run:  npm run build && npm start"
echo "Then open:      http://localhost:3000/vision-2040"
