import { SearchMultiSelect, SearchSelect, joinValues, optionsFrom, parseJoined } from "./SearchSelect";
import {
  CHARTER_AUTHORSHIP_OPTIONS,
  CHARTER_CADENCE_OPTIONS,
  CHARTER_COMMUNICATION_OPTIONS,
  CHARTER_DURATION_OPTIONS,
  CHARTER_INTEGRITY_OPTIONS,
  CHARTER_IP_OPTIONS,
  CHARTER_MEETING_FORMAT_OPTIONS,
  CHARTER_OBJECTIVE_OPTIONS,
  CHARTER_OUT_OF_SCOPE_OPTIONS,
  CHARTER_RELEASE_OPTIONS,
  CHARTER_RESEARCHER_DUTY_OPTIONS,
  CHARTER_RESOURCE_OPTIONS,
  CHARTER_RISK_OPTIONS,
  CHARTER_SENIOR_DUTY_OPTIONS,
  CHARTER_SUCCESS_OPTIONS,
  CHARTER_TRI_DUTY_OPTIONS,
} from "../types/domain";
import type { CharterRecord } from "../lib/workspace";

export function CharterFields({
  draft,
  onChange,
}: {
  draft: CharterRecord;
  onChange: (next: CharterRecord) => void;
}) {
  function update<K extends keyof CharterRecord>(key: K, value: CharterRecord[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <>
      <SearchMultiSelect
        legend="Objectives"
        hint="What this project will deliver."
        options={optionsFrom(CHARTER_OBJECTIVE_OPTIONS)}
        values={parseJoined(draft.objectives)}
        onChange={(values) => update("objectives", joinValues(values))}
        allowCustom
        placeholder="Search objectives…"
      />
      <SearchMultiSelect
        legend="Out of scope"
        hint="What this project will not take on."
        options={optionsFrom(CHARTER_OUT_OF_SCOPE_OPTIONS)}
        values={parseJoined(draft.outOfScope)}
        onChange={(values) => update("outOfScope", joinValues(values))}
        allowCustom
        placeholder="Search out-of-scope items…"
      />
      <div className="fields two">
        <SearchSelect
          label="Duration"
          options={optionsFrom(CHARTER_DURATION_OPTIONS)}
          value={draft.duration}
          onChange={(duration) => update("duration", duration)}
          allowCustom
          placeholder="Typical length…"
        />
        <SearchSelect
          label="Meeting cadence"
          options={optionsFrom(CHARTER_CADENCE_OPTIONS)}
          value={draft.cadence}
          onChange={(cadence) => update("cadence", cadence)}
          allowCustom
          placeholder="How often you meet…"
        />
      </div>
      <SearchSelect
        label="Meeting format"
        options={optionsFrom(CHARTER_MEETING_FORMAT_OPTIONS)}
        value={draft.meetingFormat}
        onChange={(meetingFormat) => update("meetingFormat", meetingFormat)}
        allowCustom
        placeholder="How you meet…"
      />
      <SearchMultiSelect
        legend="Researcher responsibilities"
        options={optionsFrom(CHARTER_RESEARCHER_DUTY_OPTIONS)}
        values={parseJoined(draft.researcherDuties)}
        onChange={(values) => update("researcherDuties", joinValues(values))}
        allowCustom
        placeholder="Search Researcher duties…"
      />
      <SearchMultiSelect
        legend="Senior Researcher responsibilities"
        options={optionsFrom(CHARTER_SENIOR_DUTY_OPTIONS)}
        values={parseJoined(draft.seniorDuties)}
        onChange={(values) => update("seniorDuties", joinValues(values))}
        allowCustom
        placeholder="Search Senior Researcher duties…"
      />
      <SearchMultiSelect
        legend="TRI AI responsibilities"
        options={optionsFrom(CHARTER_TRI_DUTY_OPTIONS)}
        values={parseJoined(draft.triDuties)}
        onChange={(values) => update("triDuties", joinValues(values))}
        allowCustom
        placeholder="Search TRI AI duties…"
      />
      <SearchMultiSelect
        legend="Resources"
        options={optionsFrom(CHARTER_RESOURCE_OPTIONS)}
        values={parseJoined(draft.resources)}
        onChange={(values) => update("resources", joinValues(values))}
        allowCustom
        placeholder="Search resources…"
      />
      <SearchMultiSelect
        legend="Integrity and ethics"
        options={optionsFrom(CHARTER_INTEGRITY_OPTIONS)}
        values={parseJoined(draft.integrity)}
        onChange={(values) => update("integrity", joinValues(values))}
        allowCustom
        placeholder="Search integrity items…"
      />
      <SearchMultiSelect
        legend="Risks"
        options={optionsFrom(CHARTER_RISK_OPTIONS)}
        values={parseJoined(draft.risks)}
        onChange={(values) => update("risks", joinValues(values))}
        allowCustom
        placeholder="Search risks…"
      />
      <SearchSelect
        label="Authorship"
        options={optionsFrom(CHARTER_AUTHORSHIP_OPTIONS)}
        value={draft.authorship}
        onChange={(authorship) => update("authorship", authorship)}
        allowCustom
        placeholder="Search authorship norms…"
      />
      <SearchSelect
        label="Intellectual property"
        options={optionsFrom(CHARTER_IP_OPTIONS)}
        value={draft.ip}
        onChange={(ip) => update("ip", ip)}
        allowCustom
        placeholder="Search IP norms…"
      />
      <SearchMultiSelect
        legend="Release expectations"
        options={optionsFrom(CHARTER_RELEASE_OPTIONS)}
        values={parseJoined(draft.release)}
        onChange={(values) => update("release", joinValues(values))}
        allowCustom
        placeholder="Search release plans…"
      />
      <SearchMultiSelect
        legend="Success criteria"
        options={optionsFrom(CHARTER_SUCCESS_OPTIONS)}
        values={parseJoined(draft.successCriteria)}
        onChange={(values) => update("successCriteria", joinValues(values))}
        allowCustom
        placeholder="Search success criteria…"
      />
      <SearchMultiSelect
        legend="Communication"
        options={optionsFrom(CHARTER_COMMUNICATION_OPTIONS)}
        values={parseJoined(draft.communication)}
        onChange={(values) => update("communication", joinValues(values))}
        allowCustom
        placeholder="Search channels…"
      />
      <label>
        Additional notes
        <span className="hint">Anything else the charter should record.</span>
        <textarea
          rows={4}
          value={draft.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </label>
    </>
  );
}
