import msal

# Fill these in from your Azure App Registration
CLIENT_ID = "YOUR_CLIENT_ID_HERE"
CLIENT_SECRET = ""  # Not needed for device flow
TENANT_ID = "YOUR_TENANT_ID_HERE"
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPE = ["Mail.Read", "Calendars.Read", "Tasks.ReadWrite", "User.Read"]
# Note: MSAL adds offline_access automatically — do not include it manually

app = msal.PublicClientApplication(CLIENT_ID, authority=AUTHORITY)

# This will open your browser to log in
flow = app.initiate_device_flow(scopes=SCOPE)

if "error" in flow:
    print(f"Error starting device flow: {flow.get('error_description', flow['error'])}")
    print("Make sure CLIENT_ID is filled in and the app exists in Azure.")
    exit(1)

print(f"Please visit: {flow['verification_uri']}")
print(f"And enter this code: {flow['user_code']}")

result = app.acquire_token_by_device_flow(flow)

if "refresh_token" in result:
    print("\nSUCCESS! Here is your REFRESH_TOKEN:")
    print(result["refresh_token"])
else:
    print("Could not get refresh token. Check your permissions.")
