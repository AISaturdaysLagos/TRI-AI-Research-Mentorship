export type ProgrammeWork = {
  id: string;
  area: "Proposal" | "Researcher" | "Senior Researcher" | "Project";
  subject: string;
  step: string;
  title: string;
  detail: string;
  href: string;
  action: string;
  emailKey?: string;
};

type ProposalRow = { id: string; title?: string; status?: string; name?: string };
type Person = { name?: string };
type ProjectRow = {
  id: string;
  title?: string;
  status?: string;
  proposalId?: string;
  awardId?: string;
  scoped?: boolean;
  charterSigned?: boolean;
  researchers?: Person[];
  seniorResearchers?: Person[];
};
type MatchRow = {
  id: string;
  proposalId?: string;
  title?: string;
  mentorName?: string;
  response?: string;
  introduced?: boolean;
};
type SeniorRow = { id: string; name?: string; poolStatus?: string };
type MeetingRow = { kind?: string; status?: string; proposalId?: string; projectId?: string };
type InviteRow = { projectId?: string; role?: string; status?: string };
type ActivityRow = {
  projectId: string;
  milestones: { id: string; title?: string; ownerName?: string; due?: string; status?: string }[];
  updates: { id: string; period?: string; changes?: string; triAction?: string }[];
  resources: { id: string; type?: string; request?: string; status?: string }[];
  outputs: { id: string; title?: string; status?: string; public?: boolean }[];
};

