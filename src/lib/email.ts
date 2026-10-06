import { fixturesEnabled } from "./firebase";
import { returnFoldersFor, type ReturnFolder } from "./returns";

export type EmailAddress = { name: string; email: string };

export type EmailAttachment = { filename: string; href: string };

export type EmailDraft = {
  to: EmailAddress[];
  cc: EmailAddress[];
  subject: string;
  body: string;
  attachments: EmailAttachment[];
};

const signOff = "TRI AI Research & Innovation Unit";

const base = import.meta.env.BASE_URL;

export const programmeDocuments = {
  proposal: {
    filename: "TRI AI Research Proposal Template.docx",
    href: `${base}documents/proposal-template.docx`,
  },
  progress: {
    filename: "Research Project Progress Update Template.docx",
    href: `${base}documents/progress-update.docx`,
  },
};

function projectCharterLink(projectId: string) {
  const hash = `/dashboard/projects/${projectId}`;
  if (typeof window === "undefined") return hash;
  const url = new URL(window.location.href);
  url.hash = hash;
  url.search = "";
  return url.toString();
}

export function programmeInbox(): EmailAddress {
  return {
    name: "TRI AI",
    email: fixturesEnabled ? "tri.admin@example.com" : "",
  };
}

export function named(name: string, email = ""): EmailAddress {
  return { name, email };
}

function hello(people: EmailAddress[]) {
  const names = people.map((person) => person.name).filter(Boolean);
  if (names.length === 0) return "Hello,";
  if (names.length === 1) return `Hello ${names[0]},`;
  if (names.length === 2) return `Hello ${names[0]} and ${names[1]},`;
  return `Hello ${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]},`;
}

function letter(lines: string[], from = signOff) {
  return [...lines.filter((line) => line !== ""), "", from].join("\n\n");
}

function uploadBlock(folders: ReturnFolder[], lead: string) {
  if (folders.length === 0) return "";
  return [lead, ...folders.map((folder) => `${folder.name}: ${folder.url}`)].join("\n");
}

function researchers(folders: ReturnFolder[]) {
  return folders.filter((folder) => folder.role === "Researcher");
}

export function proposalReceivedEmail(input: { title: string; researcher: EmailAddress }): EmailDraft {
  return {
    to: [input.researcher],
    cc: [],
    subject: `TRI AI Research Proposal Received — ${input.title}`,
    attachments: [],
    body: letter([
      hello([input.researcher]),
      `We have received your proposal, “${input.title}.”`,
      "The TRI AI team will review it for research quality, feasibility, relevance, and mentorship needs. We will contact you after the review with one of the following outcomes: approved for matching, revision requested, held for future matching, or declined.",
      "Thank you for your submission.",
    ]),
  };
}

export function approvedForMatchingEmail(input: { title: string; researcher: EmailAddress }): EmailDraft {
  return {
    to: [input.researcher],
    cc: [],
    subject: "Your TRI AI Proposal Has Advanced to Senior Researcher Matching",
    attachments: [],
    body: letter([
      hello([input.researcher]),
      `Your proposal, “${input.title},” has passed TRI AI’s initial review and will proceed to Senior Researcher matching.`,
      "We will look for a Senior Researcher whose expertise fits the project, and we will write when there is news.",
    ]),
  };
}

export function revisionEmail(input: {
  title: string;
  researcher: EmailAddress;
  points: string[];
  recordId: string;
}): EmailDraft {
  const points = input.points.filter(Boolean);
  const listed = (points.length > 0 ? points : ["The notes recorded on the proposal review."])
    .map((point) => `• ${point}`)
    .join("\n");
  const folder = researchers(returnFoldersFor(input.recordId)).find((item) => item.uid === "" || item.email === input.researcher.email)
    ?? researchers(returnFoldersFor(input.recordId))[0];
  return {
    to: [input.researcher],
    cc: [],
    subject: "Revision Requested — TRI AI Research Proposal",
    attachments: [programmeDocuments.proposal],
    body: letter([
      hello([input.researcher]),
      `Thank you for submitting “${input.title}.” We believe the proposal has potential, but it needs refinement before Senior Researcher matching.`,
      "Please address the following points:",
      listed,
      "The proposal template is attached. Focus on the requested changes rather than rewriting sections that are already clear.",
      "Proposal template: https://docs.google.com/document/d/17FIp9-4kQqEXWLlX1YSzjJA9lzB--0iU/edit",
      uploadBlock(folder ? [folder] : [], "Upload the revised proposal to your private folder:"),
    ]),
  };
}

