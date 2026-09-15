import { chromium } from "playwright";
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [tag, vp] of [["wide", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto("http://localhost:3311/undercover.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const stops = tag === "wide" ? [0, 0.3, 0.42, 0.66, 0.95] : [0, 0.34, 0.95];
  for (let i = 0; i < stops.length; i++) {
    await page.evaluate((f) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, max * f);
    }, stops[i]);
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `${out}/${tag}-${i}.png` });
  }
  // Catch any horizontal overflow at phone width.
  if (tag === "phone") {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log("phone horizontal overflow px:", over);
  }
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  console.log(tag, "errors:", errs.length);
  await page.close();
}
await browser.close();
