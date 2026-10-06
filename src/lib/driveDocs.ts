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

let cached: { token: string; until: number } | null = null;

function named(pairs: readonly (readonly [string, string])[], value?: string) {
  return pairs.find(([item]) => item === value)?.[1] || value || "—";
}

function line(text: string) {
  const trimmed = text.trim();
  return trimmed || "—";
}

export function charterBlocks(projectTitle: string, charter: CharterRecord, signed: boolean): DocBlock[] {
  const blocks: DocBlock[] = [
    { style: "h1", text: "Project Charter" },
    { style: "p", text: `Project: ${projectTitle}` },
  ];
  if (signed) blocks.push({ style: "p", text: "Signed." });
  const fields: [string, string][] = [
    ["Scope", charter.scope],
    ["Roles", charter.roles],
    ["Cadence", charter.cadence],
    ["Resources", charter.resources],
    ["Integrity and risk", charter.integrity],
    ["Authorship and IP", charter.authorship],
    ["Release expectations", charter.release],
  ];
  for (const [label, value] of fields) {
    blocks.push({ style: "h2", text: label });
    blocks.push({ style: "p", text: line(value) });
  }
  return blocks;
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

async function documentsToken() {
  const auth = firebaseAuth();
  const current = auth?.currentUser;
  if (!auth || !current) return null;
  if (!current.providerData.some((item) => item.providerId === "google.com")) return null;
  if (cached && cached.until > Date.now()) return cached.token;
  const provider = new GoogleAuthProvider();
  provider.addScope(DOCUMENTS);
  provider.setCustomParameters({
    login_hint: current.email ?? "",
    prompt: "consent",
  });
  const result = await signInWithPopup(auth, provider);
  const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken ?? "";
  if (!token) return null;
  cached = { token, until: Date.now() + 45 * 60 * 1000 };
  return token;
}

async function replaceGoogleDoc(token: string, fileId: string, blocks: DocBlock[]) {
  const loaded = await fetch(`https://docs.googleapis.com/v1/documents/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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

export async function updateFiledDocument(projectId: string, name: string, blocks: DocBlock[]) {
  let file = filedDocument(projectId, name);
  if (!file && import.meta.env.DEV) {
    const drive = projectDrive(projectId);
    const created = await ensureLocalDrive({
      projectId,
      title: drive?.name || "Project",
      folderId: drive?.id || "",
      parentId: PROGRAMME_RETURNS_FOLDER_ID,
      documents: [{ name, markdown: blocksToMarkdown(blocks) }],
    });
    if (created.drive?.id) {
      rememberProjectFolder(projectId, created.drive, created.drive.files ?? []);
    }
    file = filedDocument(projectId, name);
    if (file) return "updated" as const;
  }
  if (!file) return "skipped" as const;
  if (import.meta.env.DEV) {
    await syncLocalDocument(file.id, blocks);
    return "updated" as const;
  }
  const token = await documentsToken();
  if (!token) return "skipped" as const;
  await replaceGoogleDoc(token, file.id, blocks);
  return "updated" as const;
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
  if (!import.meta.env.DEV) return drive;
  const created = await ensureLocalDrive({
    projectId: input.projectId,
    title: input.title,
    folderId: drive?.id || "",
    parentId: PROGRAMME_RETURNS_FOLDER_ID,
    people: people.map((person) => ({ name: personFolderName(person.name, person.role) })),
    documents,
  });
  if (!created.drive?.id) return drive;
  rememberProjectFolder(input.projectId, created.drive, created.drive.files ?? []);
  rememberDriveFiles(input.projectId, created.drive.files ?? []);
  return projectDrive(input.projectId);
}

export type { ProjectDrive };
