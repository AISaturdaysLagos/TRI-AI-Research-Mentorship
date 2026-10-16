import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmailSupport } from "../components/EmailSupport";
import { SeniorProfileFields } from "../components/SeniorProfileFields";
import { useAuth } from "../lib/auth";
import { named, seniorAppliedEmail, type EmailDraft } from "../lib/email";
import { userFacingError } from "../lib/errors";
import { getSeniorProfile, saveSeniorProfile, seniorDraftFromRecord } from "../lib/records";
import { EMPTY_SENIOR, type MentorAvailability, type SeniorProfileDraft } from "../types/domain";

function blankSenior(): SeniorProfileDraft {
  return { ...EMPTY_SENIOR, capacity: "", availability: "" as MentorAvailability };
}

export function ApplySeniorPage() {
  const { user, profile } = useAuth();
  const [draft, setDraft] = useState<SeniorProfileDraft>(blankSenior);
  const [message, setMessage] = useState("");
  const [mail, setMail] = useState<EmailDraft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setDraft(blankSenior());
      return;
    }
    let cancelled = false;
    getSeniorProfile(user.uid)
      .then((record) => {
        if (cancelled) return;
        setDraft(record ? seniorDraftFromRecord(record) : blankSenior());
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      setMessage("Sign in as a Senior Researcher to save this profile.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveSeniorProfile(user.uid, draft);
      setMessage("Senior Researcher profile saved.");
      setMail(
        seniorAppliedEmail({
          senior: named(draft.name || profile?.displayName || "", user.email || ""),
          areas: draft.researchAreas || "",
        }),
      );
    } catch (err) {
      setError(userFacingError(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">Senior Researcher</p>
          <h1>Join the Senior Researcher pool.</h1>
          <p className="lede">Tell TRI AI how you can support a project. Most fields are choices you can select.</p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container" style={{ maxWidth: 760 }}>
          {!user ? (
            <div className="notice">
              <Link className="btn btn-ghost btn-compact" to="/login?role=senior_researcher">
                Sign in
              </Link>{" "}
              to save this profile.
              {profile && profile.role !== "senior_researcher"
                ? " This account is not a Senior Researcher."
                : ""}
            </div>
          ) : null}
          <form className="fields" onSubmit={onSubmit}>
            <SeniorProfileFields draft={draft} onChange={setDraft} />
            {message ? <p className="quiet">{message}</p> : null}
            <EmailSupport label="Application email" draft={mail} autoOpen />
            {error ? <p className="error">{error}</p> : null}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              Save profile
            </button>
          </form>
        </div>
      </section>
    </article>
  );
}
