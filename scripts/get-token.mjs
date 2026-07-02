#!/usr/bin/env node
/**
 * One-time script to get your Microsoft refresh token.
 * Run: node scripts/get-token.mjs
 *
 * Prerequisites in .env.local:
 *   AZURE_AD_CLIENT_ID
 *   AZURE_AD_CLIENT_SECRET
 *   AZURE_AD_TENANT_ID  (or omit to use "common")
 *
 * Azure portal requirement:
 *   App registration → Authentication → "Allow public client flows" = Yes
 */

import { readFileSync } from "fs";

// Load .env.local
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key && !key.startsWith("#")) process.env[key] = val;
    }
  }
} catch {}

const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;
const TENANT = process.env.AZURE_AD_TENANT_ID ?? "common";

if (!CLIENT_ID) {
  console.error("❌  Set AZURE_AD_CLIENT_ID in .env.local first.");
  process.exit(1);
}

const SCOPE = [
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Calendars.Read",
  "https://graph.microsoft.com/Tasks.ReadWrite",
  "offline_access",
].join(" ");

// Step 1: request device code
const deviceRes = await fetch(
  `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/devicecode`,
  {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, scope: SCOPE }),
  }
);

const device = await deviceRes.json();
if (device.error) {
  console.error("❌  Device code error:", device.error_description);
  process.exit(1);
}

console.log("\n" + device.message + "\n");

// Step 2: poll until the user signs in
const pollInterval = (device.interval ?? 5) * 1000;
const expires = Date.now() + device.expires_in * 1000;

while (Date.now() < expires) {
  await new Promise((r) => setTimeout(r, pollInterval));

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    client_id: CLIENT_ID,
    device_code: device.device_code,
  });
  if (CLIENT_SECRET) body.set("client_secret", CLIENT_SECRET);

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  const token = await tokenRes.json();

  if (token.refresh_token) {
    console.log("✅  Got it! Add this line to .env.local and your Vercel env vars:\n");
    console.log(`MICROSOFT_REFRESH_TOKEN=${token.refresh_token}\n`);
    process.exit(0);
  }

  if (token.error && token.error !== "authorization_pending") {
    console.error("❌ ", token.error_description ?? token.error);
    process.exit(1);
  }
}

console.error("❌  Timed out. Run the script again.");
process.exit(1);
