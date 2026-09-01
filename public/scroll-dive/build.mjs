/* =============================================================
   Static page builder — no dependencies.

   Composes each page in src/pages/ with the shared partials so the
   header and footer exist in exactly one place. Run after editing
   anything under src/:

       node public/scroll-dive/build.mjs

   Templating is two directives, deliberately:
     {{name}}                    a value from the page's entry below
     <!--#include partials/x-->  inlines src/partials/x
   ============================================================= */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");

/* Absolute origin the site is served from. Open Graph and canonical URLs are
   supposed to be absolute, so set this before launch; while it is empty the
   tags fall back to page-relative values, which most crawlers still resolve. */
const BASE = process.env.SITE_BASE_URL || "";

/* Every page, with the nav item it should mark as current. */
const PAGES = [
  { file: "index.html",        nav: "home",         title: "Oman Air — Fly the Sultanate",
    description: "Book flights, manage your trip and check in with Oman Air. Non-stop from Muscat to the Gulf, Europe, Africa and Asia.",
    home: true },
  { file: "destinations.html", nav: "destinations", title: "Destinations — Oman Air",
    description: "Where Oman Air flies: the network from Muscat across the Gulf, Asia, Europe and Africa." },
  { file: "experience.html",   nav: "experience",   title: "Experience — Oman Air",
    description: "Cabin classes, dining, entertainment, lounges and Tashreef Services on Oman Air." },
  { file: "sindbad.html",      nav: "sindbad",      title: "Sindbad — Oman Air",
    description: "Sindbad, the frequent flyer programme of Oman Air. Earn and redeem miles across the network." },
  { file: "offers.html",       nav: "offers",       title: "Offers — Oman Air",
    description: "Current fares, holiday packages and seasonal offers from Oman Air." },
  { file: "help.html",         nav: "help",         title: "Help & contact — Oman Air",
    description: "Contact Oman Air, read the FAQs, request special assistance or send feedback." },
];

const read = (p) => readFileSync(join(SRC, p), "utf8");

/** Inline every <!--#include partials/x-->, recursively. */
function include(html) {
  return html.replace(/<!--#include\s+([\w./-]+)\s*-->/g, (_, path) => include(read(path)));
}

/** Substitute {{name}} from the page entry; unknown names become empty. */
function fill(html, page) {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => String(page[key] ?? ""));
}

const shell = read("partials/shell.html");
let built = 0;

for (const page of PAGES) {
  const body = read(`pages/${page.file}`);
  const html = fill(include(shell.replace("{{body}}", body)), {
    ...page,
    // Home carries the canvas hero and its engine; inner pages do not.
    canvas: page.home ? '<!--#include partials/hero-canvas.html-->' : "",
    sequenceScripts: page.home
      ? read("partials/scripts-sequence.html")
      : "",
    bodyClass: page.home ? "page-home" : "page-inner",
    canonical: BASE ? `${BASE.replace(/\/$/, "")}/${page.file}` : page.file,
    ogImage: BASE ? `${BASE.replace(/\/$/, "")}/og-image.jpg` : "og-image.jpg",
    // Preload the first frame of whichever set this viewport will ask for.
    // pickSource() in main.js draws the same 900px line.
    preload: page.home
      ? '<link rel="preload" as="image" media="(max-width: 899px)" href="frames-960/frame_0001.webp" fetchpriority="high" />\n  '
        + '<link rel="preload" as="image" media="(min-width: 900px)" href="frames-1600/frame_0001.webp" fetchpriority="high" />'
      : "",
    [`is${page.nav}`]: " aria-current=\"page\"",
  });
  // A second pass resolves includes that arrived through a substitution.
  writeFileSync(join(ROOT, page.file), include(html));
  built++;
}

/* sitemap + robots, generated from the same page list */
const urls = PAGES.map((p) => {
  const loc = BASE ? `${BASE.replace(/\/$/, "")}/${p.file}` : p.file;
  return `  <url><loc>${loc}</loc><priority>${p.home ? "1.0" : "0.7"}</priority></url>`;
}).join("\n");

writeFileSync(join(ROOT, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);

writeFileSync(join(ROOT, "robots.txt"),
`# This build carries placeholder fares, timings and contact details.
# Indexing them under the Oman Air name would be misleading, so crawling is
# blocked. Before launch: replace the placeholder content, delete the
# "noindex" meta in src/partials/shell.html, and swap the rule below for
# "Allow: /".
User-agent: *
Disallow: /
${BASE ? `\nSitemap: ${BASE.replace(/\/$/, "")}/sitemap.xml\n` : ""}`);

console.log(`built ${built} pages, sitemap.xml and robots.txt`);
