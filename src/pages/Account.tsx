import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader } from "../components/Loader";
import { TimezoneField } from "../components/MeetingTimePicker";
import { SearchSelect, optionsFrom } from "../components/SearchSelect";
import { SeniorProfileFields } from "../components/SeniorProfileFields";
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
  APPLICANT_STATUS_OPTIONS,
  COUNTRY_OPTIONS,
  EMPTY_RESEARCHER_PROFILE,
  EMPTY_SENIOR,
  PROPOSAL_LABELS,
  type ResearcherProfileDraft,
  type SeniorProfileDraft,
} from "../types/domain";
import { userFacingError } from "../lib/errors";

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
      setError(userFacingError(err, "Could not save."));
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
              ? researcherFields.map((key) => {
                  if (key === "location") {
                    return (
                      <SearchSelect
                        key={key}
                        label={PROPOSAL_LABELS[key]}
                        options={optionsFrom(COUNTRY_OPTIONS)}
                        value={researcher.location}
                        onChange={(location) => setResearcher({ ...researcher, location })}
                        allowCustom
                        placeholder="Type to search countries…"
                      />
                    );
                  }
                  if (key === "applicantStatus") {
                    return (
                      <SearchSelect
                        key={key}
                        label={PROPOSAL_LABELS[key]}
                        options={optionsFrom(APPLICANT_STATUS_OPTIONS)}
                        value={researcher.applicantStatus}
                        onChange={(applicantStatus) => setResearcher({ ...researcher, applicantStatus })}
                        allowCustom
                        placeholder="Search status…"
                      />
                    );
                  }
                  return (
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
                  );
                })
              : null}
            {profile.role === "senior_researcher" ? (
              <SeniorProfileFields
                hideName
                draft={{ ...senior, name: senior.name || name }}
                onChange={setSenior}
              />
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
