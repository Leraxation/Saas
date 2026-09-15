#!/usr/bin/env node
/**
 * Turns a 360 orbit render into the JPEG sequence the garage canvas scrubs.
 *
 *   node scripts/extract-frames.mjs <slug> <video: path or https URL> [frames] [width]
 *
 * Writes public/garage/<slug>/frames/0001.jpg ... and the reveal.json manifest
 * that VehicleReveal reads. Re-running replaces the previous sequence.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");

const [, , slug, source, framesArg = "120", widthArg = "1440"] = process.argv;

if (!slug || !source) {
  console.error("usage: node scripts/extract-frames.mjs <slug> <video> [frames] [width]");
  process.exit(1);
}

const frames = Number(framesArg);
const width = Number(widthArg);
const outDir = path.join("public", "garage", slug, "frames");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Probe duration so the sequence spans the whole orbit evenly.
const probe = execFileSync(ffmpeg, ["-i", source], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  .toString();
const durMatch = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(probe);
if (!durMatch) {
  console.error("could not read duration from", source);
  process.exit(1);
}
const duration =
  Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3]);
const fps = frames / duration;

console.log(`${slug}: ${duration.toFixed(2)}s → ${frames} frames @ ${fps.toFixed(3)} fps`);

execFileSync(
  ffmpeg,
  [
    "-y",
    "-i", source,
    "-vf", `fps=${fps},scale=${width}:-2:flags=lanczos`,
    "-q:v", "4",
    "-frames:v", String(frames),
    path.join(outDir, "%04d.jpg"),
  ],
  { stdio: "inherit" },
);

const written = readdirSync(outDir).filter((f) => f.endsWith(".jpg")).sort();
if (!written.length) {
  console.error("ffmpeg produced no frames");
  process.exit(1);
}

// The poster doubles as the section's fallback still.
const posterSrc = path.join(outDir, written[0]);
const posterDest = path.join("public", "garage", slug, "poster.jpg");
if (existsSync(posterSrc)) {
  execFileSync(ffmpeg, ["-y", "-i", posterSrc, "-q:v", "3", posterDest], { stdio: "ignore" });
}

const manifest = {
  mode: "frames",
  count: written.length,
  pattern: `/garage/${slug}/frames/%04d.jpg`,
  width,
  height: Math.round(width * 9 / 16),
  generatedAt: new Date().toISOString(),
};
writeFileSync(
  path.join("public", "garage", slug, "reveal.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);

console.log(`${slug}: wrote ${written.length} frames + reveal.json`);
