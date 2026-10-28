import { meetingDate, meetingHasHappened, type MeetingReply, type MeetingRow } from "./meetings";
import { formatZonedWhen, PROGRAMME_ZONE } from "./timezones";
import type { MilestoneRecord, WorkTask, WorkspaceProject } from "./workspace";

export type RoleTask = {
  id: string;
  area: "Proposal" | "Invite" | "Match request" | "Meeting" | "Project" | "Review";
  subject: string;
  step: string;
  detail: string;
  href: string;
  action: string;
};

type ProposalRow = { id: string; title?: string; status?: string };
type InviteRow = { id: string; projectTitle?: string; role?: string };
type MatchRow = { id: string; proposalId?: string; title?: string; response?: string; introduced?: boolean };
type ReviewRow = { id: string; proposalId?: string; decision?: string };

const LIVE = new Set(["scoping", "active", "internal_review"]);

function titleOf(value: { title?: string } | undefined, fallback: string) {
  return value?.title?.trim() || fallback;
}

function owns(ownerName: string | undefined, displayName: string) {
  const owner = ownerName?.trim().toLocaleLowerCase();
  const name = displayName.trim().toLocaleLowerCase();
  return Boolean(owner && name && owner === name);
}

function projectHref(projectId: string, panel: string) {
  return `/dashboard/projects/${projectId}?panel=${panel}`;
}

export function buildParticipantTasks(input: {
  role: "researcher" | "senior_researcher";
  displayName: string;
  proposals: ProposalRow[];
  invites: InviteRow[];
  matches: MatchRow[];
  meetings: MeetingRow[];
  replies: { meetingId: string; replies: MeetingReply[] }[];
  projects: WorkspaceProject[];
  milestones: { projectId: string; items: MilestoneRecord[] }[];
  work: { projectId: string; items: WorkTask[] }[];
  uid: string;
}): RoleTask[] {
  const tasks: RoleTask[] = [];
  const seen = new Set<string>();
  const add = (task: RoleTask) => {
    if (seen.has(task.id)) return;
    seen.add(task.id);
    tasks.push(task);
  };

  if (input.role === "researcher") {
    for (const proposal of input.proposals) {
      if (proposal.status !== "revise") continue;
      const title = titleOf(proposal, "Untitled proposal");
      add({
        id: `revise:${proposal.id}`,
        area: "Proposal",
        subject: title,
        step: "Revise the proposal",
        detail: "TRI AI asked for a revision. Update the proposal and submit it again.",
        href: `/dashboard/application?proposal=${proposal.id}`,
        action: "Revise the proposal",
      });
    }
  }

  for (const invite of input.invites) {
    const title = invite.projectTitle?.trim() || "Untitled project";
    const senior = invite.role === "senior_researcher";
    add({
      id: `invite:${invite.id}`,
      area: "Invite",
      subject: title,
      step: "Accept the invite",
      detail: senior
        ? "You are invited to join this project as a Senior Researcher."
        : "You are invited to join this project as a Researcher.",
      href: `/join/${invite.id}`,
      action: "Open the invite",
    });
  }

  if (input.role === "senior_researcher") {
    for (const match of input.matches) {
      if (match.introduced) continue;
      if ((match.response || "pending") !== "pending") continue;
      const title = titleOf(match, "Untitled proposal");
      add({
        id: `match:${match.id}`,
        area: "Match request",
        subject: title,
        step: "Respond to the match request",
        detail: "Say whether you will take this proposal on.",
        href: "/dashboard?tab=records",
        action: "Open match requests",
      });
    }
  }

  const replied = new Map(input.replies.map((item) => [item.meetingId, item.replies]));
  for (const meeting of input.meetings) {
    if (meeting.status === "cancelled" || meetingHasHappened(meeting)) continue;
    const mine = (replied.get(meeting.id) ?? []).find((reply) => reply.id === input.uid);
    if (mine?.response) continue;
    const when = meetingDate(meeting.startsAt);
    const title = meeting.title?.trim() || "Scoping meeting";
    add({
      id: `meeting:${meeting.id}`,
      area: "Meeting",
      subject: title,
      step: "Reply to the meeting",
      detail: when
        ? `Say whether you can attend on ${formatZonedWhen(when, PROGRAMME_ZONE)}.`
        : "Say whether you can attend.",
      href: "/dashboard/meetings",
      action: "Open scoping meetings",
    });
  }

  const milestones = new Map(input.milestones.map((item) => [item.projectId, item.items]));
  const work = new Map(input.work.map((item) => [item.projectId, item.items]));
  for (const project of input.projects) {
    if (!LIVE.has(project.status || "")) continue;
    const title = titleOf(project, "Untitled project");
    if (project.status === "scoping" && !project.charterSigned) {
      add({
        id: `charter:${project.id}`,
        area: "Project",
        subject: title,
        step: "Agree the Project Charter",
        detail: "Agree the charter with the project team. TRI AI records it once it is signed.",
        href: projectHref(project.id, "charter"),
        action: "Open the charter",
      });
    }
    if (project.status === "internal_review") {
      add({
        id: `review:${project.id}`,
        area: "Project",
        subject: title,
        step: "Read the internal review",
        detail: "Read the review note from TRI AI.",
        href: projectHref(project.id, "overview"),
        action: "Open the project",
      });
    }
    for (const item of milestones.get(project.id) ?? []) {
      if (item.status === "done" || !owns(item.ownerName, input.displayName)) continue;
      const name = item.title?.trim() || "Milestone";
      const due = item.due?.trim();
      add({
        id: `milestone:${project.id}:${item.id}`,
        area: "Project",
        subject: title,
        step: name,
        detail: due ? `Due ${due}.` : "This milestone is still open.",
        href: projectHref(project.id, "milestones"),
        action: "Open the milestone",
      });
    }
    for (const item of work.get(project.id) ?? []) {
      if (item.status === "done" || !owns(item.ownerName, input.displayName)) continue;
      const name = item.title?.trim() || "Task";
      const due = item.due?.trim();
      add({
        id: `work:${project.id}:${item.id}`,
        area: "Project",
        subject: title,
        step: name,
        detail: [item.status === "doing" ? "In progress." : "Still to do.", due ? `Due ${due}.` : ""].filter(Boolean).join(" "),
        href: projectHref(project.id, "work"),
        action: "Open the task",
      });
    }
  }

  const order = ["Proposal", "Invite", "Match request", "Meeting", "Project", "Review"];
  return tasks.sort((a, b) => order.indexOf(a.area) - order.indexOf(b.area) || a.subject.localeCompare(b.subject) || a.step.localeCompare(b.step));
}

export function buildReviewerTasks(reviews: ReviewRow[], proposals: ProposalRow[]): RoleTask[] {
  return reviews
    .filter((review) => !review.decision || review.decision === "under_review")
    .map((review) => {
      const proposalId = review.proposalId || review.id;
      const proposal = proposals.find((item) => item.id === proposalId);
      const title = titleOf(proposal, "Untitled proposal");
      return {
        id: `review:${proposalId}`,
        area: "Review" as const,
        subject: title,
        step: "Score the proposal",
        detail: "Score it and record a decision.",
        href: `/admin/proposals/${proposalId}`,
        action: "Open the review",
      };
    })
    .sort((a, b) => a.subject.localeCompare(b.subject));
}
