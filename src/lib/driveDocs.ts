import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "./firebase";
import {
  PROGRAMME_RETURNS_FOLDER_ID,
  personFolderName,
  projectDrive,
  rememberDriveFiles,
  rememberProjectFolder,
  type ProjectDrive,
  type ProjectDriveFile,
} from "./projectDrive";
import {
  CHARTER_FIELD_LABELS,
  EMPTY_CHARTER,
  OUTPUT_STATUSES,
  OUTPUT_TYPES,
  RESOURCE_TYPES,
  type CharterRecord,
  type MilestoneRecord,
  type OutputRecord,
  type ProgressRecord,
  type ResourceRecord,
} from "./workspace";

export type DocBlock = { style: "h1" | "h2" | "p"; text: string };

const LOCAL_DRIVE = "http://127.0.0.1:8787/drive-doc";
const LOCAL_ENSURE = "http://127.0.0.1:8787/drive-ensure";
const LOCAL_READ = "http://127.0.0.1:8787/drive-read";

export function blocksToMarkdown(blocks: DocBlock[]) {
  return blocks
    .map((block) => {
      if (block.style === "h1") return `# ${block.text}`;
      if (block.style === "h2") return `## ${block.text}`;
      const labeled = /^([^:\n]{1,48}):\s*([\s\S]*)$/.exec(block.text);
      if (labeled) return `**${labeled[1]}:** ${labeled[2]}`;
      return block.text;
    })
    .join("\n\n");
}

const DOCUMENTS = "https://www.googleapis.com/auth/documents";
const DRIVE = "https://www.googleapis.com/auth/drive";
const DRIVE_API = "https://www.googleapis.com/drive/v3";

let cached: { token: string; until: number } | null = null;
const DRIVE_TOKEN_KEY = "tri.drive.access";

