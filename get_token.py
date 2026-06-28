import msal

# Fill these in from your Azure App Registration
CLIENT_ID = "YOUR_CLIENT_ID_HERE"
CLIENT_SECRET = "YOUR_CLIENT_SECRET_HERE"
TENANT_ID = "common"  # Use 'common' for personal/multi-tenant apps
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPE = ["Mail.Read", "Calendars.Read", "offline_access", "User.Read"]

app = msal.PublicClientApplication(CLIENT_ID, authority=AUTHORITY)

# This will open your browser to log in
flow = app.initiate_device_flow(scopes=SCOPE)
print(f"Please visit: {flow['verification_uri']}")
print(f"And enter this code: {flow['user_code']}")

result = app.acquire_token_by_device_flow(flow)

if "refresh_token" in result:
    print("\nSUCCESS! Here is your REFRESH_TOKEN:")
    print(result["refresh_token"])
else:
    print("Could not get refresh token. Check your permissions.")
