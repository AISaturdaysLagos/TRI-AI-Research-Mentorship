const TTL_MS = 60_000;

type Entry = {
  at: number;
  promise: Promise<unknown>;
  settled: boolean;
  value?: unknown;
};

const entries = new Map<string, Entry>();

export const reads = {
  proposals: "proposals",
  projects: "projects",
  matches: "matches",
  seniors: "senior-profiles",
  researchers: "researcher-profiles",
  directory: "directory",
  invites: "project-invites",
  meetings: "meetings",
  researchProjects: "research-projects",
  introductions: "introductions",
  admins: "admins",
  reviews: (reviewerId: string) => `reviews:${reviewerId}`,
  participantProjects: (uid: string) => `participant-projects:${uid}`,
  researcherProposals: (uid: string) => `researcher-proposals:${uid}`,
  participantMeetings: (uid: string) => `participant-meetings:${uid}`,
  mentorMatches: (uid: string) => `mentor-matches:${uid}`,
  pendingInvites: (email: string, uid: string) => `pending-invites:${email.trim().toLowerCase()}:${uid}`,
  meetingReplies: (meetingId: string) => `meeting-replies:${meetingId}`,
  activities: (projectIds: string[]) => `activities:${[...projectIds].sort().join(",")}`,
  timezones: (uids: string[]) => `timezones:${[...new Set(uids.filter(Boolean))].sort().join(",")}`,
};

export function peekRead<T>(key: string): T | undefined {
  const hit = entries.get(key);
  if (!hit || !hit.settled || Date.now() - hit.at >= TTL_MS) return undefined;
  return hit.value as T;
}

export function cachedRead<T>(key: string, load: () => Promise<T>, fresh = false): Promise<T> {
  const now = Date.now();
  if (!fresh) {
    const hit = entries.get(key);
    if (hit && now - hit.at < TTL_MS) return hit.promise as Promise<T>;
  }
  const promise = load().then(
    (result) => {
      const stored = entries.get(key);
      if (stored?.promise === promise) {
        stored.settled = true;
        stored.value = result;
      }
      return result;
    },
    (error: unknown) => {
      const stored = entries.get(key);
      if (stored?.promise === promise) entries.delete(key);
      throw error;
    },
  );
  entries.set(key, { at: now, promise, settled: false });
  return promise;
}

/** Drop cached lists after a write so the next read sees the change. */
export function invalidateReads() {
  entries.clear();
}
