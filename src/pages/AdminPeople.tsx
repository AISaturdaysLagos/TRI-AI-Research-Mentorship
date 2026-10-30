import { FormEvent, Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import { CloseButton } from "../components/CloseButton";
import { InviteSeniorResearchers } from "./AdminOnboarding";
import { EmailSupport } from "../components/EmailSupport";
import { Loader } from "../components/Loader";
import { ResearcherProfileFields } from "../components/ResearcherProfileFields";
import { SearchSelect } from "../components/SearchSelect";
import { SeniorProfileFields } from "../components/SeniorProfileFields";
import { useAuth } from "../lib/auth";
import { named, seniorWelcomeEmail } from "../lib/email";
import { userFacingError } from "../lib/errors";
import {
  deleteResearcherFromDirectory,
  deleteSeniorResearcherFromDirectory,
  listDirectory,
  listResearcherProfiles,
  listSeniorProfiles,
  researcherDraftFromRecord,
  saveResearcherProfile,
  saveSeniorProfile,
  seniorDraftFromRecord,
  updateMentorPool,
} from "../lib/records";
import { peekRead, reads } from "../lib/readCache";
import {
  EMPTY_RESEARCHER_PROFILE,
  EMPTY_SENIOR,
  SENIOR_AVAILABILITY_OPTIONS,
  type MentorAvailability,
  type ResearcherProfileDraft,
  type SeniorProfileDraft,
} from "../types/domain";

const PAGE_SIZE = 25;

const availabilityOptions = SENIOR_AVAILABILITY_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}));

type DirectoryPerson = { id: string; email: string; displayName: string; role: string };

type SeniorRow = SeniorProfileDraft & {
  id: string;
  email: string;
  poolStatus?: string;
};

type ResearcherRow = ResearcherProfileDraft & {
  id: string;
  email: string;
};