const liveProject = new Set(["scoping", "active", "internal_review"]);
const resourceLabel: Record<string, string> = { compute: "Compute", data: "Data", software: "Software" };
const outputLabel: Record<string, string> = {
  planned: "Planned",
  drafting: "Drafting",
  internal_review: "Internal review",
  submitted: "Submitted",
  accepted: "Accepted",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

function clip(value: string) {
  const text = value.trim().replace(/\s+/g, " ");
  return text.length > 280 ? `${text.slice(0, 277)}…` : text;
}

const reviewStatuses = new Set(["received", "under_review"]);
const offerStatuses = new Set(["approved_for_matching", "ready_for_matching", "matching"]);

function titleOf(value: { title?: string } | undefined, fallback: string) {
  return value?.title?.trim() || fallback;
}

function hasProject(proposalId: string, projects: ProjectRow[]) {
  return projects.some((project) => project.id === proposalId || project.proposalId === proposalId);
}

function hasScopingMeeting(project: ProjectRow, meetings: MeetingRow[]) {
  return meetings.some(
    (meeting) =>
      meeting.kind === "scoping" &&
      meeting.status !== "cancelled" &&
      ((project.proposalId && meeting.proposalId === project.proposalId) || meeting.projectId === project.id),
  );
}

function openInvite(invites: InviteRow[], projectId: string, role: string) {
  return invites.some((invite) => invite.projectId === projectId && invite.role === role && invite.status === "open");
}

export function buildProgrammeTasks(input: {
  proposals: ProposalRow[];
  projects: ProjectRow[];
  matches: MatchRow[];
  seniors: SeniorRow[];
  meetings: MeetingRow[];
  invites: InviteRow[];
  activities: ActivityRow[];
  finishedEmailKeys: Set<string>;
}): ProgrammeWork[] {
  const tasks: ProgrammeWork[] = [];
  const seen = new Set<string>();
  const add = (task: ProgrammeWork) => {
    if (task.emailKey && input.finishedEmailKeys.has(task.emailKey)) return;
    if (seen.has(task.id)) return;
    seen.add(task.id);
    tasks.push(task);
  };

  for (const proposal of input.proposals) {
    if (hasProject(proposal.id, input.projects)) continue;
    const title = titleOf(proposal, "Untitled proposal");
    const researcher = proposal.name?.trim() || "the researcher";
    const status = proposal.status || "";
    if (reviewStatuses.has(status)) {
      add({
        id: `review:${proposal.id}`,
        area: "Proposal",
        subject: title,
        step: "Review the proposal",
        title: `Review ${title}`,
        detail: "Record the decision.",
        href: `/admin/proposals/${proposal.id}`,
        action: "Open the proposal",
      });
    }
    const proposalMatches = input.matches.filter((match) => match.proposalId === proposal.id);
    if (offerStatuses.has(status) && proposalMatches.length === 0) {
      add({
        id: `offer:${proposal.id}`,
        area: "Proposal",
        subject: title,
        step: "Send a Senior Researcher opportunity",
        title: `Send a Senior Researcher opportunity for ${title}`,
        detail: "Send the proposal to a Senior Researcher.",
        href: "/admin/matching",
        action: "Open matching",
      });
    }
    if (status === "revise") {
      add({
        id: `email:revise:${proposal.id}`,
        area: "Researcher",
        subject: title,
        step: "Send the revision request",
        title: `Send the revision request for ${title}`,
        detail: `Send ${researcher} the revision note and the proposal template.`,
        href: `/admin/proposals/${proposal.id}`,
        action: "Open the proposal",
        emailKey: `email:revise:${proposal.id}`,
      });
    }
    if (status === "declined") {
      add({
        id: `email:declined:${proposal.id}`,
        area: "Researcher",
        subject: title,
        step: "Send the decision",
        title: `Send the decision on ${title}`,
        detail: `Tell ${researcher} that the proposal was declined.`,
        href: `/admin/proposals/${proposal.id}`,
        action: "Open the proposal",
        emailKey: `email:declined:${proposal.id}`,
      });
    }
    if (status === "held_for_matching" || status === "no_current_match") {
      add({
        id: `email:held:${proposal.id}`,
        area: "Researcher",
        subject: title,
        step: "Send the held-for-matching note",
        title: `Send the held-for-matching note for ${title}`,
        detail: `Tell ${researcher} that matching is on hold.`,
        href: `/admin/proposals/${proposal.id}`,
        action: "Open the proposal",
        emailKey: `email:held:${proposal.id}`,
      });
    }
    if (status === "research_scoping") {
      add({
        id: `email:scoping-note:${proposal.id}`,
        area: "Researcher",
        subject: title,
        step: "Send the further scoping note",
        title: `Send the further scoping note for ${title}`,
        detail: "Send the scoping note.",
        href: `/admin/proposals/${proposal.id}`,
        action: "Open the proposal",
        emailKey: `email:scoping-note:${proposal.id}`,
      });
    }
    if (status === "approved_for_matching" || status === "ready_for_matching") {
      add({
        id: `email:approved:${proposal.id}`,
        area: "Researcher",
        subject: title,
        step: "Tell the researcher this can be matched",
        title: `Tell ${researcher} that ${title} can be matched`,
        detail: "Send the approval email to the researcher.",
        href: `/admin/proposals/${proposal.id}`,
        action: "Open the proposal",
        emailKey: `email:approved:${proposal.id}`,
      });
    }
  }

  for (const match of input.matches) {
    if (match.introduced) continue;
    const response = match.response || "pending";
    if (response === "pending") continue;
    const title = titleOf(match, "Untitled proposal");
    const senior = match.mentorName?.trim() || "A Senior Researcher";
    const interested = response === "interested" || response === "interested_with_questions";
    add({
      id: `match:${match.id}`,
      area: "Senior Researcher",
      subject: title,
      step: interested ? `Introduce ${senior}` : "Choose another Senior Researcher",
      title: interested ? `Introduce ${senior} on ${title}` : `Choose another Senior Researcher for ${title}`,
      detail: interested
        ? `${senior} is interested. Record the introduction and send the introduction email.`
        : `${senior} declined. The proposal can be offered to someone else.`,
      href: "/admin/matching",
      action: "Open matching",
    });
  }

  for (const senior of input.seniors) {
    const name = senior.name?.trim() || "A Senior Researcher";
    if (senior.poolStatus === "pending") {
      add({
        id: `pool:${senior.id}`,
        area: "Senior Researcher",
        subject: "Senior Researcher pool",
        step: `Confirm ${name} for the pool`,
        title: `Confirm ${name} for the Senior Researcher pool`,
        detail: "Confirm them for the pool.",
        href: "/admin/mentors",
        action: "Open Senior Researchers",
      });
    }
    if (senior.poolStatus === "in_pool") {
      add({
        id: `email:senior-welcome:${senior.id}`,
        area: "Senior Researcher",
        subject: "Senior Researcher pool",
        step: `Send the pool welcome to ${name}`,
        title: `Send the pool welcome to ${name}`,
        detail: "Send the Senior Researcher pool welcome email.",
        href: "/admin/mentors",
        action: "Open Senior Researchers",
        emailKey: `email:senior-welcome:${senior.id}`,
      });
    }
  }

  for (const project of input.projects) {
    const title = titleOf(project, "Untitled project");
    const researchers = project.researchers ?? [];
    const seniors = project.seniorResearchers ?? [];
    const scoping = project.status === "scoping";
    const introduced = input.matches.some((match) => match.proposalId === project.proposalId && match.introduced && match.mentorName);
    if (scoping && introduced && !hasScopingMeeting(project, input.meetings)) {
      add({
        id: `meeting:${project.id}`,
        area: "Project",
        subject: title,
        step: "Set a scoping meeting",
        title: `Set a scoping meeting for ${title}`,
        detail: "Set the time and send the meeting email.",
        href: "/admin/meetings",
        action: "Open scoping meetings",
      });
    }
    if (scoping && hasScopingMeeting(project, input.meetings) && !project.scoped) {
      add({
        id: `scoped:${project.id}`,
        area: "Project",
        subject: title,
        step: "Mark the project scoped",
        title: `Mark ${title} scoped`,
        detail: "Record the scoping meeting.",
        href: "/admin/projects",
        action: "Open projects",
      });
    }
    if (scoping && project.scoped && !project.charterSigned) {
      add({
        id: `charter:${project.id}`,
        area: "Project",
        subject: title,
        step: "Record the signed Project Charter",
        title: `Record the signed Project Charter for ${title}`,
        detail: "Record the signed Project Charter.",
        href: "/admin/projects",
        action: "Open projects",
      });
    }
    if (scoping && project.scoped && project.charterSigned) {
      add({
        id: `activate:${project.id}`,
        area: "Project",
        subject: title,
        step: "Make this an active project",
        title: `Make ${title} an active project`,
        detail: "Make the project active.",
        href: "/admin/projects",
        action: "Open projects",
      });
    }
    if (project.awardId && researchers.length === 0 && !openInvite(input.invites, project.id, "researcher")) {
      add({
        id: `award:${project.id}`,
        area: "Researcher",
        subject: title,
        step: "Invite researchers",
        title: `Invite researchers to ${title}`,
        detail: "Send the invite.",
        href: "/admin/projects",
        action: "Open projects",
      });
    }
    if (!project.awardId && researchers.length === 0 && (scoping || project.status === "active")) {
      add({
        id: `researchers:${project.id}`,
        area: "Researcher",
        subject: title,
        step: "Add the researchers",
        title: `Add the researchers on ${title}`,
        detail: "Add a researcher.",
        href: "/admin/projects",
        action: "Open projects",
      });
    }
    if (seniors.length === 0 && !openInvite(input.invites, project.id, "senior_researcher") && (scoping || project.status === "active")) {
      add({
        id: `seniors:${project.id}`,
        area: "Senior Researcher",
        subject: title,
        step: "Invite a Senior Researcher",
        title: `Invite a Senior Researcher to ${title}`,
        detail: "Send the invite.",
        href: "/admin/projects",
        action: "Open projects",
      });
    }
    if (project.status === "active") {
      add({
        id: `email:activation:${project.id}`,
        area: "Project",
        subject: title,
        step: "Send the activation email",
        title: `Send the activation email for ${title}`,
        detail: "Send the activation email and the progress update template.",
        href: "/admin/projects",
        action: "Open projects",
        emailKey: `email:activation:${project.id}`,
      });
    }
    if (!liveProject.has(project.status || "")) continue;
    const activity = input.activities.find((item) => item.projectId === project.id);
    if (!activity) continue;
    const projectHref = (panel: string) => `/dashboard/projects/${project.id}?panel=${panel}`;
    for (const item of activity.resources) {
      if (item.status !== "requested") continue;
      const kind = resourceLabel[item.type || ""] || "Resource";
      add({
        id: `resource:${project.id}:${item.id}`,
        area: "Project",
        subject: title,
        step: `Decide the ${kind} request`,
        title: `Decide the ${kind} request for ${title}`,
        detail: clip(item.request || "A resource request is waiting."),
        href: projectHref("resources"),
        action: "Open the request",
      });
    }
    for (const item of activity.milestones) {
      if (item.status === "done") continue;
      const name = item.title?.trim() || "Milestone";
      const due = item.due?.trim();
      const owner = item.ownerName?.trim();
      add({
        id: `milestone:${project.id}:${item.id}`,
        area: "Project",
        subject: title,
        step: name,
        title: `${name} on ${title}`,
        detail: clip([owner, due ? `due ${due}` : ""].filter(Boolean).join(" · ")),
        href: projectHref("milestones"),
        action: "Open the milestone",
      });
    }
    for (const item of activity.updates) {
      const period = item.period?.trim() || "Progress update";
      const action = item.triAction?.trim();
      add({
        id: `progress:${project.id}:${item.id}`,
        area: "Project",
        subject: title,
        step: `${period} update`,
        title: `${period} update for ${title}`,
        detail: clip(action || item.changes || "A progress update was added."),
        href: projectHref("progress"),
        action: "Open the update",
        emailKey: `progress:${project.id}:${item.id}`,
      });
    }
    for (const item of activity.outputs) {
      if (item.public) continue;
      const name = item.title?.trim() || "Output";
      add({
        id: `output:${project.id}:${item.id}`,
        area: "Project",
        subject: title,
        step: `Review ${name}`,
        title: `Review ${name} for ${title}`,
        detail: outputLabel[item.status || ""] || "Planned",
        href: projectHref("outputs"),
        action: "Open the output",
        emailKey: `output:${project.id}:${item.id}`,
      });
    }
  }

  const order = ["Proposal", "Researcher", "Senior Researcher", "Project"];
  return tasks.sort((a, b) => order.indexOf(a.area) - order.indexOf(b.area) || a.title.localeCompare(b.title));
}
