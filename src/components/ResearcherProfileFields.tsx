import { SearchSelect, optionsFrom } from "./SearchSelect";
import {
  APPLICANT_STATUS_OPTIONS,
  COUNTRY_OPTIONS,
  type ResearcherProfileDraft,
} from "../types/domain";

export function ResearcherProfileFields({
  draft,
  onChange,
  hideName = false,
}: {
  draft: ResearcherProfileDraft;
  onChange: (next: ResearcherProfileDraft) => void;
  hideName?: boolean;
}) {
  function update<K extends keyof ResearcherProfileDraft>(key: K, value: ResearcherProfileDraft[K]) {
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
          label="Country or location"
          options={optionsFrom(COUNTRY_OPTIONS)}
          value={draft.location}
          onChange={(location) => update("location", location)}
          allowCustom
          placeholder="Type to search countries…"
        />
        <SearchSelect
          label="Current status"
          options={optionsFrom(APPLICANT_STATUS_OPTIONS)}
          value={draft.applicantStatus}
          onChange={(applicantStatus) => update("applicantStatus", applicantStatus)}
          allowCustom
          placeholder="Search status…"
        />
      </div>
      <label>
        Short bio
        <textarea rows={4} value={draft.bio} onChange={(event) => update("bio", event.target.value)} />
      </label>
      <div className="fields two">
        <label>
          GitHub
          <input value={draft.github} onChange={(event) => update("github", event.target.value)} />
        </label>
        <label>
          Google Scholar
          <input value={draft.scholar} onChange={(event) => update("scholar", event.target.value)} />
        </label>
      </div>
    </>
  );
}
