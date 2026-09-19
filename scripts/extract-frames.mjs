#!/usr/bin/env node
/**
 * Turns a Higgsfield reveal clip into the assets the scroll canvas consumes.
 *
 *   node scripts/extract-frames.mjs <part> <video: path or URL> [frames] [width]
 *
 * Writes, under public/vehicles/<part>/:
 *   reveal.mp4     the clip itself (copied in, so the repo is self-contained)
 *   frames/NNNN.jpg  the scrubbed sequence
 *   poster.jpg     first frame, used by the no-WebGL fallback
 *   reveal.json    the manifest components/scroll-canvas/revealSource.ts reads
 *
 * Re-running replaces that part's previous sequence.
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync,
} from "node:fs";
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");

const [, , part, source, framesArg = "120", widthArg = "1600"] = process.argv;

if (!part || !source) {
  console.error("usage: node scripts/extract-frames.mjs <part> <video> [frames] [width]");
  console.error("  <video> may be a local path or a https URL (e.g. a Higgsfield result)");
  console.error("example: node scripts/extract-frames.mjs part-1 https://.../reveal.mp4");
  process.exit(1);
}

if (!/^part-\d+$/.test(part)) {
  console.error(`"${part}" is not a part id — expected something like part-1`);
  process.exit(1);
}

const frames = Number(framesArg);
const width = Number(widthArg);
const partDir = path.join("public", "vehicles", part);
const framesDir = path.join(partDir, "frames");

if (!existsSync(partDir)) {
  console.error(`${partDir} does not exist — add the part's source photos first`);
  process.exit(1);
}

rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const localVideo = path.join(partDir, "reveal.mp4");

/**
 * A Higgsfield result URL is the normal input, so fetch it to reveal.mp4 before
 * extracting — the manifest points the lite tier at that local file, and
 * streaming straight from the CDN would leave it missing.
 */
async function resolveSource(input) {
  if (!/^https?:\/\//.test(input)) return input;

  console.log(`fetching ${input}`);
  const res = await fetch(input);
  if (!res.ok) {
    console.error(`download failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  await writeFile(localVideo, Buffer.from(await res.arrayBuffer()));
  console.log(`saved ${localVideo}`);
  return localVideo;
}

const input = await resolveSource(source);

// ffmpeg reports metadata on stderr and exits non-zero with no output file.
const probe = execFileSync(ffmpeg, ["-i", input], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).toString();

const durationMatch = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(probe);
if (!durationMatch) {
  console.error("could not read a duration from", input);
  process.exit(1);
}

const duration =
  Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3]);
const fps = frames / duration;

console.log(`${part}: ${duration.toFixed(2)}s -> ${frames} frames @ ${fps.toFixed(3)} fps`);

execFileSync(
  ffmpeg,
  [
    "-y",
    "-i", input,
    "-vf", `fps=${fps},scale=${width}:-2:flags=lanczos`,
    "-q:v", "4",
    "-frames:v", String(frames),
    path.join(framesDir, "%04d.jpg"),
  ],
  { stdio: "inherit" },
);

const written = readdirSync(framesDir).filter((f) => f.endsWith(".jpg")).sort();
if (!written.length) {
  console.error("ffmpeg produced no frames");
  process.exit(1);
}

// Keep the clip alongside the frames: the lite tier scrubs it instead of
// holding a decoded sequence in memory.
if (path.resolve(input) !== path.resolve(localVideo) && existsSync(input)) {
  copyFileSync(input, localVideo);
}

execFileSync(
  ffmpeg,
  ["-y", "-i", path.join(framesDir, written[0]), "-q:v", "3", path.join(partDir, "poster.jpg")],
  { stdio: "ignore" },
);

const dimensions = /,\s(\d{2,5})x(\d{2,5})[\s,]/.exec(probe);

writeFileSync(
  path.join(partDir, "reveal.json"),
  JSON.stringify(
    {
      mode: "frames",
      part,
      count: written.length,
      pattern: `/vehicles/${part}/frames/%04d.jpg`,
      video: `/vehicles/${part}/reveal.mp4`,
      width,
      height: Math.round(
        dimensions ? (width * Number(dimensions[2])) / Number(dimensions[1]) : (width * 9) / 16,
      ),
      sourceDuration: Number(duration.toFixed(3)),
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);

console.log(`${part}: wrote ${written.length} frames, poster.jpg and reveal.json`);
