import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fixtureAccounts, fixturePassword } from "./fixture-accounts.mjs";
import { buildFixtureDocuments } from "./fixture-data.mjs";

const projectId = "tri-ai-research-demo";
const pagesHost = "aisaturdayslagos.github.io";

function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? { arrayValue: {} } : { arrayValue: { values: value.map(encode) } };
  }
  const fields = {};
  for (const [key, item] of Object.entries(value)) fields[key] = encode(item);
  return { mapValue: { fields } };
}

function encodeDocument(data) {
  const fields = {};
  for (const [key, item] of Object.entries(data)) fields[key] = encode(item);
  return { fields };
}

async function accessToken() {
  const stored = JSON.parse(readFileSync(join(homedir(), ".config/configstore/firebase-tools.json"), "utf8"));
  const refresh = stored.tokens?.refresh_token;
  if (!refresh) throw new Error("Firebase CLI is not logged in. Run npx firebase-tools login.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
      client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  const json = await response.json();
  if (!response.ok || !json.access_token) {
    throw new Error("Could not refresh the Firebase login.");
  }
  return json.access_token;
}

async function authRequest(token, path, body) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-goog-user-project": projectId,
    },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}

async function authAccount(token, account) {
  const created = await authRequest(token, "accounts", {
    email: account.email,
    password: fixturePassword,
    displayName: account.displayName,
    emailVerified: true,
  });
  if (created.ok && created.json.localId) return created.json.localId;
  const lookup = await authRequest(token, "accounts:lookup", { email: [account.email] });
  const existing = lookup.json.users?.[0]?.localId;
  if (!existing) {
    const reason = created.json.error?.message || lookup.json.error?.message || "Could not create the account.";
    throw new Error(`${account.email}: ${reason}`);
  }
  const updated = await authRequest(token, "accounts:update", {
    localId: existing,
    password: fixturePassword,
    displayName: account.displayName,
    emailVerified: true,
  });
  if (!updated.ok) {
    throw new Error(`${account.email}: ${updated.json.error?.message || "Could not update the account."}`);
  }
  return existing;
}

async function writeDocument(token, path, data) {
  const names = Object.keys(data);
  const mask = names.map((name) => `updateMask.fieldPaths=${encodeURIComponent(name)}`).join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}?${mask}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-goog-user-project": projectId,
    },
    body: JSON.stringify(encodeDocument(data)),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not write ${path}: ${response.status} ${detail.slice(0, 300)}`);
  }
}

async function allowPagesHost(token) {
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=authorizedDomains`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-goog-user-project": projectId,
    },
    body: JSON.stringify({
      authorizedDomains: [
        "localhost",
        pagesHost,
        `${projectId}.firebaseapp.com`,
        `${projectId}.web.app`,
      ],
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not allow ${pagesHost}: ${response.status} ${detail.slice(0, 300)}`);
  }
}

try {
  const token = await accessToken();
  const uids = {};
  for (const account of fixtureAccounts) {
    uids[account.key] = await authAccount(token, account);
  }
  const documents = buildFixtureDocuments(uids);
  for (const document of documents) {
    await writeDocument(token, document.path, document.data);
  }
  await allowPagesHost(token);
  console.log(`Seeded ${documents.length} demo records in ${projectId}.`);
  for (const account of fixtureAccounts) {
    console.log(`${account.label}: ${account.email}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
