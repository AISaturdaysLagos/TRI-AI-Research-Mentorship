import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmailSupport } from "../components/EmailSupport";
import { useAuth } from "../lib/auth";
import { named, seniorAppliedEmail, type EmailDraft } from "../lib/email";
import { getSeniorProfile, saveSeniorProfile, seniorDraftFromRecord } from "../lib/records";
import { EMPTY_SENIOR, type MentorAvailability, type SeniorProfileDraft } from "../types/domain";

const availability: MentorAvailability[] = [
  "available",
  "limited_capacity",
  "at_capacity",
  "temporarily_unavailable",
  "inactive",
];

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

  function update<K extends keyof SeniorProfileDraft>(key: K, value: SeniorProfileDraft[K]) {
    setDraft({ ...draft, [key]: value });
  }

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
      setError(err instanceof Error ? err.message : "Could not save.");
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
          <p className="lede">Tell TRI AI how you can support a project.</p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container" style={{ maxWidth: 760 }}>
          {!user ? (
            <div className="notice">
              <Link className="btn btn-ghost btn-compact" to="/login">Sign in</Link> to save this profile.
              {profile && profile.role !== "senior_researcher"
                ? " This account is not a Senior Researcher."
                : ""}
            </div>
          ) : null}
          <form className="fields" onSubmit={onSubmit}>
            <div className="fields two">
              <label>
                Full name
                <input autoComplete="name" value={draft.name} onChange={(event) => update("name", event.target.value)} required />
              </label>
              <label>
                Institution or organisation
                <input autoComplete="organization" value={draft.affiliation} onChange={(event) => update("affiliation", event.target.value)} />
              </label>
              <label>
                Current role
                <input value={draft.currentRole} onChange={(event) => update("currentRole", event.target.value)} />
              </label>
              <label>
                Country or location
                <input autoComplete="country-name" value={draft.country} onChange={(event) => update("country", event.target.value)} />
              </label>
            </div>
            <label>
              Primary research areas
              <span className="hint">The areas where you can support a project.</span>
              <textarea rows={4} value={draft.researchAreas} onChange={(event) => update("researchAreas", event.target.value)} />
            </label>
            <label>
              Methods you can support
              <span className="hint">Technical areas you are comfortable supporting as a Senior Researcher.</span>
              <textarea rows={4} value={draft.methods} onChange={(event) => update("methods", event.target.value)} />
            </label>
            <label>
              Publications or projects
              <span className="hint">Up to three examples.</span>
              <textarea rows={4} value={draft.publications} onChange={(event) => update("publications", event.target.value)} />
            </label>
            <div className="fields two">
              <label>
                Projects at once
                <span className="hint">The most you would consider taking on at the same time.</span>
                <input inputMode="numeric" value={draft.capacity} onChange={(event) => update("capacity", event.target.value)} />
              </label>
              <label>
                Meeting cadence
                <span className="hint">How often you can meet on an active project.</span>
                <input value={draft.cadence} onChange={(event) => update("cadence", event.target.value)} />
              </label>
            </div>
            <label>
              Availability
              <span className="hint">Approximate availability over the next 6 months.</span>
              <select
                value={draft.availability}
                onChange={(event) => update("availability", event.target.value as MentorAvailability)}
              >
                <option value="">Select availability</option>
                {availability.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            {message ? <p className="quiet">{message}</p> : null}
            <EmailSupport draft={mail} />
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
