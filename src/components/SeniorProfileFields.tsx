import { SearchMultiSelect, SearchSelect, joinValues, optionsFrom, parseJoined } from "./SearchSelect";
import {
  SENIOR_AVAILABILITY_OPTIONS,
  SENIOR_CADENCE_OPTIONS,
  SENIOR_CAPACITY_OPTIONS,
  SENIOR_COUNTRY_OPTIONS,
  SENIOR_METHOD_OPTIONS,
  SENIOR_RESEARCH_AREA_OPTIONS,
  SENIOR_ROLE_OPTIONS,
  type MentorAvailability,
  type SeniorProfileDraft,
} from "../types/domain";

export function SeniorProfileFields({
  draft,
  onChange,
  hideName = false,
}: {
  draft: SeniorProfileDraft;
  onChange: (next: SeniorProfileDraft) => void;
  hideName?: boolean;
}) {
  function update<K extends keyof SeniorProfileDraft>(key: K, value: SeniorProfileDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <>
      <div className="fields two">
        {hideName ? null : (
          <label>
            Full name
            <input autoComplete="name" value={draft.name} onChange={(event) => update("name", event.target.value)} required />
          </label>
        )}
        <label>
          Institution or organisation
          <input
            autoComplete="organization"
            value={draft.affiliation}
            onChange={(event) => update("affiliation", event.target.value)}
          />
        </label>
        <SearchSelect
          label="Current role"
          options={optionsFrom(SENIOR_ROLE_OPTIONS)}
          value={draft.currentRole}
          onChange={(currentRole) => update("currentRole", currentRole)}
          allowCustom
          placeholder="Search roles…"
        />
        <SearchSelect
          label="Country or location"
          options={optionsFrom(SENIOR_COUNTRY_OPTIONS)}
          value={draft.country}
          onChange={(country) => update("country", country)}
          allowCustom
          placeholder="Type to search countries…"
        />
      </div>

      <SearchMultiSelect
        legend="Primary research areas"
        hint="Search and add the areas where you can support a project."
        options={optionsFrom(SENIOR_RESEARCH_AREA_OPTIONS)}
        values={parseJoined(draft.researchAreas)}
        onChange={(values) => update("researchAreas", joinValues(values))}
        allowCustom
        placeholder="Search research areas…"
      />
      <SearchMultiSelect
        legend="Methods you can support"
        hint="Search and add technical approaches you can support."
        options={optionsFrom(SENIOR_METHOD_OPTIONS)}
        values={parseJoined(draft.methods)}
        onChange={(values) => update("methods", joinValues(values))}
        allowCustom
        placeholder="Search methods…"
      />

      <label>
        Publications or projects
        <span className="hint">Up to three examples. Profile links go in the fields below.</span>
        <textarea rows={3} value={draft.publications} onChange={(event) => update("publications", event.target.value)} />
      </label>

      <div className="fields two">
        <label>
          Google Scholar
          <span className="hint">Profile URL</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://scholar.google.com/…"
            value={draft.scholar}
            onChange={(event) => update("scholar", event.target.value)}
          />
        </label>
        <label>
          LinkedIn
          <span className="hint">Profile URL</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://www.linkedin.com/in/…"
            value={draft.linkedin}
            onChange={(event) => update("linkedin", event.target.value)}
          />
        </label>
        <label>
          GitHub
          <span className="hint">Optional</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://github.com/…"
            value={draft.github}
            onChange={(event) => update("github", event.target.value)}
          />
        </label>
        <label>
          Website or ORCID
          <span className="hint">Optional</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={draft.website}
            onChange={(event) => update("website", event.target.value)}
          />
        </label>
      </div>

      <div className="fields two">
        <SearchSelect
          label="Projects at once"
          hint="The most you would consider taking on at the same time."
          options={SENIOR_CAPACITY_OPTIONS.map((item) => ({
            value: item,
            label: item === "1" ? "1 project" : `${item} projects`,
          }))}
          value={draft.capacity}
          onChange={(capacity) => update("capacity", capacity)}
          placeholder="Search capacity…"
        />
        <SearchSelect
          label="Meeting cadence"
          hint="How often you can meet on an active project."
          options={optionsFrom(SENIOR_CADENCE_OPTIONS)}
          value={draft.cadence}
          onChange={(cadence) => update("cadence", cadence)}
          allowCustom
          placeholder="Search cadence…"
        />
      </div>

      <SearchSelect
        className="is-wide"
        label="Availability"
        hint="Approximate availability over the next 6 months."
        options={SENIOR_AVAILABILITY_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
        value={draft.availability}
        onChange={(availability) => update("availability", availability as MentorAvailability)}
        placeholder="Search availability…"
      />
    </>
  );
}
