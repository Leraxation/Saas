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
    [`is${page.nav}`]: " aria-current=\"page\"",
  });
  // A second pass resolves includes that arrived through a substitution.
  writeFileSync(join(ROOT, page.file), include(html));
  built++;
}

console.log(`built ${built} pages`);
