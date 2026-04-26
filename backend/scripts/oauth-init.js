#!/usr/bin/env node
/**
 * One-time OAuth setup. Reads GOOGLE_OAUTH_CLIENT_SECRET_PATH from .env,
 * runs the consent flow in your browser, and writes the resulting refresh
 * token to GOOGLE_OAUTH_TOKEN_PATH.
 *
 * Re-run this if your refresh token has been revoked or expired (the OAuth
 * consent screen in "Testing" mode invalidates refresh tokens after 7 days).
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { authenticate } = require("@google-cloud/local-auth");

const SCOPES = ["https://www.googleapis.com/auth/drive"];

async function main() {
  const csPath = process.env.GOOGLE_OAUTH_CLIENT_SECRET_PATH;
  const tokenPath = process.env.GOOGLE_OAUTH_TOKEN_PATH;

  if (!csPath || !tokenPath) {
    console.error(
      "Missing env: set GOOGLE_OAUTH_CLIENT_SECRET_PATH and GOOGLE_OAUTH_TOKEN_PATH in backend/.env"
    );
    process.exit(1);
  }
  if (!fs.existsSync(csPath)) {
    console.error(`Client secret JSON not found at: ${csPath}`);
    console.error(
      "Create one in Google Cloud Console → APIs & Services → Credentials → " +
        "Create credentials → OAuth client ID (type: Desktop app), then download the JSON."
    );
    process.exit(1);
  }

  console.log("Opening your browser to grant Drive access...");
  const client = await authenticate({ keyfilePath: csPath, scopes: SCOPES });

  if (!client.credentials.refresh_token) {
    console.warn(
      "\nWARNING: no refresh_token in the response. Google only returns one on the FIRST grant.\n" +
        "Revoke this app at https://myaccount.google.com/permissions and re-run this script."
    );
  }

  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  fs.writeFileSync(tokenPath, JSON.stringify(client.credentials, null, 2));
  console.log(`\nSaved token to: ${tokenPath}`);
  console.log("Backend and Python tool will now use OAuth uploads/reads against your Drive.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
