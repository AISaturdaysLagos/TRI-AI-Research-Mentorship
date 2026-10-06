import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader } from "../components/Loader";
import { TimezoneField } from "../components/MeetingTimePicker";
import { useAuth } from "../lib/auth";
import { PROGRAMME_ZONE, loadTimezones, saveTimezone } from "../lib/timezones";
import {
  getResearcherProfile,
  getSeniorProfile,
  listResearcherProposals,
  researcherDraftFromRecord,
  saveResearcherProfile,
  saveSeniorProfile,
  seniorDraftFromRecord,
} from "../lib/records";
import {
  EMPTY_RESEARCHER_PROFILE,
  EMPTY_SENIOR,
  PROPOSAL_LABELS,
  type MentorAvailability,
  type ResearcherProfileDraft,
  type SeniorProfileDraft,
} from "../types/domain";

const availability: MentorAvailability[] = [
  "available",
  "limited_capacity",
  "at_capacity",
  "temporarily_unavailable",
  "inactive",
];

const researcherFields: (keyof ResearcherProfileDraft)[] = [
  "affiliation",
  "location",
  "applicantStatus",
  "bio",
  "github",
  "scholar",
];

export function AccountPage() {
  const { user, profile, updateDisplayName } = useAuth();
  const [name, setName] = useState(profile?.displayName ?? "");
  const [zone, setZone] = useState(PROGRAMME_ZONE);
  const [researcher, setResearcher] = useState<ResearcherProfileDraft>(EMPTY_RESEARCHER_PROFILE);
  const [senior, setSenior] = useState<SeniorProfileDraft>(EMPTY_SENIOR);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;
    setName(profile.displayName);
    void loadTimezones([user.uid]).then((next) => {
      if (!cancelled) setZone(next[user.uid] || PROGRAMME_ZONE);
    });
    const load = async () => {
      if (profile.role === "researcher") {
        const saved = await getResearcherProfile(user.uid);
        if (cancelled) return;
        if (saved) {
          const next = researcherDraftFromRecord(saved);
          setResearcher(next);
          if (next.name) setName(next.name);
          return;
        }
        const proposals = (await listResearcherProposals(user.uid)) as Array<Record<string, unknown>>;
        if (cancelled) return;
        const source = proposals.find((item) => typeof item.name === "string" && item.name) ?? proposals[0];
        const next = researcherDraftFromRecord(source);
        if (!next.name) next.name = profile.displayName;
        setResearcher(next);
        if (next.name) setName(next.name);
        return;
      }
      if (profile.role === "senior_researcher") {
        const saved = await getSeniorProfile(user.uid);
        if (cancelled) return;
        const next = seniorDraftFromRecord(saved);
        if (!next.name) next.name = profile.displayName;
        setSenior(next);
        if (next.name) setName(next.name);
      }
    };
    load()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [profile, user]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !profile) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const nextName = name.trim();
      await updateDisplayName(nextName);
      if (profile.role === "researcher") {
        const next = { ...researcher, name: nextName };
        await saveResearcherProfile(user.uid, next);
        setResearcher(next);
      }
      if (profile.role === "senior_researcher") {
        const next = { ...senior, name: nextName };
        await saveSeniorProfile(user.uid, next);
        setSenior(next);
      }
      await saveTimezone(user.uid, zone);
      setMessage("Account saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;
  if (!profile) {
    return (
      <article>
        <header className="page-intro">
          <div className="container">
            <p className="mono">Account</p>
            <h1>Choose how you are joining.</h1>
            <p className="lede">{user.email}</p>
            <Link className="btn btn-primary" to="/login">
              Continue
            </Link>
          </div>
        </header>
      </article>
    );
  }

  return (
    <article>
      <header className="page-intro work">
        <div className="container">
          <p className="mono">Account settings</p>
          <h1>{profile.displayName || "Your account"}</h1>
          <p className="lede">Your account.</p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container" style={{ maxWidth: 760 }}>
          {!loaded ? <Loader label="Loading your profile" /> : (
          <form className="fields" onSubmit={onSubmit}>
            <label>
              Full name
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label>
              Email
              <input value={profile.email} readOnly />
            </label>
            <TimezoneField label="Your time zone" value={zone} onChange={setZone} />
            <p className="quiet">Shown on your meetings.</p>
            {profile.role === "researcher"
              ? researcherFields.map((key) => (
                  <label key={key}>
                    {PROPOSAL_LABELS[key]}
                    {key === "bio" || key === "scholar" ? (
                      <textarea
                        value={researcher[key]}
                        onChange={(event) => setResearcher({ ...researcher, [key]: event.target.value })}
                      />
                    ) : (
                      <input
                        value={researcher[key]}
                        onChange={(event) => setResearcher({ ...researcher, [key]: event.target.value })}
                      />
                    )}
                  </label>
                ))
              : null}
            {profile.role === "senior_researcher" ? (
              <>
                <div className="fields two">
                  <label>
                    Institution or organisation
                    <input
                      autoComplete="organization"
                      value={senior.affiliation}
                      onChange={(event) => setSenior({ ...senior, affiliation: event.target.value })}
                    />
                  </label>
                  <label>
                    Current role
                    <input
                      value={senior.currentRole}
                      onChange={(event) => setSenior({ ...senior, currentRole: event.target.value })}
                    />
                  </label>
                  <label>
                    Country or location
                    <input
                      autoComplete="country-name"
                      value={senior.country}
                      onChange={(event) => setSenior({ ...senior, country: event.target.value })}
                    />
                  </label>
                  <label>
                    Projects at once
                    <span className="hint">The most you would consider taking on at the same time.</span>
                    <input
                      inputMode="numeric"
                      value={senior.capacity}
                      onChange={(event) => setSenior({ ...senior, capacity: event.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Primary research areas
                  <span className="hint">The areas where you can support a project.</span>
                  <textarea
                    rows={4}
                    value={senior.researchAreas}
                    onChange={(event) => setSenior({ ...senior, researchAreas: event.target.value })}
                  />
                </label>
                <label>
                  Methods you can support
                  <span className="hint">Technical areas you are comfortable supporting as a Senior Researcher.</span>
                  <textarea
                    rows={4}
                    value={senior.methods}
                    onChange={(event) => setSenior({ ...senior, methods: event.target.value })}
                  />
                </label>
                <label>
                  Publications or projects
                  <span className="hint">Up to three examples.</span>
                  <textarea
                    rows={4}
                    value={senior.publications}
                    onChange={(event) => setSenior({ ...senior, publications: event.target.value })}
                  />
                </label>
                <label>
                  Meeting cadence
                  <span className="hint">How often you can meet on an active project.</span>
                  <input
                    value={senior.cadence}
                    onChange={(event) => setSenior({ ...senior, cadence: event.target.value })}
                  />
                </label>
                <label>
                  Availability
                  <span className="hint">Approximate availability over the next 6 months.</span>
                  <select
                    value={senior.availability}
                    onChange={(event) =>
                      setSenior({ ...senior, availability: event.target.value as MentorAvailability })
                    }
                  >
                    {availability.map((item) => (
                      <option key={item} value={item}>
                        {item.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
            {message ? <p className="quiet">{message}</p> : null}
            {error ? <p className="error">{error}</p> : null}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              Save profile
            </button>
          </form>
          )}
        </div>
      </section>
    </article>
  );
}