function rememberedDriveToken(uid: string) {
  if (cached && cached.until > Date.now()) return cached.token;
  try {
    const raw = sessionStorage.getItem(DRIVE_TOKEN_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { uid?: string; token?: string; until?: number };
    if (parsed.uid !== uid || !parsed.token || !parsed.until || parsed.until <= Date.now()) return "";
    cached = { token: parsed.token, until: parsed.until };
    return parsed.token;
  } catch {
    return "";
  }
}

function rememberDriveToken(uid: string, token: string) {
  const until = Date.now() + 45 * 60 * 1000;
  cached = { token, until };
  try {
    sessionStorage.setItem(DRIVE_TOKEN_KEY, JSON.stringify({ uid, token, until }));
  } catch {
    // The in-memory token still covers this page when storage is blocked.
  }
}

function forgetDriveToken() {
  cached = null;
  try {
    sessionStorage.removeItem(DRIVE_TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function named(pairs: readonly (readonly [string, string])[], value?: string) {
  return pairs.find(([item]) => item === value)?.[1] || value || "—";
}

function line(text: string) {
  const trimmed = text.trim();
  return trimmed || "—";
}

/** Canonical charter headings written to Drive — keep in sync with CHARTER_FIELD_LABELS. */
export const CHARTER_DOC_FIELDS: { key: keyof CharterRecord; label: string }[] = CHARTER_FIELD_LABELS.map(
  ({ key, label }) => ({ key, label }),
);

const CHARTER_HEADING_ALIASES: Record<string, keyof CharterRecord> = {
  objectives: "objectives",
  scope: "objectives",
  "out of scope": "outOfScope",
  duration: "duration",
  "researcher responsibilities": "researcherDuties",
  roles: "researcherDuties",
  "senior researcher responsibilities": "seniorDuties",
  "tri ai responsibilities": "triDuties",
  "meeting cadence": "cadence",
  cadence: "cadence",
  "meeting format": "meetingFormat",
  resources: "resources",
  "integrity and ethics": "integrity",
  "integrity and risk": "integrity",
  integrity: "integrity",
  risks: "risks",
  authorship: "authorship",
  "authorship and ip": "authorship",
  "intellectual property": "ip",
  "release expectations": "release",
  "success criteria": "successCriteria",
  communication: "communication",
  "additional notes": "notes",
  notes: "notes",
};

export function charterBlocks(projectTitle: string, charter: CharterRecord, signed: boolean): DocBlock[] {
  const blocks: DocBlock[] = [
    { style: "h1", text: "Project Charter" },
    { style: "p", text: `Project: ${projectTitle}` },
  ];
  if (signed) blocks.push({ style: "p", text: "Signed." });
  for (const { key, label } of CHARTER_DOC_FIELDS) {
    blocks.push({ style: "h2", text: label });
    blocks.push({ style: "p", text: line(charter[key]) });
  }
  return blocks;
}

function blankValue(value: string) {
  const trimmed = value.trim();
  return !trimmed || trimmed === "—";
}

function charterHasContent(charter: CharterRecord) {
  return CHARTER_DOC_FIELDS.some(({ key }) => !blankValue(charter[key]));
}

/** Parse a Project Charter Google Doc (current or legacy headings) into the form record. */
export function parseCharterMarkdown(markdown: string): CharterRecord {
  const next: CharterRecord = { ...EMPTY_CHARTER };
  const lines = markdown.split(/\n/);
  let key: keyof CharterRecord | null = null;
  const buckets: Partial<Record<keyof CharterRecord, string[]>> = {};
  for (const raw of lines) {
    const trimmedLine = raw.trim();
    const markdownHeading = /^#{1,3}\s+(.+)$/.exec(trimmedLine);
    if (markdownHeading) {
      key = CHARTER_HEADING_ALIASES[markdownHeading[1].trim().toLowerCase()] ?? null;
      continue;
    }
    const bareHeading = CHARTER_HEADING_ALIASES[trimmedLine.toLowerCase()];
    if (bareHeading) {
      key = bareHeading;
      continue;
    }
    if (!key) continue;
    const text = raw.replace(/^\*\*[^*]+:\*\*\s*/, "").trim();
    if (!text || text === "—" || /^#\s/.test(text) || text.startsWith("Project:") || text === "Signed.") continue;
    (buckets[key] ??= []).push(text);
  }
  for (const field of CHARTER_DOC_FIELDS) {
    const parts = buckets[field.key];
    if (parts?.length) next[field.key] = parts.join("\n");
  }
  return next;
}

/** Prefer non-empty Drive values; keep form values for fields the doc does not cover. */
export function mergeCharterFromDoc(form: CharterRecord, fromDoc: CharterRecord): CharterRecord {
  const next = { ...form };
  for (const { key } of CHARTER_DOC_FIELDS) {
    if (!blankValue(fromDoc[key])) next[key] = fromDoc[key];
  }
  return next;
}

function chartersEqual(a: CharterRecord, b: CharterRecord) {
  return CHARTER_DOC_FIELDS.every(({ key }) => a[key].trim() === b[key].trim());
}

export function milestoneBlocks(projectTitle: string, item: Omit<MilestoneRecord, "id">): DocBlock[] {
  return [
    { style: "h1", text: `Milestone — ${item.title || "Milestone"}` },
    { style: "p", text: `Project: ${projectTitle}` },
    { style: "p", text: `Owner: ${line(item.ownerName || "")}` },
    { style: "p", text: `Due: ${line(item.due || "")}` },
    { style: "p", text: `Status: ${item.status === "done" ? "Done" : "Open"}` },
    { style: "p", text: `Evidence: ${line(item.evidence || "")}` },
  ];
}

export function progressBlocks(projectTitle: string, item: Omit<ProgressRecord, "id">): DocBlock[] {
  return [
    { style: "h1", text: `Progress update — ${item.period || "Update"}` },
    { style: "p", text: `Project: ${projectTitle}` },
    { style: "h2", text: "What changed" },
    { style: "p", text: line(item.changes || "") },
    { style: "h2", text: "Evidence" },
    { style: "p", text: line(item.evidence || "") },
    { style: "h2", text: "Blockers" },
    { style: "p", text: line(item.blockers || "") },
    { style: "h2", text: "Next milestone" },
    { style: "p", text: line(item.nextStep || "") },
    { style: "h2", text: "Action TRI AI needs to take" },
    { style: "p", text: line(item.triAction || "") },
  ];
}

export function resourceBlocks(projectTitle: string, item: Omit<ResourceRecord, "id">): DocBlock[] {
  const type = named(RESOURCE_TYPES, item.type);
  return [
    { style: "h1", text: `Resource request — ${type}` },
    { style: "p", text: `Project: ${projectTitle}` },
    { style: "p", text: `Type: ${type}` },
    { style: "p", text: `Status: ${named([["requested", "Requested"], ["approved", "Approved"], ["partial", "Partially approved"], ["declined", "Declined"]], item.status)}` },
    { style: "h2", text: "Request" },
    { style: "p", text: line(item.request || "") },
    { style: "h2", text: "Limits" },
    { style: "p", text: line(item.limits || "") },
  ];
}

function healthLabel(health?: string) {
  if (health === "amber") return "Amber";
  if (health === "red") return "Red";
  return "Green";
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    scoping: "Scoping",
    active: "Active",
    paused: "Paused",
    internal_review: "Internal review",
    completed: "Completed",
    discontinued: "Discontinued",
  };
  return labels[status || ""] || "Scoping";
}

export function overviewBlocks(input: {
  title: string;
  question?: string;
  contribution?: string;
  year?: string;
  health?: string;
  status?: string;
}): DocBlock[] {
  return [
    { style: "h1", text: "Project overview" },
    { style: "p", text: `Project: ${input.title}` },
    { style: "h2", text: "Research question" },
    { style: "p", text: line(input.question || "") },
    { style: "h2", text: "Contribution" },
    { style: "p", text: line(input.contribution || "") },
    { style: "h2", text: "Year" },
    { style: "p", text: line(input.year || "") },
    { style: "h2", text: "Project health" },
    { style: "p", text: healthLabel(input.health) },
    { style: "h2", text: "Status" },
    { style: "p", text: statusLabel(input.status) },
  ];
}

export function scopingNotesBlocks(input: { title: string; summary?: string; question?: string; timeline?: string }): DocBlock[] {
  return [
    { style: "h1", text: "Scoping notes" },
    { style: "p", text: `Project: ${input.title}` },
    { style: "h2", text: "What you want to study" },
    { style: "p", text: line(input.summary || "") },
    { style: "h2", text: "Research question" },
    { style: "p", text: line(input.question || "") },
    { style: "h2", text: "First timeline" },
    { style: "p", text: line(input.timeline || "") },
  ];
}

export function outputBlocks(projectTitle: string, item: Omit<OutputRecord, "id">): DocBlock[] {
  return [
    { style: "h1", text: `Output — ${item.title || "Output"}` },
    { style: "p", text: `Project: ${projectTitle}` },
    { style: "p", text: `Type: ${named(OUTPUT_TYPES, item.type)}` },
    { style: "p", text: `Status: ${named(OUTPUT_STATUSES, item.status)}` },
    { style: "p", text: `Venue: ${line(item.venue || "")}` },
    { style: "p", text: `Year: ${line(item.year || "")}` },
    { style: "p", text: `Link: ${line(item.link || "")}` },
    { style: "p", text: item.public ? "On the public research page." : "Not on the public research page." },
  ];
}

function markdownToBlocks(markdown: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  for (const raw of markdown.split(/\n+/)) {
    const lineText = raw.trim();
    if (!lineText) continue;
    if (lineText.startsWith("# ")) blocks.push({ style: "h1", text: lineText.slice(2).trim() });
    else if (lineText.startsWith("## ")) blocks.push({ style: "h2", text: lineText.slice(3).trim() });
    else blocks.push({ style: "p", text: lineText.replace(/^\*\*([^*]+):\*\*\s*/, "$1: ") });
  }
  return blocks.length > 0 ? blocks : [{ style: "p", text: "—" }];
}

async function driveToken(opts?: { interactive?: boolean }) {
  const interactive = opts?.interactive !== false;
  const auth = firebaseAuth();
  const current = auth?.currentUser;
  if (!auth || !current) return null;
  if (!current.providerData.some((item) => item.providerId === "google.com")) return null;
  const remembered = rememberedDriveToken(current.uid);
  if (remembered) return remembered;
  if (!interactive) return null;
  const provider = new GoogleAuthProvider();
  provider.addScope(DOCUMENTS);
  provider.addScope(DRIVE);
  provider.setCustomParameters({
    login_hint: current.email ?? "",
    include_granted_scopes: "true",
  });
  const result = await signInWithPopup(auth, provider);
  const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken ?? "";
  if (!token) return null;
  rememberDriveToken(current.uid, token);
  return token;
}

async function replaceGoogleDoc(token: string, fileId: string, blocks: DocBlock[]) {
  const loaded = await fetch(`https://docs.googleapis.com/v1/documents/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (loaded.status === 401) forgetDriveToken();
  if (!loaded.ok) throw new Error("Could not open the document.");
  const doc = (await loaded.json()) as { body?: { content?: { endIndex?: number }[] } };
  const content = doc.body?.content ?? [];
  const end = content.length > 0 ? Number(content[content.length - 1]?.endIndex ?? 1) : 1;
  let cursor = 1;
  const styles: { start: number; end: number; style: DocBlock["style"] }[] = [];
  const parts: string[] = [];
  for (const block of blocks) {
    const piece = `${block.text}\n`;
    styles.push({ start: cursor, end: cursor + piece.length, style: block.style });
    parts.push(piece);
    cursor += piece.length;
  }
  const requests: object[] = [];
  if (end > 2) {
    requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: end - 1 } } });
  }
  requests.push({ insertText: { location: { index: 1 }, text: parts.join("") } });
  for (const style of styles) {
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: style.start, endIndex: style.end },
        paragraphStyle: {
          namedStyleType: style.style === "h1" ? "HEADING_1" : style.style === "h2" ? "HEADING_2" : "NORMAL_TEXT",
        },
        fields: "namedStyleType",
      },
    });
  }
  const saved = await fetch(`https://docs.googleapis.com/v1/documents/${fileId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });
  if (!saved.ok) throw new Error("Could not update the document.");
}

async function syncLocalDocument(fileId: string, blocks: DocBlock[]) {
  let response: Response;
  try {
    response = await fetch(LOCAL_DRIVE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId, markdown: blocksToMarkdown(blocks) }),
    });
  } catch {
    throw new Error("Could not update the document.");
  }
  if (!response.ok) throw new Error("Could not update the document.");
}

function filedDocument(projectId: string, name: string) {
  return projectDrive(projectId)?.files.find((item) => item.kind === "document" && item.name === name);
}

async function ensureLocalDrive(body: Record<string, unknown>) {
  let response: Response;
  try {
    response = await fetch(LOCAL_ENSURE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not update the document.");
  }
  if (!response.ok) throw new Error("Could not update the document.");
  return (await response.json()) as {
    drive?: { id: string; name: string; url: string; files?: ProjectDriveFile[] };
  };
}

function driveApiMessage(detail: string, status: number) {
  try {
    const parsed = JSON.parse(detail) as { error?: { message?: string; status?: string } };
    const message = parsed.error?.message?.trim() ?? "";
    if (/has not been used in project|is disabled|API has not been used/i.test(message)) {
      return "Google Drive API is not enabled for this Firebase project.";
    }
    if (/File not found|not found/i.test(message) || status === 404) {
      return "Could not find the programme Drive folder. Check Editor access on that folder.";
    }
    if (/insufficient|permission|forbidden|ACCESS_TOKEN_SCOPE/i.test(message) || status === 403) {
      return "Google Drive did not allow that change. Check Editor access and Drive scopes.";
    }
  } catch {
    // Fall through to the generic line.
  }
  return "Could not update Google Drive.";
}

async function driveFetch(token: string, url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    if (response.status === 401) forgetDriveToken();
    const detail = await response.text().catch(() => "");
    throw new Error(driveApiMessage(detail, response.status));
  }
  if (response.status === 204) return null;
  return response.json();
}

const DRIVE_CREATE = `${DRIVE_API}/files?fields=id,name,webViewLink&supportsAllDrives=true`;
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOCUMENT_MIME = "application/vnd.google-apps.document";

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findDriveChild(token: string, parentId: string, name: string, mimeType: string) {
  const trimmed = name.trim();
  if (!parentId || !trimmed) return null;
  const q = [
    `'${escapeDriveQuery(parentId)}' in parents`,
    `name = '${escapeDriveQuery(trimmed)}'`,
    `mimeType = '${mimeType}'`,
    "trashed = false",
  ].join(" and ");
  const url =
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}` +
    "&fields=files(id,name,webViewLink)&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives";
  const result = (await driveFetch(token, url)) as { files?: { id: string; name: string; webViewLink?: string }[] };
  return result.files?.[0] ?? null;
}

async function createDriveFolder(token: string, name: string, parentId: string) {
  const created = (await driveFetch(token, DRIVE_CREATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: parentId ? [parentId] : undefined,
    }),
  })) as { id: string; name: string; webViewLink?: string };
  return {
    id: created.id,
    name: created.name || name,
    url: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
    kind: "folder" as const,
  };
}

async function ensureDriveFolder(token: string, name: string, parentId: string) {
  const existing = await findDriveChild(token, parentId, name, FOLDER_MIME);
  if (existing) {
    return {
      id: existing.id,
      name: existing.name || name,
      url: existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
      kind: "folder" as const,
    };
  }
  return createDriveFolder(token, name, parentId);
}

async function createDriveDocument(token: string, name: string, parentId: string, blocks: DocBlock[]) {
  const created = (await driveFetch(token, DRIVE_CREATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: DOCUMENT_MIME,
      parents: parentId ? [parentId] : undefined,
    }),
  })) as { id: string; name: string; webViewLink?: string };
  await replaceGoogleDoc(token, created.id, blocks);
  return {
    id: created.id,
    name: created.name || name,
    url: created.webViewLink || `https://docs.google.com/document/d/${created.id}/edit`,
    kind: "document" as const,
  };
}

