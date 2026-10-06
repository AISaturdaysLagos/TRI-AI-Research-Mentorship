import { meetingHasHappened } from "./meetings";
import { formatZonedWhen } from "./timezones";

export type AttentionNotice = {
  id: string;
  status: string;
  text: string;
  next: string;
  owner: string;
  href?: string;
  action?: string;
};

type ProposalSource = {
  id: string;
  title?: string;
  status?: string;
  route?: string;
  introduction?: string;
};

type MatchSource = {
  id: string;
  title?: string;
  mentorId?: string;
  mentorName?: string;
  response?: string;
  introduced?: boolean;
};

type ProjectSource = {
  id: string;
  title?: string;
  status?: string;
  scoped?: boolean;
  charterSigned?: boolean;
};

type SeniorSource = {
  id: string;
  name?: string;
  poolStatus?: string;
};

type ReviewSource = {
  id: string;
  proposalId?: string;
  decision?: string;
};

function proposalState(row: ProposalSource) {
  return row.introduction ? "introduction" : row.status || "received";
}

function researcherCopy(row: ProposalSource) {
  if (row.introduction) {
    return {
      status: "Introduction",
      text: row.introduction,
      next: "Join the scoping meeting when TRI AI confirms it.",
      owner: "TRI AI",
    };
  }
  if (row.status === "revise") {
    return {
      status: "Revision requested",
      text: "TRI AI has asked for a revision of this proposal.",
      next: "Update the proposal and submit it again.",
      owner: "You",
    };
  }
  if (row.status === "research_scoping") {
    return {
      status: "Research scoping",
      text: "This TRI AI Saturdays Award is in scoping.",
      next: "Complete the scoping notes on the award invite.",
      owner: "The award team",
    };
  }
  if (row.status === "matching") {
    return {
      status: "Matching",
      text: "TRI AI is looking for a Senior Researcher.",
      next: "Wait for an introduction or a status change.",
      owner: "TRI AI",
    };
  }
  if (row.status === "approved_for_matching" || row.status === "ready_for_matching") {
    return {
      status: "Ready for matching",
      text: "This proposal can be offered to Senior Researchers.",
      next: "TRI AI sends the opportunity to a Senior Researcher.",
      owner: "TRI AI",
    };
  }
  if (row.status === "no_current_match") {
    return {
      status: "No current match",
      text: "There is no Senior Researcher matched to this proposal right now.",
      next: "TRI AI may return to matching later.",
      owner: "TRI AI",
    };
  }
  if (row.status === "declined") {
    return {
      status: "Declined",
      text: "TRI AI has declined this proposal.",
      next: "",
      owner: "TRI AI",
    };
  }
  if (row.status === "under_review") {
    return {
      status: "Under review",
      text: "TRI AI is reviewing this proposal.",
      next: "Wait for a decision.",
      owner: "TRI AI",
    };
  }
  return {
    status: "Received",
      text: "TRI AI has received this proposal.",
    next: "TRI AI reviews it.",
    owner: "TRI AI",
  };
}

export function researcherNotices(rows: ProposalSource[]): AttentionNotice[] {
  return rows
    .filter((row) => row.status && row.status !== "draft")
    .map((row) => {
      const copy = researcherCopy(row);
      const revise = row.status === "revise" && row.route !== "saturdays";
      return {
        id: `proposal:${row.id}:${proposalState(row)}`,
        ...copy,
        text: row.title ? `${row.title}. ${copy.text}` : copy.text,
        href: revise ? `/dashboard/application?proposal=${row.id}` : undefined,
        action: revise ? "Revise the proposal" : undefined,
      };
    });
}

export function seniorNotices(matches: MatchSource[], uid: string): AttentionNotice[] {
  const notices: AttentionNotice[] = [];
  for (const match of matches) {
    if (match.mentorId !== uid) continue;
    const title = match.title || "Untitled proposal";
    const response = match.response || "pending";
    if (response === "pending") {
      notices.push({
        id: `match:${match.id}:pending`,
        status: "Match request",
        text: `TRI AI sent you a match request for ${title}.`,
        next: "Respond on Match requests.",
        owner: "You",
      });
    } else if (match.introduced) {
      notices.push({
        id: `match:${match.id}:introduced`,
        status: "Introduction",
        text: `TRI AI introduced you on ${title}.`,
        next: "Join the scoping meeting when TRI AI confirms it.",
        owner: "TRI AI",
      });
    }
  }
  return notices;
}