function haystack(parts: (string | undefined)[]) {
  return parts
    .map((part) => (part || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function matchesQuery(query: string, parts: (string | undefined)[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const text = haystack(parts);
  return needle.split(/\s+/).every((token) => text.includes(token));
}

function pageSlice<T>(rows: T[], page: number) {
  const start = (page - 1) * PAGE_SIZE;
  return rows.slice(start, start + PAGE_SIZE);
}

function DirectoryToolbar({
  search,
  onSearch,
  total,
  shown,
  page,
  pageCount,
  onPage,
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  total: number;
  shown: number;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  children?: ReactNode;
}) {
  return (
    <div className="directory-toolbar">
      <div className="filters directory-filters">
        <label className="directory-search">
          <span className="sr-only">Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search name, email, affiliation…"
            autoComplete="off"
          />
        </label>
        {children}
      </div>
      <div className="directory-meta">
        <p className="quiet">
          {shown === total
            ? `${total} ${total === 1 ? "person" : "people"}`
            : `Showing ${shown} of ${total}`}
        </p>
        {pageCount > 1 ? (
          <div className="directory-pager">
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
            >
              Previous
            </button>
            <span className="quiet">
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              disabled={page >= pageCount}
              onClick={() => onPage(page + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function researcherRows(profiles: { id: string }[], directory: DirectoryPerson[]) {
  const byId = new Map(profiles.map((item) => [item.id, item]));
  const people = directory.filter((person) => person.role === "researcher");
  const seen = new Set<string>();
  const next: ResearcherRow[] = [];
  for (const person of people) {
    seen.add(person.id);
    const profileRow = byId.get(person.id);
    const fields = researcherDraftFromRecord(profileRow);
    if (!fields.name) fields.name = person.displayName || "";
    next.push({ id: person.id, email: person.email || "", ...fields });
  }
  for (const profileRow of profiles) {
    if (seen.has(profileRow.id)) continue;
    const fields = researcherDraftFromRecord(profileRow);
    next.push({ id: profileRow.id, email: "", ...fields });
  }
  next.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, undefined, { sensitivity: "base" }));
  return next;
}

function warmResearchers() {
  const profiles = peekRead<{ id: string }[]>(reads.researchers);
  const directory = peekRead<DirectoryPerson[]>(reads.directory);
  if (!profiles || !directory) return undefined;
  return researcherRows(profiles, directory);
}

function seniorRows(profiles: (SeniorProfileDraft & { id: string; poolStatus?: string })[], directory: DirectoryPerson[]) {
  const byId = new Map(profiles.map((item) => [item.id, item]));
  const people = directory.filter((person) => person.role === "senior_researcher");
  const seen = new Set<string>();
  const next: SeniorRow[] = [];
  for (const person of people) {
    seen.add(person.id);
    const profileRow = byId.get(person.id);
    const fields = seniorDraftFromRecord(profileRow);
    if (!fields.name) fields.name = person.displayName || "";
    next.push({
      id: person.id,
      email: person.email || "",
      ...fields,
      poolStatus: profileRow?.poolStatus === "in_pool" ? "in_pool" : "pending",
    });
  }
  for (const profileRow of profiles) {
    if (seen.has(profileRow.id)) continue;
    const fields = seniorDraftFromRecord(profileRow);
    next.push({
      id: profileRow.id,
      email: "",
      ...fields,
      poolStatus: profileRow.poolStatus === "in_pool" ? "in_pool" : "pending",
    });
  }
  next.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, undefined, { sensitivity: "base" }));
  return next;
}

function warmSeniors() {
  const profiles = peekRead<(SeniorProfileDraft & { id: string; poolStatus?: string })[]>(reads.seniors);
  const directory = peekRead<DirectoryPerson[]>(reads.directory);
  if (!profiles || !directory) return undefined;
  return seniorRows(profiles, directory);
}

export function AdminResearchersPage() {
  const { user, profile } = useAuth();
  const warm = warmResearchers();
  const [rows, setRows] = useState<ResearcherRow[]>(() => warm ?? []);
  const [loaded, setLoaded] = useState(() => warm !== undefined);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState("");
  const [draft, setDraft] = useState<ResearcherProfileDraft>(EMPTY_RESEARCHER_PROFILE);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") return;
    Promise.all([listResearcherProfiles(), listDirectory()])
      .then(([profiles, directory]) => {
        setRows(researcherRows(profiles as { id: string }[], directory as DirectoryPerson[]));
      })
      .catch((err: unknown) => setError(userFacingError(err, "Could not load Researchers.")))
      .finally(() => setLoaded(true));
  }, [profile?.role]);

  const statuses = useMemo(() => {
    const values = new Set(rows.map((row) => row.applicantStatus.trim()).filter(Boolean));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (status !== "all" && row.applicantStatus !== status) return false;
      return matchesQuery(search, [
        row.name,
        row.email,
        row.affiliation,
        row.location,
        row.applicantStatus,
        row.bio,
        row.github,
        row.scholar,
      ]);
    });
  }, [rows, search, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = pageSlice(filtered, currentPage);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  function openEdit(row: ResearcherRow) {
    setOpenId(row.id);
    setDraft({
      name: row.name,
      affiliation: row.affiliation,
      location: row.location,
      applicantStatus: row.applicantStatus,
      bio: row.bio,
      github: row.github,
      scholar: row.scholar,
    });
    setNotice("");
    setError("");
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!openId) return;
    setBusy(openId);
    setError("");
    setNotice("");
    try {
      await saveResearcherProfile(openId, draft);
      setRows((current) =>
        current
          .map((row) => (row.id === openId ? { ...row, ...draft } : row))
          .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, undefined, { sensitivity: "base" })),
      );
      setNotice("Researcher profile saved.");
      setOpenId("");
    } catch (err) {
      setError(userFacingError(err, "Could not save this Researcher."));
    } finally {
      setBusy("");
    }
  }

  async function onDelete(row: ResearcherRow) {
    if (user?.uid === row.id) {
      setError("You cannot remove your own account from the directory.");
      return;
    }
    const label = row.name || row.email || "this Researcher";
    if (
      !window.confirm(
        `Remove ${label} from the Researcher directory? Their programme profile and role record will be deleted. Project history is kept.`,
      )
    ) {
      return;
    }
    setBusy(`delete:${row.id}`);
    setError("");
    setNotice("");
    try {
      await deleteResearcherFromDirectory(row.id);
      setRows((current) => current.filter((item) => item.id !== row.id));
      if (openId === row.id) setOpenId("");
      setNotice(`${label} removed from the Researcher directory.`);
    } catch (err) {
      setError(userFacingError(err, "Could not remove this Researcher."));
    } finally {
      setBusy("");
    }
  }

  if (profile?.role !== "admin") {
    return <div className="empty">Researcher directory management is limited to TRI AI admin.</div>;
  }
  if (error && !loaded) return <p className="error">{error}</p>;
  if (!loaded) return <Loader label="Loading Researchers" />;

  return (
    <div className="directory">
      <div className="directory-intro">
        <h2>Researchers</h2>
        <p className="quiet">Search, filter, and update Researcher profiles across the programme.</p>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      <DirectoryToolbar
        search={search}
        onSearch={setSearch}
        total={filtered.length}
        shown={visible.length}
        page={currentPage}
        pageCount={pageCount}
        onPage={setPage}
      >
        <SearchSelect
          label="Status"
          options={[
            { value: "all", label: "All statuses" },
            ...statuses.map((item) => ({ value: item, label: item })),
          ]}
          value={status}
          onChange={setStatus}
          placeholder="Status…"
        />
      </DirectoryToolbar>
      {filtered.length === 0 ? (
        <div className="empty">{rows.length === 0 ? "No Researchers yet." : "No Researchers match this search."}</div>
      ) : (
        <div className="table-wrap">
          <table className="directory-table">
            <thead>
              <tr>
                <th>Researcher</th>
                <th>Affiliation</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const open = openId === row.id;
                const deleting = busy === `delete:${row.id}`;
                return (
                  <Fragment key={row.id}>
                    <tr className={open ? "is-open" : undefined}>
                      <td>
                        <strong>{row.name || "Unnamed"}</strong>
                        <br />
                        <span className="quiet">{row.email || "No email on file"}</span>
                      </td>
                      <td>{row.affiliation || "—"}</td>
                      <td>{row.location || "—"}</td>
                      <td>{row.applicantStatus || "—"}</td>
                      <td>
                        <div className="directory-actions">
                          {open ? (
                            <CloseButton label="Close editor" className="btn-compact" disabled={busy !== ""} onClick={() => setOpenId("")} />
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ghost btn-compact"
                              disabled={busy !== ""}
                              onClick={() => openEdit(row)}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-compact"
                            disabled={busy !== "" || user?.uid === row.id}
                            onClick={() => void onDelete(row)}
                          >
                            {deleting ? "Removing…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="directory-editor-row">
                        <td colSpan={5}>
                          <form className="directory-editor fields has-dismiss" onSubmit={onSave}>
                            <CloseButton label="Close editor" className="btn-compact" disabled={busy !== ""} onClick={() => setOpenId("")} />
                            <div className="archive-head">
                              <h3>Edit Researcher</h3>
                            </div>
                            <p className="quiet">{row.email || ""}</p>
                            <ResearcherProfileFields draft={draft} onChange={setDraft} />
                            <div className="button-row">
                              <button className="btn btn-primary" type="submit" disabled={busy !== ""}>
                                {busy === openId ? "Saving…" : "Save profile"}
                              </button>
                              <button
                                className="btn btn-ghost"
                                type="button"
                                disabled={busy !== "" || user?.uid === row.id}
                                onClick={() => void onDelete(row)}
                              >
                                {deleting ? "Removing…" : "Delete Researcher"}
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminMentorsPage() {
  const { user, profile } = useAuth();
  const warm = warmSeniors();
  const [rows, setRows] = useState<SeniorRow[]>(() => warm ?? []);
  const [loaded, setLoaded] = useState(() => warm !== undefined);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [pool, setPool] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState("");
  const [draft, setDraft] = useState<SeniorProfileDraft>(EMPTY_SENIOR);
  const [draftPool, setDraftPool] = useState<"pending" | "in_pool">("pending");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") return;
    Promise.all([listSeniorProfiles(), listDirectory()])
      .then(([profiles, directory]) => {
        setRows(
          seniorRows(
            profiles as (SeniorProfileDraft & { id: string; poolStatus?: string })[],
            directory as DirectoryPerson[],
          ),
        );
      })
      .catch((err: unknown) => setError(userFacingError(err, "Could not load the Senior Researcher pool.")))
      .finally(() => setLoaded(true));
  }, [profile?.role]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (pool !== "all" && (row.poolStatus === "in_pool" ? "in_pool" : "pending") !== pool) return false;
      if (availability !== "all" && (row.availability || "available") !== availability) return false;
      return matchesQuery(search, [
        row.name,
        row.email,
        row.affiliation,
        row.currentRole,
        row.country,
        row.researchAreas,
        row.methods,
        row.publications,
        row.capacity,
        row.cadence,
      ]);
    });
  }, [rows, search, pool, availability]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = pageSlice(filtered, currentPage);

  useEffect(() => {
    setPage(1);
  }, [search, pool, availability]);

  function openEdit(row: SeniorRow) {
    setOpenId(row.id);
    setDraft(seniorDraftFromRecord(row));
    setDraftPool(row.poolStatus === "in_pool" ? "in_pool" : "pending");
    setNotice("");
    setError("");
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!openId) return;
    setBusy(openId);
    setError("");
    setNotice("");
    try {
      await saveSeniorProfile(openId, draft);
      await updateMentorPool(openId, draft.availability, draftPool);
      setRows((current) =>
        current
          .map((row) =>
            row.id === openId
              ? { ...row, ...draft, poolStatus: draftPool, availability: draft.availability }
              : row,
          )
          .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, undefined, { sensitivity: "base" })),
      );
      setNotice("Senior Researcher profile saved.");
      setOpenId("");
    } catch (err) {
      setError(userFacingError(err, "Could not save this Senior Researcher."));
    } finally {
      setBusy("");
    }
  }

  async function onDelete(row: SeniorRow) {
    if (user?.uid === row.id) {
      setError("You cannot remove your own account from the directory.");
      return;
    }
    const label = row.name || row.email || "this Senior Researcher";
    if (
      !window.confirm(
        `Remove ${label} from the Senior Researcher directory? Their programme profile and role record will be deleted. Project history is kept.`,
      )
    ) {
      return;
    }
    setBusy(`delete:${row.id}`);
    setError("");
    setNotice("");
    try {
      await deleteSeniorResearcherFromDirectory(row.id);
      setRows((current) => current.filter((item) => item.id !== row.id));
      if (openId === row.id) setOpenId("");
      setNotice(`${label} removed from the Senior Researcher directory.`);
    } catch (err) {
      setError(userFacingError(err, "Could not remove this Senior Researcher."));
    } finally {
      setBusy("");
    }
  }

  async function quickPool(row: SeniorRow, nextPool: "pending" | "in_pool") {
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, poolStatus: nextPool } : item)));
    try {
      await updateMentorPool(row.id, row.availability || "available", nextPool);
    } catch (err) {
      setError(userFacingError(err, "Could not update the Senior Researcher."));
    }
  }

  async function quickAvailability(row: SeniorRow, nextAvailability: MentorAvailability) {
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, availability: nextAvailability } : item)));
    try {
      await updateMentorPool(row.id, nextAvailability, row.poolStatus === "in_pool" ? "in_pool" : "pending");
    } catch (err) {
      setError(userFacingError(err, "Could not update the Senior Researcher."));
    }
  }

  if (profile?.role !== "admin") {
    return <div className="empty">Senior Researcher pool management is limited to TRI AI admin.</div>;
  }
  if (error && !loaded) return <p className="error">{error}</p>;
  if (!loaded) return <Loader label="Loading Senior Researchers" />;

  return (
    <div className="directory">
      <div className="directory-intro">
        <h2>Senior Researchers</h2>
        <p className="quiet">Invite people into the pool, then search profiles and update availability.</p>
      </div>
      <details className="fold">
        <summary>Invite Senior Researchers</summary>
        <div className="fold-body">
          <InviteSeniorResearchers />
        </div>
      </details>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      <DirectoryToolbar
        search={search}
        onSearch={setSearch}
        total={filtered.length}
        shown={visible.length}
        page={currentPage}
        pageCount={pageCount}
        onPage={setPage}
      >
        <SearchSelect
          label="Pool"
          options={[
            { value: "all", label: "All pool statuses" },
            { value: "pending", label: "Pending" },
            { value: "in_pool", label: "In the pool" },
          ]}
          value={pool}
          onChange={setPool}
          placeholder="Pool…"
        />
        <SearchSelect
          className="is-wide"
          label="Availability"
          options={[{ value: "all", label: "All availability" }, ...availabilityOptions]}
          value={availability}
          onChange={setAvailability}
          placeholder="Availability…"
        />
      </DirectoryToolbar>
      {filtered.length === 0 ? (
        <div className="empty">
          {rows.length === 0 ? "No Senior Researcher profiles in the pool yet." : "No Senior Researchers match this search."}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="directory-table">
            <thead>
              <tr>
                <th>Senior Researcher</th>
                <th>Expertise</th>
                <th>Capacity</th>
                <th className="col-availability">Availability</th>
                <th>Pool</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const open = openId === row.id;
                const deleting = busy === `delete:${row.id}`;
                return (
                  <Fragment key={row.id}>
                    <tr className={open ? "is-open" : undefined}>
                      <td>
                        <strong>{row.name || "Unnamed"}</strong>
                        <br />
                        <span className="quiet">{row.affiliation || "—"}</span>
                        <br />
                        <span className="quiet">{row.email || "No email on file"}</span>
                      </td>
                      <td>
                        {row.researchAreas || "—"}
                        <br />
                        <span className="quiet">{row.methods || ""}</span>
                      </td>
                      <td>{row.capacity || "—"}</td>
                      <td className="col-availability">
                        <SearchSelect
                          hideLabel
                          className="is-wide"
                          label={`Availability for ${row.name || "Senior Researcher"}`}
                          options={availabilityOptions}
                          value={row.availability || "available"}
                          onChange={(next) => void quickAvailability(row, next as MentorAvailability)}
                          placeholder="Availability…"
                        />
                      </td>
                      <td>
                        <SearchSelect
                          hideLabel
                          label={`Pool status for ${row.name || "Senior Researcher"}`}
                          options={[
                            { value: "pending", label: "Pending" },
                            { value: "in_pool", label: "In the pool" },
                          ]}
                          value={row.poolStatus === "in_pool" ? "in_pool" : "pending"}
                          onChange={(next) => void quickPool(row, next === "in_pool" ? "in_pool" : "pending")}
                          placeholder="Pool status…"
                        />
                        {row.poolStatus === "in_pool" ? (
                          <EmailSupport
                            label="Welcome email"
                            draft={seniorWelcomeEmail({
                              senior: named(row.name || "Senior Researcher", row.email || ""),
                              areas: row.researchAreas || "",
                            })}
                          />
                        ) : null}
                      </td>
                      <td>
                        <div className="directory-actions">
                          {open ? (
                            <CloseButton label="Close editor" className="btn-compact" disabled={busy !== ""} onClick={() => setOpenId("")} />
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ghost btn-compact"
                              disabled={busy !== ""}
                              onClick={() => openEdit(row)}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-compact"
                            disabled={busy !== "" || user?.uid === row.id}
                            onClick={() => void onDelete(row)}
                          >
                            {deleting ? "Removing…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="directory-editor-row">
                        <td colSpan={6}>
                          <form className="directory-editor fields has-dismiss" onSubmit={onSave}>
                            <CloseButton label="Close editor" className="btn-compact" disabled={busy !== ""} onClick={() => setOpenId("")} />
                            <div className="archive-head">
                              <h3>Edit Senior Researcher</h3>
                            </div>
                            <p className="quiet">{row.email || ""}</p>
                            <SeniorProfileFields draft={draft} onChange={setDraft} />
                            <SearchSelect
                              label="Pool status"
                              options={[
                                { value: "pending", label: "Pending" },
                                { value: "in_pool", label: "In the pool" },
                              ]}
                              value={draftPool}
                              onChange={(next) => setDraftPool(next === "in_pool" ? "in_pool" : "pending")}
                              placeholder="Pool status…"
                            />
                            <div className="button-row">
                              <button className="btn btn-primary" type="submit" disabled={busy !== ""}>
                                {busy === openId ? "Saving…" : "Save profile"}
                              </button>
                              <button
                                className="btn btn-ghost"
                                type="button"
                                disabled={busy !== "" || user?.uid === row.id}
                                onClick={() => void onDelete(row)}
                              >
                                {deleting ? "Removing…" : "Delete Senior Researcher"}
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
