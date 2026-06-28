import { chromium } from "../node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
await page.screenshot({ path: "./dashboard-preview.png" });
await browser.close();
console.log("Screenshot saved.");
