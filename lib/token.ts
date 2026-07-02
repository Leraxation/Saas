const TOKEN_URL = `https://login.microsoftonline.com/${
  process.env.AZURE_AD_TENANT_ID ?? "common"
}/oauth2/v2.0/token`;

const SCOPES = [
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Calendars.Read",
  "https://graph.microsoft.com/Tasks.ReadWrite",
  "offline_access",
].join(" ");

let cached: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      refresh_token: process.env.MICROSOFT_REFRESH_TOKEN!,
      scope: SCOPES,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await res.json();

  // Rotate refresh token if Microsoft issues a new one
  if (data.refresh_token) {
    process.env.MICROSOFT_REFRESH_TOKEN = data.refresh_token;
  }

  cached = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cached.token;
}