async function ensureDriveDocument(token: string, name: string, parentId: string, blocks: DocBlock[]) {
  const existing = await findDriveChild(token, parentId, name, DOCUMENT_MIME);
  if (existing) {
    return {
      id: existing.id,
      name: existing.name || name,
      url: existing.webViewLink || `https://docs.google.com/document/d/${existing.id}/edit`,
      kind: "document" as const,
    };
  }
  return createDriveDocument(token, name, parentId, blocks);
}

async function ensureCloudDrive(input: {
  title: string;
  folderId: string;
  parentId: string;
  people: { name: string }[];
  documents: { name: string; markdown: string }[];
}) {
  const token = await driveToken();
  if (!token) return null;
  const createdFiles: ProjectDriveFile[] = [];
  let folderId = input.folderId;
  let folderName = input.title;
  let folderUrl = folderId ? `https://drive.google.com/drive/folders/${folderId}` : "";
  if (!folderId) {
    const folder = await ensureDriveFolder(token, input.title, input.parentId);
    folderId = folder.id;
    folderName = folder.name;
    folderUrl = folder.url;
  }
  for (const person of input.people) {
    if (!person.name.trim()) continue;
    createdFiles.push(await ensureDriveFolder(token, person.name, folderId));
  }
  for (const document of input.documents) {
    if (!document.name.trim()) continue;
    createdFiles.push(
      await ensureDriveDocument(token, document.name, folderId, markdownToBlocks(document.markdown || "")),
    );
  }
  return {
    id: folderId,
    name: folderName,
    url: folderUrl || `https://drive.google.com/drive/folders/${folderId}`,
    files: createdFiles,
  };
}

