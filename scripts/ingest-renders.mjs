#!/usr/bin/env node
/**
 * Pulls a whole set of generated renders into the repo in one pass.
 *
 *   node scripts/ingest-renders.mjs renders.json [frames] [width]
 *
 * renders.json maps each part to the assets generated for it:
 *
 *   {
 *     "part-1": { "hero": "https://...png", "video": "https://...mp4" },
 *     "part-2": { "hero": "https://...png", "video": "https://...mp4" }
 *   }
 *
 * For each entry it saves the hero to public/vehicles/<part>/hero.png and runs
 * scripts/extract-frames.mjs on the clip, which writes reveal.mp4, the frame
 * sequence, poster.jpg and reveal.json.
 *
 * Run this locally: a Claude Code web session's egress proxy denies the
 * Higgsfield CDN by policy, so the downloads only succeed on your machine.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const [, , configPath, framesArg = "120", widthArg = "1600"] = process.argv;

if (!configPath) {
  console.error("usage: node scripts/ingest-renders.mjs renders.json [frames] [width]");
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
const entries = Object.entries(config);

if (!entries.length) {
  console.error(`${configPath} lists no parts`);
  process.exit(1);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

let failures = 0;

for (const [part, assets] of entries) {
  if (!/^part-\d+$/.test(part)) {
    console.error(`skipping "${part}": not a part id`);
    failures += 1;
    continue;
  }

  const partDir = path.join("public", "vehicles", part);
  mkdirSync(partDir, { recursive: true });

  if (assets.hero) {
    const dest = path.join(partDir, "hero.png");
    try {
      await download(assets.hero, dest);
      console.log(`${part}: hero -> ${dest}`);
    } catch (err) {
      console.error(`${part}: hero failed - ${err.message}`);
      failures += 1;
    }
  }

  if (assets.video) {
    try {
      execFileSync(
        process.execPath,
        ["scripts/extract-frames.mjs", part, assets.video, framesArg, widthArg],
        { stdio: "inherit" },
      );
    } catch {
      // extract-frames reports its own reason before exiting non-zero.
      console.error(`${part}: frame extraction failed`);
      failures += 1;
    }
  }
}

console.log(failures ? `\ndone with ${failures} failure(s)` : "\nall renders ingested");
process.exit(failures ? 1 : 0);
