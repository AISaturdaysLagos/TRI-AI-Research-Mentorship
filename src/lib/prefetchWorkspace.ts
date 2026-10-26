import { listMeetingReplies, listMeetings, listParticipantMeetings, meetingAttendees, type MeetingRow } from "./meetings";
import {
  listAdmins,
  listDirectory,
  listMatches,
  listMentorMatches,
  listParticipantProjects,
  listPendingInvitesForEmail,
  listProgrammeIntroductions,
  listProjectInvites,
  listProjects,
  listProposals,
  listResearcherProfiles,
  listResearcherProposals,
  listResearchProjects,
  listSeniorProfiles,
} from "./records";
import { listProjectActivities } from "./workspace";
import { loadTimezones } from "./timezones";

const LIVE_PROJECT = new Set(["scoping", "active", "internal_review"]);

function quiet(work: Promise<unknown>) {
  void work.catch(() => undefined);
}

function warmMeetingExtras(meetings: MeetingRow[], uid: string) {
  const ids = meetings.flatMap((meeting) => meetingAttendees(meeting).map((person) => person.uid));
  if (uid) ids.push(uid);
  quiet(loadTimezones(ids));
  for (const meeting of meetings) quiet(listMeetingReplies(meeting.id));
}

let adminChunksStarted = false;
let participantChunksStarted = false;

function prefetchAdminChunks() {
  if (adminChunksStarted) return;
  adminChunksStarted = true;
  void import("../pages/AdminTasks");
  void import("../pages/AdminMatching");
  void import("../pages/AdminMeetings");
  void import("../pages/AdminProjects");
  void import("../pages/AdminPeople");
  void import("../pages/AdminReports");
  void import("../pages/AdminReview");
}

function prefetchParticipantChunks() {
  if (participantChunksStarted) return;
  participantChunksStarted = true;
  void import("../pages/Dashboard");
  void import("../pages/Meetings");
}

/** Start every admin tab's records and scripts together, so a later tab opens from cache. */
export function prefetchAdminWorkspace(uid: string) {
  prefetchAdminChunks();
  quiet(listProposals());
  quiet(
    listProjects().then((projects) => {
      const ids = (projects as { id: string; status?: string }[])
        .filter((project) => LIVE_PROJECT.has(project.status || ""))
        .map((project) => project.id);
      return listProjectActivities(ids);
    }),
  );
  quiet(listMatches());
  quiet(listSeniorProfiles());
  quiet(listResearcherProfiles());
  quiet(listDirectory());
  quiet(listProjectInvites());
  quiet(
    listMeetings().then((meetings) => {
      warmMeetingExtras(meetings, uid);
    }),
  );
}

export function prefetchReviewerWorkspace() {
  prefetchAdminChunks();
  quiet(listProposals());
  quiet(listProjects());
}

/** Start projects, proposals or match requests, and scoping meetings together. */
export function prefetchParticipantWorkspace(role: "researcher" | "senior_researcher", uid: string, email: string) {
  prefetchParticipantChunks();
  quiet(listParticipantProjects(uid));
  quiet(listResearchProjects());
  quiet(listPendingInvitesForEmail(email, uid));
  quiet(
    listParticipantMeetings(uid).then((meetings) => {
      warmMeetingExtras(meetings, uid);
    }),
  );
  if (role === "researcher") {
    quiet(listResearcherProposals(uid));
    return;
  }
  quiet(listMatches());
  quiet(listMentorMatches(uid));
  quiet(listProgrammeIntroductions());
  quiet(listAdmins());
}
