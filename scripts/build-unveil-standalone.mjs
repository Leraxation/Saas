#!/usr/bin/env node
/**
 * Bundle the Vespera unveiling into one self-contained HTML file.
 *
 *   node scripts/build-unveil-standalone.mjs            → public/unveil-standalone.html
 *   node scripts/build-unveil-standalone.mjs out.html   → wherever you say
 *
 * Same React component, same Three.js scene, same GSAP timeline as the
 * /unveil route. Fonts come from Google Fonts at runtime (the Next route
 * self-hosts them); everything else is inlined.
 */
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(process.argv[2] ?? path.join(root, "public", "unveil-standalone.html"));

const result = await build({
  entryPoints: [path.join(root, "lib/unveil/standalone.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    // Three's DRACOLoader builds its decoder URLs from import.meta.url; an
    // IIFE has none, so point it at the matching CDN copy.
    "import.meta.url": '"https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/loaders/DRACOLoader.js"',
  },
  alias: { "@": root },
  logLevel: "warning",
  legalComments: "none",
});

const js = result.outputFiles[0].text;
const css = await readFile(path.join(root, "app/unveil/unveil.css"), "utf8");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nocturne Vespera — The Unveiling</title>
<meta name="description" content="A scroll-driven unveiling: a grand tourer under silk, pulled back as you scroll, taken apart and put back together in one continuous shot.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Manrope:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
html, body { margin: 0; padding: 0; background: #07070a; color: #efe8dc; }
#unveil-root { --font-display: "Syncopate"; --font-body: "Manrope"; --font-mono: "JetBrains Mono"; }
${css}
</style>
</head>
<body>
<div id="unveil-root"></div>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>
`;

await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, html);
console.log(`wrote ${path.relative(root, out)} (${(html.length / 1024).toFixed(0)} kB)`);