export function heldForMatchingEmail(input: { title: string; researcher: EmailAddress }): EmailDraft {
  return {
    to: [input.researcher],
    cc: [],
    subject: "TRI AI Proposal Update — No Current Senior Researcher Match",
    attachments: [],
    body: letter([
      hello([input.researcher]),
      `Your proposal, “${input.title},” is waiting for a Senior Researcher.`,
      "We will write when one is available.",
    ]),
  };
}

export function declinedProposalEmail(input: { title: string; researcher: EmailAddress; reason: string }): EmailDraft {
  return {
    to: [input.researcher],
    cc: [],
    subject: `TRI AI Research Proposal Decision — ${input.title}`,
    attachments: [],
    body: letter([
      hello([input.researcher]),
      `Thank you for submitting “${input.title}.” After review, we will not be advancing the proposal in its current form.`,
      `Primary reason: ${input.reason || "The review note on the proposal."}`,
      "Where useful, we encourage you to refine the research question, methodology, evidence of research gap, or feasibility and consider a future call.",
      "Thank you for the work you put into the proposal.",
    ]),
  };
}

export function furtherScopingEmail(input: { title: string; researcher: EmailAddress; link: string }): EmailDraft {
  return {
    to: [input.researcher],
    cc: [],
    subject: `Further scoping needed — ${input.title}`,
    attachments: [],
    body: letter([
      hello([input.researcher]),
      `“${input.title}” needs a clearer research question and research plan.`,
      input.link ? `Scoping notes: ${input.link}` : "",
    ]),
  };
}

export function matchRequestEmail(input: {
  title: string;
  senior: EmailAddress;
  researcherName: string;
  area: string;
  question: string;
  timeline: string;
  need: string;
  note: string;
}): EmailDraft {
  return {
    to: [input.senior],
    cc: [],
    subject: `TRI AI Senior Researcher Opportunity — ${input.title}`,
    attachments: [],
    body: letter([
      hello([input.senior]),
      `We have approved a research proposal that appears aligned with your interests in ${input.area || "the research area on the proposal"}.`,
      [
        `Project: ${input.title}`,
        `Researcher: ${input.researcherName || "The researcher on the proposal"}`,
        `Research question: ${input.question || "See the proposal summary."}`,
        `Expected duration: ${input.timeline || "The timeline on the proposal"}`,
        `Primary Senior Researcher need: ${input.need || "The expertise noted on the proposal"}`,
      ].join("\n"),
      input.note ? `Note: ${input.note}` : "",
      "Reply Interested, Interested with questions, or Not available.",
    ]),
  };
}

export function introductionEmail(input: {
  title: string;
  parties: EmailAddress[];
  projectId: string;
  scoping: string;
}): EmailDraft {
  return {
    to: input.parties,
    cc: [],
    subject: `TRI AI Research Project Introduction — ${input.title}`,
    attachments: [],
    body: letter([
      hello(input.parties),
      `We are pleased to connect you regarding “${input.title}.” Both sides have indicated interest in exploring the project.`,
      "The next step is a short scoping discussion, then the Project Charter.",
      `Project Charter: ${projectCharterLink(input.projectId)}`,
      input.scoping ? `Scoping details: ${input.scoping}` : "",
      "TRI AI will stay involved for coordination.",
    ]),
  };
}

export function activationEmail(input: { title: string; parties: EmailAddress[]; recordId: string }): EmailDraft {
  const folders = researchers(returnFoldersFor(input.recordId));
  return {
    to: input.parties,
    cc: [],
    subject: `TRI AI Research Project Activated — ${input.title}`,
    attachments: [programmeDocuments.progress],
    body: letter([
      hello(input.parties),
      `“${input.title}” is now formally active.`,
      "The progress update template is attached. Please use the agreed project channels and flag material blockers early.",
      "Progress update template: https://docs.google.com/document/d/1_oV2XEpsJfdb2_AyLwlogAjEeFmqbxxL/edit",
      uploadBlock(folders, "Upload each completed progress update to the Researcher’s private folder:"),
    ]),
  };
}

export function charterRequestEmail(input: { title: string; parties: EmailAddress[]; projectId: string }): EmailDraft {
  return introductionEmail({ ...input, scoping: "" });
}

