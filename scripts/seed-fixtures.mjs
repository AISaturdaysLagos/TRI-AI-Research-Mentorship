import { fixtureAccounts, fixturePassword } from "./fixture-accounts.mjs";
import { buildFixtureDocuments } from "./fixture-data.mjs";

const projectId = "tri-ai-research-mentorship";
const authHost = "http://127.0.0.1:9099";
const firestoreHost = "http://127.0.0.1:8080";

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

async function authAccount(email) {
  const body = JSON.stringify({ email, password: fixturePassword, returnSecureToken: true });
  const signUp = await fetch(
    `${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
  );
  const created = await signUp.json();
  if (signUp.ok) return created.localId;
  const signIn = await fetch(
    `${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
  );
  const existing = await signIn.json();
  if (!signIn.ok) {
    throw new Error(existing.error?.message || `Could not create ${email}`);
  }
  return existing.localId;
}

async function deleteDocument(path) {
  const url = `${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/${path}`;
  const response = await fetch(url, { method: "DELETE", headers: { Authorization: "Bearer owner" } });
  if (!response.ok && response.status !== 404) {
    const detail = await response.text();
    throw new Error(`Could not delete ${path}: ${response.status} ${detail.slice(0, 300)}`);
  }
}

async function writeDocument(path, data) {
  const url = `${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/${path}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer owner",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(encodeDocument(data)),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not write ${path}: ${response.status} ${detail.slice(0, 300)}`);
  }
}

try {
  const uids = {};
  for (const account of fixtureAccounts) {
    uids[account.key] = await authAccount(account.email);
  }
  const documents = buildFixtureDocuments(uids);
  for (const path of ["awards/saturdays-clinic", "proposals/fixture-clinic-speech"]) {
    await deleteDocument(path);
  }
  for (const document of documents) {
    await writeDocument(document.path, document.data);
  }
  console.log(`Seeded ${documents.length} local fixture records.`);
  for (const account of fixtureAccounts) {
    console.log(`${account.label}: ${account.email}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
    console.error("The local Firebase emulators are not running. Start them with npm run emulators, then run this again.");
    process.exit(1);
  }
  console.error(message);
  process.exit(1);
}
