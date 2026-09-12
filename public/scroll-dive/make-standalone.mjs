/* Build a single self-contained HTML file: styles, scripts, GSAP and the
   frame sequence all inlined, so it opens by double-click with no server. */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(DIR, p), "utf8");
const b64 = (p) => readFileSync(join(DIR, p)).toString("base64");

const STRIDE = 2;                    // halve the frames to keep the file sendable
const SET = "frames-960";

/* Mirror main.js's own flattening so we inline exactly what it will ask for. */
const segments = [
  { from: 1, to: 168 }, { hold: 169 }, { from: 170, to: 245 },
  { hold: 169 }, { from: 246, to: 325 },
];
const files = [];
const layout = segments.map((seg) => {
  const start = files.length;
  if (seg.hold != null) files.push(seg.hold);
  else for (let n = seg.from; n <= seg.to; n++) files.push(n);
  return { start, end: files.length - 1 };
});
const total = files.length;
const keep = new Set([0, total - 1]);
for (let i = 0; i < total; i += STRIDE) keep.add(i);
layout.forEach((s) => { keep.add(s.start); keep.add(s.end); });

const needed = [...new Set([...keep].map((i) => files[i]))].sort((a, b) => a - b);
const frames = {};
let bytes = 0;
for (const n of needed) {
  const file = `${SET}/frame_${String(n).padStart(4, "0")}.webp`;
  bytes += statSync(join(DIR, file)).size;
  frames[n] = `data:image/webp;base64,${b64(file)}`;
}

let main = read("main.js")
  .replace("const SOURCE = pickSource();", 'const SOURCE = { dir: "inline", width: 960, stride: %STRIDE% };'.replace("%STRIDE%", STRIDE))
  .replace(/const framePath = \(n\) =>\n\s+`[^`]+`;/, "const framePath = (n) => window.__FRAMES[n];");

/* Every insertion goes through a replacer function. A replacement *string*
   would interpret $&, $', $` and $1 - and site.js is full of $('#id'), which
   as $' means "the rest of the subject string". That silently spliced the
   document into its own scripts. */
const put = (v) => () => v;

let html = read("index.html")
  // the preload pair points at files that will not exist beside this document
  .replace(/\s*<link rel="preload"[^>]*>/g, "")
  .replace(/\s*<link rel="stylesheet" href="styles\.css"[^>]*>/, put(`\n  <style>\n${read("styles.css")}\n  </style>`))
  .replace(/\s*<link rel="stylesheet" href="site\.css"[^>]*>/, put(`\n  <style>\n${read("site.css")}\n  </style>`))
  // GSAP: drop the CDN pair and its document.write fallback, inline the vendored copies
  .replace(/\s*<script src="https:\/\/cdnjs[^>]*><\/script>/g, "")
  .replace(/\s*<script>\s*if \(!window\.gsap\)[\s\S]*?<\/script>/, "")
  .replace('<script src="main.js"></script>', put(
    `<script>${read("vendor/gsap.min.js")}</script>\n`
    + `<script>${read("vendor/ScrollTrigger.min.js")}</script>\n`
    + `<script>window.__FRAMES = ${JSON.stringify(frames)};</script>\n`
    + `<script>${main}</script>`))
  .replace('<script src="site.js"></script>', put(`<script>${read("site.js")}</script>`))
  .replace("<title>", put('<!-- Self-contained preview. Frames thinned to every '
    + STRIDE + 'nd. The real site is public/scroll-dive/ in the repo. -->\n  <title>'));

const out = process.env.OUT || join(DIR, "..", "..", "oman-air-homepage-preview.html");
writeFileSync(out, html);
console.log(`inlined ${needed.length} of ${total} frames (${(bytes/1048576).toFixed(1)} MB raw)`);
console.log(`${out} -> ${(statSync(out).size/1048576).toFixed(1)} MB`);