export function seniorWelcomeEmail(input: { senior: EmailAddress; areas: string }): EmailDraft {
  return {
    to: [input.senior],
    cc: [],
    subject: "Welcome to the TRI AI Senior Researcher Pool",
    attachments: [],
    body: letter([
      hello([input.senior]),
      "We are pleased to welcome you to the TRI AI Senior Researcher pool.",
      `We have your interests in ${input.areas || "the areas on your profile"}. We may send a short project summary when a proposal fits. You can accept, ask for more information, or decline.`,
      "Thank you for contributing your expertise to the programme.",
    ]),
  };
}

export function projectJoinEmail(input: {
  title: string;
  person: EmailAddress;
  role: "researcher" | "senior_researcher";
  link: string;
  award: boolean;
  page?: string;
}): EmailDraft {
  const senior = input.role === "senior_researcher";
  const place = senior ? "a Senior Researcher" : "a Researcher";
  return {
    to: [input.person],
    cc: [],
    subject: input.award ? `TRI AI Saturdays Award — ${input.title}` : `Join ${input.title}`,
    attachments: [],
    body: letter([
      hello([input.person]),
      input.award
        ? `You are invited to join “${input.title}” as ${place} on a TRI AI Saturdays Award.`
        : `You are invited to join “${input.title}” as ${place}.`,
      input.page ? `TRI AI Saturdays Award page: ${input.page}` : "",
      "Create an account, then join.",
      input.link,
    ]),
  };
}

export function awardWelcomeEmail(input: { title: string; researchers: EmailAddress[]; link: string }): EmailDraft {
  return {
    to: input.researchers,
    cc: [],
    subject: `TRI AI Saturdays Award — ${input.title}`,
    attachments: [],
    body: letter([
      hello(input.researchers),
      "Welcome.",
      `A Senior Researcher is ready to work with you on “${input.title}.” Write the scoping notes with TRI AI.`,
      input.link ? `Next step: ${input.link}` : "",
    ]),
  };
}

export function meetingEmail(input: {
  title: string;
  when: string;
  attendees: EmailAddress[];
  scoping: boolean;
  from?: EmailAddress;
}): EmailDraft {
  const mine = input.from?.name?.trim();
  return {
    to: input.attendees,
    cc: [],
    subject: `TRI AI ${input.scoping ? "scoping meeting" : "project meeting"} — ${input.title}`,
    attachments: [],
    body: letter(
      [
        hello(input.attendees),
        mine
          ? `I have set ${input.title} for ${input.when}.`
          : `${input.title} is scheduled for ${input.when}.`,
        mine ? "Please tell me if you can attend." : "Please confirm whether you can attend.",
      ],
      mine || signOff,
    ),
  };
}

export function meetingReplyEmail(input: {
  title: string;
  person: EmailAddress;
  attending: boolean;
  response?: string;
  note: string;
  attendees: EmailAddress[];
}): EmailDraft {
  const name = input.person.name?.trim() || "Me";
  const line =
    input.attending || input.response === "attending"
      ? `I can attend ${input.title}.`
      : input.response === "not_attending"
        ? `I can’t attend ${input.title}.`
        : `I need another time for ${input.title}.`;
  return {
    to: input.attendees,
    cc: [],
    subject: `TRI AI meeting reply — ${input.title}`,
    attachments: [],
    body: letter([hello(input.attendees), line, input.note], name),
  };
}

export function matchResponseEmail(input: {
  title: string;
  senior: EmailAddress;
  response: string;
  note: string;
}): EmailDraft {
  const name = input.senior.name?.trim() || "Me";
  const line =
    input.response === "interested_with_questions"
      ? `I am interested in “${input.title},” and I have a question.`
      : input.response === "interested"
        ? `I am interested in “${input.title}.”`
        : `I am not available for “${input.title}.”`;
  return {
    to: [programmeInbox()],
    cc: [],
    subject: `TRI AI Senior Researcher response — ${input.title}`,
    attachments: [],
    body: letter(["Hello,", line, input.note], name),
  };
}

export function proposalSubmittedEmail(input: { title: string; researcher: EmailAddress }): EmailDraft {
  return {
    to: [programmeInbox()],
    cc: [],
    subject: `TRI AI research proposal submitted — ${input.title}`,
    attachments: [],
    body: letter(
      ["Hello,", `I have submitted “${input.title}” for review.`, "Please review it."],
      input.researcher.name?.trim() || "Researcher",
    ),
  };
}

export function seniorAppliedEmail(input: { senior: EmailAddress; areas: string }): EmailDraft {
  return {
    to: [programmeInbox()],
    cc: [],
    subject: "TRI AI Senior Researcher application",
    attachments: [],
    body: letter(
      [
        "Hello,",
        "I would like to join the Senior Researcher pool.",
        input.areas ? `My interests are ${input.areas}.` : "",
        "Please let me know when I am in the pool.",
      ],
      input.senior.name?.trim() || "Senior Researcher",
    ),
  };
}

