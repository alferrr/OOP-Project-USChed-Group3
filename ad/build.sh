#!/usr/bin/env bash
# Phase C: turn the rendered frames into MP4s. Run `npm run capture`, then `npx tsx render.ts` (and `... vertical`) first.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out

encode() { # $1 = frames dir, $2 = output file
  local tmp; tmp="$(mktemp -d)"
  : > "$tmp/list.txt"
  for beat in "$1"/beat-0*; do
    local clip="$tmp/$(basename "$beat").mp4"
    ffmpeg -y -loglevel error -framerate 30 -i "$beat/frame-%05d.png" \
      -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -r 30 "$clip"
    echo "file '$clip'" >> "$tmp/list.txt"
  done
  ffmpeg -y -loglevel error -f concat -safe 0 -i "$tmp/list.txt" -c copy -movflags +faststart -an "$2"
  rm -rf "$tmp"
  echo "wrote $2"
}

encode frames out/usched-ad-16x9.mp4
encode frames-v out/usched-ad-9x16.mp4
