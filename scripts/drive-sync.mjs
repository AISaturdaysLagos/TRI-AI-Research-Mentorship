import { randomUUID } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, ".drive-sync");
const jobPath = path.join(dir, "job.json");
const resultPath = path.join(dir, "result.json");
const cataloguePath = path.join(root, "src/lib/projectDrive.ts");
const registryPath = path.join(dir, "registry.json");
const origins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

fs.mkdirSync(dir, { recursive: true });

function catalogueText() {
  return fs.readFileSync(cataloguePath, "utf8");
}

function registry() {
  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rememberRegistry(files) {
  if (!Array.isArray(files) || files.length === 0) return;
  const byId = new Map(registry().map((file) => [file.id, file]));
  for (const file of files) {
    if (file && typeof file.id === "string" && typeof file.name === "string") byId.set(file.id, file);
  }
  fs.writeFileSync(registryPath, JSON.stringify([...byId.values()]));
}

function allowed(fileId) {
  const catalogue = catalogueText();
  if (catalogue.includes(`document("${fileId}"`) || catalogue.includes(`folder("${fileId}"`)) return true;
  return registry().some((file) => file.id === fileId);
}

function readResult(id) {
  try {
    const parsed = JSON.parse(fs.readFileSync(resultPath, "utf8"));
    if (parsed && parsed.id === id) return parsed;
  } catch {
    /* result not written yet */
  }
  return null;
}

function waitForResult(id) {
  const started = Date.now();
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      const result = readResult(id);
      if (result) {
        clearInterval(timer);
        resolve(result);
        return;
      }
      if (Date.now() - started > 75000) {
        clearInterval(timer);
        resolve(null);
      }
    }, 200);
  });
}

let tail = Promise.resolve();

function enqueue(task) {
  const run = tail.then(task, task);
  tail = run.then(
    () => {},
    () => {},
  );
  return run;
}

function send(response, status, body, origin) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin || "http://127.0.0.1:5173",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  response.writeHead(status, headers);
  response.end(body ? JSON.stringify(body) : "");
}

const server = http.createServer((request, response) => {
  const origin = request.headers.origin || "";
  if (request.method === "OPTIONS") {
    send(response, 204, null, origins.has(origin) ? origin : "http://127.0.0.1:5173");
    return;
  }
  if (request.method !== "POST" || (request.url !== "/drive-doc" && request.url !== "/drive-ensure")) {
    send(response, 404, { ok: false }, origin);
    return;
  }
  const ensure = request.url === "/drive-ensure";
  if (origin && !origins.has(origin)) {
    send(response, 403, { ok: false }, origin);
    return;
  }
  const chunks = [];
  let size = 0;
  request.on("data", (chunk) => {
    size += chunk.length;
    if (size > 200000) {
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on("end", () => {
    void enqueue(async () => {
      let payload;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        send(response, 400, { ok: false }, origin);
        return;
      }
      const fileId = typeof payload.fileId === "string" ? payload.fileId : "";
      const markdown = typeof payload.markdown === "string" ? payload.markdown : "";
      if (!ensure && (!allowed(fileId) || !markdown.trim() || markdown.length > 100000)) {
        send(response, 400, { ok: false }, origin);
        return;
      }
      if (ensure) {
        const title = typeof payload.title === "string" ? payload.title.slice(0, 200) : "";
        const documents = Array.isArray(payload.documents) ? payload.documents.slice(0, 20) : [];
        const people = Array.isArray(payload.people) ? payload.people.slice(0, 40) : [];
        if (!title || (documents.length === 0 && people.length === 0 && payload.folderId)) {
          send(response, 400, { ok: false }, origin);
          return;
        }
      }
      const id = randomUUID();
      fs.rmSync(resultPath, { force: true });
      fs.writeFileSync(jobPath, JSON.stringify(ensure ? { id, action: "ensure", ...payload } : { id, fileId, markdown }));
      const prompt = ensure
        ? `A project needs its Google Drive folder. Read .drive-sync/job.json. parentId is the programme returns folder. When folderId is empty, create a folder named title inside parentId. Create each people[].name folder inside the project folder. Create each documents[] item as a Google Doc in the project folder with create_file (contentMimeType text/markdown, targetMimeType application/vnd.google-apps.document, textContent from markdown). Add the new folder() and document() entries to src/lib/projectDrive.ts for projectId. Write .drive-sync/result.json as {"id":"${id}","ok":true,"drive":{"id":"<project folder id>","name":"<title>","url":"https://drive.google.com/drive/folders/<id>","files":[{"id":"...","name":"...","url":"...","kind":"folder"}]}} with only the new files. Do not print document bodies.`
        : `A programme record was saved. Read .drive-sync/job.json. Update that Google Doc with update_file_content (fileId, contentMimeType text/markdown, textContent from markdown). Then write .drive-sync/result.json as {"id":"${id}","ok":true}. Do not print the document body.`;
      console.log(`AGENT_LOOP_TICK_drive ${JSON.stringify({ prompt })}`);
      const result = await waitForResult(id);
      if (!result?.ok) {
        send(response, 504, { ok: false }, origin);
        return;
      }
      if (ensure && result.drive?.files) rememberRegistry(result.drive.files);
      if (ensure && result.drive?.id) rememberRegistry([{ id: result.drive.id, name: result.drive.name, kind: "folder" }]);
      send(response, 200, ensure ? { ok: true, drive: result.drive } : { ok: true }, origin);
    });
  });
});

server.listen(8787, "127.0.0.1", () => {
  console.log("drive-sync listening on 127.0.0.1:8787");
});