export function reviewAssignedEmail(input: { title: string; reviewer: EmailAddress; link: string }): EmailDraft {
  return {
    to: [input.reviewer],
    cc: [],
    subject: `TRI AI review assigned — ${input.title}`,
    attachments: [],
    body: letter([
      hello([input.reviewer]),
      `“${input.title}” is open for your review.`,
      "Score it and record a decision.",
      input.link ? `Review: ${input.link}` : "",
    ]),
  };
}

export function returnedDocumentEmail(input: {
  title: string;
  person: EmailAddress;
  recordId: string;
  documentName: string;
}): EmailDraft {
  const folder = returnFoldersFor(input.recordId).find((item) => item.email === input.person.email);
  return {
    to: [programmeInbox()],
    cc: [],
    subject: `${input.documentName} returned — ${input.title}`,
    attachments: [],
    body: letter(
      [
        "Hello,",
        `I have uploaded the ${input.documentName} for “${input.title}.”`,
        uploadBlock(folder ? [folder] : [], "My folder:"),
        "Please record it.",
      ],
      input.person.name?.trim() || "Me",
    ),
  };
}

export function revisedProposalEmail(input: { title: string; researcher: EmailAddress; recordId: string }): EmailDraft {
  const folder = researchers(returnFoldersFor(input.recordId)).find((item) => item.email === input.researcher.email)
    ?? researchers(returnFoldersFor(input.recordId))[0];
  return {
    to: [programmeInbox()],
    cc: [],
    subject: `Revised TRI AI proposal — ${input.title}`,
    attachments: [],
    body: letter(
      [
        "Hello,",
        `I have uploaded the revised proposal for “${input.title}.”`,
        uploadBlock(folder ? [folder] : [], "My folder:"),
        "Please review it.",
      ],
      input.researcher.name?.trim() || "Researcher",
    ),
  };
}

function formatAddress(person: EmailAddress) {
  if (!person.email) return "";
  return person.name ? `${person.name} <${person.email}>` : person.email;
}

function headerList(people: EmailAddress[]) {
  return people.map(formatAddress).filter(Boolean).join(", ");
}

function mailtoUrl(draft: EmailDraft) {
  const to = draft.to.map((person) => person.email).filter(Boolean).join(",");
  const params = [
    ["cc", draft.cc.map((person) => person.email).filter(Boolean).join(",")],
    ["subject", draft.subject],
    ["body", draft.body],
  ].filter(([, value]) => value);
  const query = params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
  return `mailto:${to}?${query}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function wrap(value: string) {
  return value.replace(/(.{76})/g, "$1\r\n");
}

async function attachmentPart(file: EmailAttachment, boundary: string) {
  const response = await fetch(file.href);
  const type = response.headers.get("content-type") || "";
  if (!response.ok || type.includes("text/html")) throw new Error(`Could not attach ${file.filename}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return [
    `--${boundary}`,
    "Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    `Content-Disposition: attachment; filename="${file.filename}"`,
    "Content-Transfer-Encoding: base64",
    "",
    wrap(bytesToBase64(bytes)),
  ].join("\r\n");
}

async function downloadEml(draft: EmailDraft) {
  const boundary = `tri-ai-${crypto.randomUUID()}`;
  const parts = [
    "X-Unsent: 1",
    `To: ${headerList(draft.to)}`,
    headerList(draft.cc) ? `Cc: ${headerList(draft.cc)}` : "",
    `Subject: ${draft.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    draft.body,
    "",
  ];
  for (const file of draft.attachments) parts.push(await attachmentPart(file, boundary), "");
  parts.push(`--${boundary}--`, "");
  const blob = new Blob([parts.filter((part) => part !== "").join("\r\n")], { type: "message/rfc822" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${draft.subject.replace(/[^\w]+/g, " ").trim().slice(0, 80) || "email"}.eml`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function openLocalEmail(draft: EmailDraft) {
  if (draft.attachments.length > 0) {
    try {
      await downloadEml(draft);
      return "attachment";
    } catch {
      window.location.href = mailtoUrl(draft);
      return "mailto";
    }
  }
  const mailto = mailtoUrl(draft);
  if (mailto.length > 1800) {
    await downloadEml(draft);
    return "attachment";
  }
  window.location.href = mailto;
  return "mailto";
}
