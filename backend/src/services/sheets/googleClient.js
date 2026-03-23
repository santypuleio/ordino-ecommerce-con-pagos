import fs from "node:fs/promises";
import { google } from "googleapis";
import { assertGoogleAuthConfigured, env } from "../../config/env.js";

function normalizePrivateKey(key) {
  if (!key) return key;
  // En .env suele venir con \n escapados
  return key.replace(/\\n/g, "\n");
}

export async function getSheetsClient() {
  assertGoogleAuthConfigured();

  let credentials;
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH) {
    const raw = await fs.readFile(env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH, "utf8");
    credentials = JSON.parse(raw);
  } else {
    credentials = {
      client_email: env.GOOGLE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(env.GOOGLE_PRIVATE_KEY),
    };
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return sheets;
}

