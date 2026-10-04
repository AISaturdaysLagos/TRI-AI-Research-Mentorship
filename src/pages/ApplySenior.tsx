import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { readLocalSenior, saveSeniorProfile, writeLocalSenior } from "../lib/records";
import { EMPTY_SENIOR, type MentorAvailability, type SeniorProfileDraft } from "../types/domain";

const availability: MentorAvailability[] = [
  "available",
  "limited_capacity",
  "at_capacity",
  "temporarily_unavailable",
  "inactive",
];

export function ApplySeniorPage() {
  const { user, profile } = useAuth();
  const [draft, setDraft] = useState<SeniorProfileDraft>(() => readLocalSenior() ?? EMPTY_SENIOR);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update<K extends keyof SeniorProfileDraft>(key: K, value: SeniorProfileDraft[K]) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    writeLocalSenior(next);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      setMessage("Saved on this device. Sign in as a Senior Researcher to join the pool.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveSeniorProfile(user.uid, draft);
      setMessage("Mentor profile saved.");
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
          <p className="lede">
            Mentor promising AI research projects aligned with your expertise. Joining the pool
            does not require you to accept every project. TRI AI will send relevant proposals for
            your consideration.
          </p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container" style={{ maxWidth: 760 }}>
          {!user ? (
            <div className="notice">
              <Link to="/login">Sign in</Link> to save this profile to the programme record.
              {profile && profile.role !== "senior_researcher"
                ? " Your current role is not Senior Researcher."
                : ""}
            </div>
          ) : null}
          <form className="fields" onSubmit={onSubmit}>
            <div className="fields two">
              <label>
                Full name
                <input value={draft.name} onChange={(event) => update("name", event.target.value)} required />
              </label>
              <label>
                Current institution or organisation
                <input value={draft.affiliation} onChange={(event) => update("affiliation", event.target.value)} />
              </label>
              <label>
                Current role
                <input value={draft.currentRole} onChange={(event) => update("currentRole", event.target.value)} />
              </label>
              <label>
                Current country or location
                <input value={draft.country} onChange={(event) => update("country", event.target.value)} />
              </label>
            </div>
            <label>
              Primary research areas
              <textarea value={draft.researchAreas} onChange={(event) => update("researchAreas", event.target.value)} />
            </label>
            <label>
              Methods or technical areas you are comfortable mentoring
              <textarea value={draft.methods} onChange={(event) => update("methods", event.target.value)} />
            </label>
            <label>
              Up to three representative publications or projects
              <textarea value={draft.publications} onChange={(event) => update("publications", event.target.value)} />
            </label>
            <div className="fields two">
              <label>
                Maximum number of projects you would consider mentoring at once
                <input value={draft.capacity} onChange={(event) => update("capacity", event.target.value)} />
              </label>
              <label>
                Preferred meeting cadence for an active project
                <input value={draft.cadence} onChange={(event) => update("cadence", event.target.value)} />
              </label>
            </div>
            <label>
              Approximate availability over the next 6 months
              <select
                value={draft.availability}
                onChange={(event) => update("availability", event.target.value as MentorAvailability)}
              >
                {availability.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            {message ? <p className="quiet">{message}</p> : null}
            {error ? <p className="error">{error}</p> : null}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {user ? "Save profile" : "Save on this device"}
            </button>
          </form>
        </div>
      </section>
    </article>
  );
}
