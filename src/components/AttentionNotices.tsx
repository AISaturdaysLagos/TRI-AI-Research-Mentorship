import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { firestore } from "../lib/firebase";
import { closeNotification, syncNotifications, watchNotifications } from "../lib/inbox";
import {
  adminNotices,
  projectNotices,
  researcherNotices,
  meetingNotices,
  reviewerNotices,
  seniorNotices,
  type AttentionNotice,
} from "../lib/notices";
import { listParticipantMeetings } from "../lib/meetings";
import {
  listAssignedReviews,
  listMatches,
  listParticipantProjects,
  listProposals,
  listResearcherProposals,
  listResearchProjects,
  listSeniorProfiles,
  projectProposalIds,
} from "../lib/records";

async function currentNotices(uid: string, role: string): Promise<AttentionNotice[]> {
  if (role === "researcher") {
    const [proposals, projects, programmeProjects, meetings] = await Promise.all([
      listResearcherProposals(uid),
      listParticipantProjects(uid),
      listResearchProjects(),
      listParticipantMeetings(uid),
    ]);
    const matched = projectProposalIds([
      ...(projects as { id?: string; proposalId?: string }[]),
      ...(programmeProjects as { id?: string; proposalId?: string }[]),
    ]);
    const waiting = proposals.filter((row) => !matched.has(row.id));
    return [...researcherNotices(waiting), ...projectNotices(projects), ...meetingNotices(meetings)];
  }
  if (role === "senior_researcher") {
    const [matches, projects, meetings] = await Promise.all([
      listMatches(),
      listParticipantProjects(uid),
      listParticipantMeetings(uid),
    ]);
    const joined = projectProposalIds(projects as { id?: string; proposalId?: string }[]);
    const openMatches = matches.filter((row) => {
      const proposalId = (row as { proposalId?: string }).proposalId;
      return !proposalId || !joined.has(proposalId);
    });
    return [...seniorNotices(openMatches, uid), ...projectNotices(projects), ...meetingNotices(meetings)];
  }
  if (role === "admin") {
    const [proposals, matches, seniors] = await Promise.all([
      listProposals(),
      listMatches(),
      listSeniorProfiles(),
    ]);
    return adminNotices(proposals, matches, seniors);
  }
  if (role === "reviewer") {
    const [reviews, proposals] = await Promise.all([listAssignedReviews(uid), listProposals()]);
    return reviewerNotices(reviews, proposals);
  }
  return [];
}

export function AttentionNotices() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<AttentionNotice[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !profile) return;
    const db = firestore();
    if (!db) return;
    const uid = user.uid;
    const role = profile.role;
    let cancel = false;
    let timer = 0;

    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        currentNotices(uid, role)
          .then((notices) => syncNotifications(uid, notices))
          .catch((err: unknown) => {
            if (!cancel) setError(err instanceof Error ? err.message : "Could not save notifications.");
          });
      }, 40);
    };

    const fail = (err: { message?: string }) => {
      if (!cancel) setError(err.message || "Could not load notifications.");
    };
    const stops = [watchNotifications(uid, (next) => {
      if (!cancel) setItems(next);
    }, (message) => {
      if (!cancel) setError(message);
    })];

    if (role === "researcher") {
      stops.push(
        onSnapshot(query(collection(db, "proposals"), where("ownerId", "==", uid)), refresh, fail),
        onSnapshot(
          query(collection(db, "proposals"), where("researcherIds", "array-contains", uid)),
          refresh,
          fail,
        ),
        onSnapshot(
          query(collection(db, "projects"), where("participantIds", "array-contains", uid)),
          refresh,
          fail,
        ),
        onSnapshot(
          query(collection(db, "meetings"), where("participantIds", "array-contains", uid)),
          refresh,
          fail,
        ),
      );
    } else if (role === "senior_researcher") {
      stops.push(
        onSnapshot(collection(db, "matches"), refresh, fail),
        onSnapshot(
          query(collection(db, "projects"), where("participantIds", "array-contains", uid)),
          refresh,
          fail,
        ),
        onSnapshot(
          query(collection(db, "meetings"), where("participantIds", "array-contains", uid)),
          refresh,
          fail,
        ),
      );
    } else if (role === "admin") {
      stops.push(
        onSnapshot(collection(db, "proposals"), refresh, fail),
        onSnapshot(collection(db, "matches"), refresh, fail),
        onSnapshot(collection(db, "seniorResearcherProfiles"), refresh, fail),
      );
    } else if (role === "reviewer") {
      stops.push(
        onSnapshot(query(collection(db, "reviews"), where("reviewerId", "==", uid)), refresh, fail),
        onSnapshot(collection(db, "proposals"), refresh, fail),
      );
    } else {
      refresh();
    }

    return () => {
      cancel = true;
      window.clearTimeout(timer);
      for (const stop of stops) stop?.();
    };
  }, [profile, user]);

  async function close(id: string) {
    if (!user) return;
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    setError("");
    try {
      await closeNotification(user.uid, id);
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : "Could not close this notification.");
    }
  }

  if (!profile || !user) return null;
  if (error) return <p className="error">{error}</p>;
  if (items.length === 0) return null;

  return (
    <div className="notices" aria-label="Notifications">
      {items.map((item) => (
        <article key={item.id} className="notice">
          <div className="notice-bar">
            <p className="mono">{item.status}</p>
            <button className="btn btn-ghost btn-compact" type="button" onClick={() => void close(item.id)}>
              Close
            </button>
          </div>
          <p>{item.text}</p>
          {item.href && item.action ? (
            <p>
              <Link className="btn btn-primary btn-compact" to={item.href}>
                {item.action}
              </Link>
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
