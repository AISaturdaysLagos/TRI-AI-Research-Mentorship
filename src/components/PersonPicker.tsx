import { FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { CloseButton, CloseIcon } from "./CloseButton";
import { userFacingError } from "../lib/errors";
import { inviteGuests } from "../lib/records";

export type PersonOption = { name: string; email: string };

function emailKey(value: string) {
  return value.trim().toLowerCase();
}

function samePerson(left: PersonOption, right: PersonOption) {
  return emailKey(left.email) === emailKey(right.email) && Boolean(emailKey(left.email));
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function mergePersonOptions(rows: PersonOption[]) {
  const byEmail = new Map<string, PersonOption>();
  for (const row of rows) {
    const email = emailKey(row.email);
    if (!email) continue;
    const name = row.name.trim();
    const current = byEmail.get(email);
    if (!current) {
      byEmail.set(email, { name: name || email, email });
      continue;
    }
    if (name && (current.name === current.email || !current.name.trim())) {
      byEmail.set(email, { name, email });
    }
  }
  return [...byEmail.values()].sort((left, right) => left.name.localeCompare(right.name) || left.email.localeCompare(right.email));
}

export function PersonPicker({
  legend,
  options,
  people,
  onChange,
  allowNew = true,
  hint,
}: {
  legend: string;
  options: PersonOption[];
  people: PersonOption[];
  onChange: (people: PersonOption[]) => void;
  allowNew?: boolean;
  hint?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState<PersonOption>({ name: "", email: "" });
  const [inviteError, setInviteError] = useState("");

  const known = mergePersonOptions(options);
  const knownEmails = new Set(known.map((person) => emailKey(person.email)));
  const selectedKeys = new Set(people.map((person) => emailKey(person.email)).filter(Boolean));
  const chosen = people.filter((person) => emailKey(person.email) || person.name.trim());
  const available = known.filter((person) => !selectedKeys.has(emailKey(person.email)));
  const needle = query.trim().toLocaleLowerCase();
  const matches = available.filter((person) => {
    if (!needle) return true;
    return person.name.toLocaleLowerCase().includes(needle) || person.email.toLocaleLowerCase().includes(needle);
  });
  const showInviteInMenu = allowNew && needle.length > 0 && matches.every((person) => emailKey(person.email) !== needle);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  function addPerson(person: PersonOption) {
    if (!person.email.trim()) return;
    if (selectedKeys.has(emailKey(person.email))) return;
    onChange([...chosen, { name: person.name.trim() || person.email.trim(), email: emailKey(person.email) }]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function removePerson(person: PersonOption) {
    onChange(chosen.filter((item) => !samePerson(item, person)));
  }

  function startInvite(prefill = "") {
    const looksEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prefill.trim());
    setInvite(
      looksEmail
        ? { name: "", email: prefill.trim().toLowerCase() }
        : { name: prefill.trim(), email: "" },
    );
    setInviteError("");
    setInviteOpen(true);
    setOpen(false);
    setQuery("");
  }

  function confirmInvite() {
    setInviteError("");
    try {
      const [guest] = inviteGuests([invite]);
      if (!guest) {
        setInviteError("Add a name and an email address.");
        return;
      }
      if (selectedKeys.has(guest.email)) {
        setInviteError("That person is already added.");
        return;
      }
      onChange([...chosen, guest]);
      setInvite({ name: "", email: "" });
      setInviteOpen(false);
      inputRef.current?.focus();
    } catch (err) {
      setInviteError(userFacingError(err, "Add a name and an email address."));
    }
  }

  function onSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      const total = matches.length + (showInviteInMenu ? 1 : 0);
      if (total === 0) return;
      setHighlight((current) => (current + 1) % total);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const total = matches.length + (showInviteInMenu ? 1 : 0);
      if (total === 0) return;
      setHighlight((current) => (current - 1 + total) % total);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (highlight < matches.length) {
        addPerson(matches[highlight]);
        return;
      }
      if (showInviteInMenu) startInvite(query);
    }
  }

  return (
    <fieldset className="guest-list person-picker">
      <legend>{legend}</legend>
      {hint ? <p className="quiet">{hint}</p> : null}

      {chosen.length > 0 ? (
        <ul className="person-chips" aria-label={`Selected ${legend.toLowerCase()}`}>
          {chosen.map((person) => {
            const knownPerson = knownEmails.has(emailKey(person.email));
            return (
              <li key={emailKey(person.email) || person.name}>
                <span className={knownPerson ? "person-chip" : "person-chip is-new"}>
                  <span className="person-chip-mark" aria-hidden="true">
                    {initials(person.name || person.email)}
                  </span>
                  <span className="person-chip-copy">
                    <strong>{person.name || person.email}</strong>
                    {person.email ? <span className="quiet">{person.email}</span> : null}
                  </span>
                  {!knownPerson ? <span className="person-chip-tag">New</span> : null}
                  <button
                    className="person-chip-remove"
                    type="button"
                    aria-label={`Remove ${person.name || person.email}`}
                    onClick={() => removePerson(person)}
                  >
                    <CloseIcon />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="quiet person-picker-empty">No one chosen yet.</p>
      )}

      <div className="search-field person-combobox" ref={rootRef}>
        <span className="person-search-label">
          <span className="visually-hidden">Search {legend.toLowerCase()}</span>
          <input
            ref={inputRef}
            className={query ? "person-search has-clear" : "person-search"}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open ? `${listId}-${highlight}` : undefined}
            placeholder={known.length > 0 ? "Search by name or email…" : "No one on the programme yet for this role"}
            value={query}
            disabled={known.length === 0 && !allowNew}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={onSearchKey}
          />
          {query ? (
            <button
              className="person-search-clear"
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setOpen(true);
                inputRef.current?.focus();
              }}
            >
              <CloseIcon />
            </button>
          ) : null}
        </span>

        {open ? (
          <div className="person-menu" id={listId} role="listbox" aria-label={legend}>
            {matches.length === 0 && !showInviteInMenu ? (
              <p className="person-menu-empty">
                {available.length === 0
                  ? known.length === 0
                    ? "No one is on the programme yet for this role."
                    : "Everyone available is already added."
                  : "No match. Try another name, or invite someone new."}
              </p>
            ) : null}
            {matches.map((person, index) => (
              <button
                key={emailKey(person.email)}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={highlight === index}
                className={highlight === index ? "person-menu-item is-active" : "person-menu-item"}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => addPerson(person)}
              >
                <strong>{person.name}</strong>
                <span className="quiet">{person.email}</span>
              </button>
            ))}
            {showInviteInMenu ? (
              <button
                id={`${listId}-${matches.length}`}
                type="button"
                role="option"
                aria-selected={highlight === matches.length}
                className={highlight === matches.length ? "person-menu-item is-active is-invite" : "person-menu-item is-invite"}
                onMouseEnter={() => setHighlight(matches.length)}
                onClick={() => startInvite(query)}
              >
                <strong>Invite “{query.trim()}”</strong>
                <span className="quiet">Add someone new by name and email</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {allowNew ? (
        inviteOpen ? (
          <div className="person-invite has-dismiss">
            <CloseButton
              label="Close invite"
              className="btn-compact"
              onClick={() => {
                setInviteOpen(false);
                setInviteError("");
              }}
            />
            <p className="quiet">Invite someone who is not on the programme yet.</p>
            <div className="guest-row">
              <label>
                Name
                <input
                  value={invite.name}
                  autoFocus
                  onChange={(event) => setInvite({ ...invite, name: event.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={invite.email}
                  onChange={(event) => setInvite({ ...invite, email: event.target.value })}
                />
              </label>
            </div>
            {inviteError ? <p className="error">{inviteError}</p> : null}
            <div className="button-row">
              <button className="btn btn-primary btn-compact" type="button" onClick={confirmInvite}>
                Add to list
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost btn-compact" type="button" onClick={() => startInvite(query)}>
            Invite someone new
          </button>
        )
      ) : null}
    </fieldset>
  );
}

export function PersonInviteForm({
  legend,
  options,
  busy,
  onSubmit,
  hint,
}: {
  legend: string;
  options: PersonOption[];
  busy: boolean;
  onSubmit: (people: PersonOption[]) => Promise<void>;
  hint?: string;
}) {
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const guests = inviteGuests(people);
      if (guests.length === 0) {
        setError("Choose someone, or invite someone new.");
        return;
      }
      await onSubmit(guests);
      setPeople([]);
    } catch (err) {
      setError(userFacingError(err, "Could not prepare the invite."));
    }
  }

  return (
    <form className="fields" onSubmit={(event) => void submit(event)}>
      <PersonPicker legend={legend} options={options} people={people} onChange={setPeople} hint={hint} />
      {error ? <p className="error">{error}</p> : null}
      <button className="btn btn-primary btn-compact" type="submit" disabled={busy}>
        Prepare invite
      </button>
    </form>
  );
}
