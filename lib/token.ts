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
  // Return cached token if still valid (with 1-minute buffer)
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  if (!process.env.MICROSOFT_REFRESH_TOKEN) {
    throw new Error(
      "MICROSOFT_REFRESH_TOKEN environment variable is not set. " +
      "Please run 'python get_token.py' to obtain a refresh token."
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      refresh_token: process.env.MICROSOFT_REFRESH_TOKEN,
      scope: SCOPES,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    // Log the error but mask sensitive details in the response
    console.error("Token refresh failed:", err);
    throw new Error(
      "Failed to refresh Microsoft access token. " +
      "Please check your Azure AD credentials and try again."
    );
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error("No access token received from Microsoft. Check your credentials.");
  }

  // Rotate refresh token if Microsoft issues a new one
  if (data.refresh_token && data.refresh_token !== process.env.MICROSOFT_REFRESH_TOKEN) {
    process.env.MICROSOFT_REFRESH_TOKEN = data.refresh_token;
    // In production, persist the new refresh token to secure storage
  }

  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  return cached.token;
}