export function projectNotices(projects: ProjectSource[]): AttentionNotice[] {
  return projects.flatMap((project) => {
    const title = project.title || "Untitled project";
    if (project.status === "scoping") {
      return [
        {
          id: `project:${project.id}:scoping`,
          status: "Scoping",
          text: `${title} is in scoping.`,
          next: "After the scoping meeting, TRI AI records the signed Project Charter.",
          owner: "TRI AI",
        },
      ];
    }
    if (project.status === "active" && project.scoped && project.charterSigned) {
      return [
        {
          id: `project:${project.id}:active`,
          status: "Active",
          text: `${title} is now an active project.`,
          next: "Continue the work with your Senior Researcher.",
          owner: "TRI AI",
          href: "/dashboard",
          action: "Open projects",
        },
      ];
    }
    if (project.status === "internal_review") {
      return [
        {
          id: `project:${project.id}:internal_review`,
          status: "Internal review",
          text: `${title} is in internal review.`,
          next: "Read the review note from TRI AI.",
          owner: "TRI AI",
        },
      ];
    }
    if (project.status === "paused") {
      return [
        {
          id: `project:${project.id}:paused`,
          status: "Paused",
          text: `${title} is paused.`,
          next: "Wait for TRI AI before continuing the work.",
          owner: "TRI AI",
        },
      ];
    }
    return [];
  });
}

const adminReviewStatuses = new Set(["received", "under_review"]);
const adminSendStatuses = new Set(["approved_for_matching", "ready_for_matching", "held_for_matching"]);

export function adminNotices(
  proposals: ProposalSource[],
  matches: MatchSource[],
  seniors: SeniorSource[],
): AttentionNotice[] {
  const notices: AttentionNotice[] = [];
  for (const row of proposals) {
    const title = row.title || "Untitled proposal";
    if (row.status && adminReviewStatuses.has(row.status)) {
      notices.push({
        id: `proposal:${row.id}:${row.status}`,
        status: "Review",
        text: `${title} is waiting for a TRI AI review.`,
        next: "Open the proposal and record the decision.",
        owner: "TRI AI",
        href: `/admin/proposals/${row.id}`,
        action: "Open the proposal",
      });
    }
    if (row.status && adminSendStatuses.has(row.status)) {
      notices.push({
        id: `proposal:${row.id}:${row.status}`,
        status: "Ready for matching",
        text: `${title} can be offered to a Senior Researcher.`,
        next: "Send the opportunity from Matching.",
        owner: "TRI AI",
        href: "/admin/matching",
        action: "Open matching",
      });
    }
  }
  for (const match of matches) {
    const response = match.response || "pending";
    if (response === "pending" || match.introduced) continue;
    const title = match.title || "Untitled proposal";
    const mentor = match.mentorName || "A Senior Researcher";
    const interested = response === "interested" || response === "interested_with_questions";
    notices.push({
      id: `match:${match.id}:${response}`,
      status: interested ? "Senior Researcher response" : "Match declined",
      text: interested ? `${mentor} is interested in ${title}.` : `${mentor} declined ${title}.`,
      next: interested
        ? "Record the introduction when you are ready."
        : "Decide whether to offer the proposal to someone else.",
      owner: "TRI AI",
      href: "/admin/matching",
      action: "Open matching",
    });
  }
  for (const senior of seniors) {
    if (senior.poolStatus !== "pending") continue;
    notices.push({
      id: `senior:${senior.id}:pending`,
      status: "Senior Researcher pool",
      text: `${senior.name || "A Senior Researcher"} asked to join the Senior Researcher pool.`,
      next: "Confirm the pool status.",
      owner: "TRI AI",
      href: "/admin/mentors",
      action: "Open Senior Researchers",
    });
  }
  return notices;
}

type MeetingNoticeSource = {
  id: string;
  kind?: string;
  title?: string;
  status?: string;
  startsAt?: { toDate?: () => Date };
  endsAt?: { toDate?: () => Date };
};

export function meetingNotices(meetings: MeetingNoticeSource[]): AttentionNotice[] {
  return meetings
    .filter((meeting) => meeting.status !== "cancelled" && !meetingHasHappened(meeting))
    .map((meeting) => {
      const when = meeting.startsAt?.toDate?.();
      const label = when && !Number.isNaN(when.getTime())
        ? formatZonedWhen(when, "Africa/Lagos")
        : "a time TRI AI set";
      const scoping = meeting.kind === "scoping";
      return {
        id: `meeting:${meeting.id}:${when ? when.toISOString() : "unset"}`,
        status: scoping ? "Scoping meeting" : "Project meeting",
        text: `${meeting.title || "A meeting"} is scheduled for ${label}.`,
        next: scoping
          ? "Confirm whether you can attend this new scoping meeting."
          : "Confirm whether you can attend this meeting for the active project.",
        owner: "TRI AI",
        href: "/dashboard/meetings",
        action: "Open scoping meetings",
      };
    });
}

export function reviewerNotices(reviews: ReviewSource[], proposals: ProposalSource[]): AttentionNotice[] {
  return reviews
    .filter((review) => !review.decision || review.decision === "under_review")
    .map((review) => {
      const proposalId = review.proposalId || review.id;
      const proposal = proposals.find((item) => item.id === proposalId);
      return {
        id: `review:${proposalId}:open`,
        status: "Review assigned",
        text: `${proposal?.title || "A proposal"} is open for your review.`,
        next: "Score it and record a decision.",
        owner: "You",
        href: `/admin/proposals/${proposalId}`,
        action: "Open the review",
      };
    });
}