async function ensureDrive(body: {
  projectId: string;
  title: string;
  folderId: string;
  parentId: string;
  people: { name: string }[];
  documents: { name: string; markdown: string }[];
}) {
  if (import.meta.env.DEV) {
    try {
      const local = await ensureLocalDrive(body);
      if (local.drive?.id) return local.drive;
    } catch {
      // Fall through to the signed-in Google account on Pages and when local sync is down.
    }
  }
  return ensureCloudDrive(body);
}

async function readLocalDocument(fileId: string) {
  let response: Response;
  try {
    response = await fetch(LOCAL_READ, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const body = (await response.json()) as { markdown?: string };
  return typeof body.markdown === "string" ? body.markdown : null;
}

type GoogleDocBody = {
  body?: {
    content?: {
      paragraph?: {
        paragraphStyle?: { namedStyleType?: string };
        elements?: { textRun?: { content?: string } }[];
      };
    }[];
  };
};

/** Turn Docs heading styles into the markdown the charter parser already understands. */
export function googleDocToMarkdown(doc: GoogleDocBody) {
  const lines: string[] = [];
  for (const block of doc.body?.content ?? []) {
    const paragraph = block.paragraph;
    if (!paragraph) continue;
    const text = (paragraph.elements ?? [])
      .map((item) => item.textRun?.content ?? "")
      .join("")
      .replace(/\n+$/g, "")
      .trim();
    if (!text) continue;
    const style = paragraph.paragraphStyle?.namedStyleType ?? "";
    if (style === "TITLE" || style === "HEADING_1") lines.push(`# ${text}`);
    else if (style.startsWith("HEADING_")) lines.push(`## ${text}`);
    else lines.push(text);
  }
  return lines.join("\n");
}

async function readGoogleDocMarkdown(token: string, fileId: string) {
  const structured = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(fileId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (structured.status === 401) forgetDriveToken();
  if (structured.ok) {
    const markdown = googleDocToMarkdown((await structured.json()) as GoogleDocBody);
    if (markdown.trim()) return markdown;
  }
  const response = await fetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent("text/plain")}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(driveApiMessage(await response.text().catch(() => ""), response.status));
  return response.text();
}

export async function readFiledDocumentMarkdown(
  projectId: string,
  name: string,
  opts?: { interactive?: boolean },
) {
  const file = filedDocument(projectId, name);
  if (!file) return null;
  if (import.meta.env.DEV) {
    const local = await readLocalDocument(file.id);
    if (local != null) return local;
  }
  const token = await driveToken({ interactive: opts?.interactive === true });
  if (!token) return null;
  return readGoogleDocMarkdown(token, file.id);
}

export async function updateFiledDocument(
  projectId: string,
  name: string,
  blocks: DocBlock[],
  opts?: { interactive?: boolean },
) {
  const interactive = opts?.interactive !== false;
  let file = filedDocument(projectId, name);
  if (!file) {
    const drive = projectDrive(projectId);
    const created = await ensureDrive({
      projectId,
      title: drive?.name || "Project",
      folderId: drive?.id || "",
      parentId: PROGRAMME_RETURNS_FOLDER_ID,
      people: [],
      documents: [{ name, markdown: blocksToMarkdown(blocks) }],
    });
    if (created?.id) {
      rememberProjectFolder(projectId, created, created.files ?? []);
    }
    file = filedDocument(projectId, name);
    if (file) return "updated" as const;
    return "skipped" as const;
  }
  if (import.meta.env.DEV) {
    try {
      await syncLocalDocument(file.id, blocks);
      return "updated" as const;
    } catch {
      // Fall through to the Docs API with the signed-in Google account.
    }
  }
  const token = await driveToken({ interactive });
  if (!token) return "skipped" as const;
  await replaceGoogleDoc(token, file.id, blocks);
  return "updated" as const;
}

/** Push the app charter form into the Project Charter Google Doc. */
export async function syncCharterToDrive(
  projectId: string,
  projectTitle: string,
  charter: CharterRecord,
  signed: boolean,
  opts?: { interactive?: boolean },
) {
  return updateFiledDocument(
    projectId,
    "Project Charter",
    charterBlocks(projectTitle, charter, signed),
    opts,
  );
}

export type OverviewDocFields = {
  question?: string;
  contribution?: string;
  year?: string;
};

const OVERVIEW_HEADINGS: Record<string, keyof OverviewDocFields> = {
  "research question": "question",
  contribution: "contribution",
  year: "year",
};

/** Read Research question, Contribution, and Year from a Project overview Google Doc. */
export function parseOverviewMarkdown(markdown: string): OverviewDocFields {
  const next: OverviewDocFields = {};
  let key: keyof OverviewDocFields | null = null;
  const buckets: Partial<Record<keyof OverviewDocFields, string[]>> = {};
  for (const raw of markdown.split(/\n/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const markdownHeading = /^#{1,3}\s+(.+)$/.exec(trimmed);
    if (markdownHeading) {
      key = OVERVIEW_HEADINGS[markdownHeading[1].trim().toLowerCase()] ?? null;
      continue;
    }
    const bareHeading = OVERVIEW_HEADINGS[trimmed.toLowerCase()];
    if (bareHeading) {
      key = bareHeading;
      continue;
    }
    if (["project health", "status", "project overview"].includes(trimmed.toLowerCase())) {
      key = null;
      continue;
    }
    if (!key) continue;
    const text = trimmed.replace(/^\*\*[^*]+:\*\*\s*/, "");
    if (!text || text === "—" || /^#\s/.test(text) || text.startsWith("Project:")) continue;
    (buckets[key] ??= []).push(text);
  }
  for (const field of Object.keys(OVERVIEW_HEADINGS) as (keyof typeof OVERVIEW_HEADINGS)[]) {
    const target = OVERVIEW_HEADINGS[field];
    const parts = buckets[target];
    if (parts?.length) next[target] = parts.join("\n");
  }
  return next;
}

/** Read the Project Charter Google Doc into the form. Does not write the doc. */
export async function pullCharterFromDrive(input: {
  projectId: string;
  charter: CharterRecord;
  interactive?: boolean;
}): Promise<{ charter: CharterRecord; pulled: boolean }> {
  const interactive = input.interactive === true;
  try {
    const markdown = await readFiledDocumentMarkdown(input.projectId, "Project Charter", { interactive });
    if (markdown == null) return { charter: input.charter, pulled: false };
    const fromDoc = parseCharterMarkdown(markdown);
    if (!charterHasContent(fromDoc)) return { charter: input.charter, pulled: false };
    const merged = mergeCharterFromDoc(input.charter, fromDoc);
    return { charter: merged, pulled: !chartersEqual(merged, input.charter) };
  } catch {
    return { charter: input.charter, pulled: false };
  }
}

/** Read the Project overview Google Doc. Does not write the doc. */
export async function pullOverviewFromDrive(
  projectId: string,
  opts?: { interactive?: boolean },
): Promise<OverviewDocFields | null> {
  try {
    const markdown = await readFiledDocumentMarkdown(projectId, "Project overview", {
      interactive: opts?.interactive === true,
    });
    if (markdown == null) return null;
    const fields = parseOverviewMarkdown(markdown);
    return fields.question || fields.contribution || fields.year ? fields : null;
  } catch {
    return null;
  }
}

/**
 * Keep the charter form and Drive doc aligned.
 * Pulls from Drive when readable, merges into the form, then writes the form back to Drive.
 */
export async function syncCharterWithDrive(input: {
  projectId: string;
  projectTitle: string;
  charter: CharterRecord;
  signed: boolean;
  interactive?: boolean;
}): Promise<{ charter: CharterRecord; pulled: boolean; pushed: "updated" | "skipped" }> {
  const interactive = input.interactive === true;
  let charter = input.charter;
  let pulled = false;
  try {
    const markdown = await readFiledDocumentMarkdown(input.projectId, "Project Charter", { interactive });
    if (markdown != null) {
      const fromDoc = parseCharterMarkdown(markdown);
      if (charterHasContent(fromDoc)) {
        const merged = mergeCharterFromDoc(charter, fromDoc);
        if (!chartersEqual(merged, charter)) {
          charter = merged;
          pulled = true;
        }
      }
    }
  } catch {
    // Keep the form copy if the doc cannot be read.
  }
  const pushed = await syncCharterToDrive(
    input.projectId,
    input.projectTitle,
    charter,
    input.signed,
    { interactive },
  );
  return { charter, pulled, pushed };
}

export async function ensureProjectDrive(input: {
  projectId: string;
  title: string;
  people: { name: string; role: "Researcher" | "Senior Researcher" }[];
  documents: { name: string; markdown: string }[];
}) {
  const drive = projectDrive(input.projectId);
  const names = new Set(drive?.files.map((file) => file.name) ?? []);
  const people = input.people.filter((person) => person.name.trim() && !names.has(personFolderName(person.name, person.role)));
  const documents = input.documents.filter((item) => item.name && !names.has(item.name));
  if (drive && people.length === 0 && documents.length === 0) return drive;
  const created = await ensureDrive({
    projectId: input.projectId,
    title: input.title,
    folderId: drive?.id || "",
    parentId: PROGRAMME_RETURNS_FOLDER_ID,
    people: people.map((person) => ({ name: personFolderName(person.name, person.role) })),
    documents,
  });
  if (!created?.id) return drive;
  rememberProjectFolder(input.projectId, created, created.files ?? []);
  rememberDriveFiles(input.projectId, created.files ?? []);
  return projectDrive(input.projectId);
}

export type { ProjectDrive };
