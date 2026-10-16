import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { CloseIcon } from "./CloseButton";

export type SearchOption = {
  value: string;
  label: string;
  detail?: string;
  disabled?: boolean;
};

function norm(value: string) {
  return value.trim().toLocaleLowerCase();
}

function matchesQuery(option: SearchOption, needle: string) {
  if (!needle) return true;
  return (
    norm(option.label).includes(needle) ||
    norm(option.value).includes(needle) ||
    norm(option.detail ?? "").includes(needle)
  );
}

function mark(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function SearchSelect({
  label,
  hint,
  options,
  value,
  onChange,
  placeholder = "Search or choose…",
  allowCustom = false,
  required = false,
  disabled = false,
  hideLabel = false,
  clearable,
  className = "",
}: {
  label: string;
  hint?: string;
  options: SearchOption[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  required?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  clearable?: boolean;
  className?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);
  const canClear = clearable ?? (allowCustom || options.some((option) => option.value === ""));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const needle = norm(query);
  const filtered = options.filter((option) => matchesQuery(option, needle));
  const canCreate =
    allowCustom &&
    Boolean(query.trim()) &&
    !options.some((option) => norm(option.value) === needle || norm(option.label) === needle);
  const rows = canCreate
    ? [...filtered, { value: query.trim(), label: `Use “${query.trim()}”`, detail: "Custom value", disabled: false }]
    : filtered;

  useEffect(() => {
    if (!open) setQuery(selected?.label || (allowCustom ? value : "") || "");
  }, [value, selected?.label, allowCustom, open]);

  useEffect(() => {
    if (!open) return;
    if (!query.trim() && value) {
      const index = options.findIndex((option) => option.value === value && !option.disabled);
      setHighlight(index >= 0 ? index : 0);
      return;
    }
    setHighlight(0);
  }, [query, open, value, options]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  function revealList() {
    setOpen(true);
    setQuery("");
  }

  function choose(option: SearchOption) {
    if (option.disabled) return;
    const nextLabel = option.label.startsWith("Use “") ? option.value : option.label;
    onChange(option.value);
    setQuery(nextLabel);
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) revealList();
      else if (rows.length > 0) setHighlight((current) => (current + 1) % rows.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) revealList();
      else if (rows.length > 0) setHighlight((current) => (current - 1 + rows.length) % rows.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!open) {
        revealList();
        return;
      }
      if (rows[highlight]) choose(rows[highlight]);
    }
  }

  const inputId = `${listId}-input`;
  const displayValue = selected?.label || value;

  return (
    <div className={`search-field ${className}`.trim()}>
      {hideLabel ? (
        <label className="visually-hidden" htmlFor={inputId}>
          {label}
        </label>
      ) : (
        <label htmlFor={inputId}>{label}</label>
      )}
      {!hideLabel && hint ? <span className="hint">{hint}</span> : null}
      <div className="person-combobox" ref={rootRef}>
        <span className="person-search-label">
          <input
            id={inputId}
            ref={inputRef}
            className={canClear && value ? "person-search has-clear" : "person-search"}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open ? `${listId}-${highlight}` : undefined}
            placeholder={displayValue || placeholder}
            value={open ? query : displayValue}
            required={required && !value}
            disabled={disabled}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => revealList()}
            onClick={() => {
              if (!open) revealList();
            }}
            onKeyDown={onKey}
          />
          {canClear && value ? (
            <button className="person-search-clear" type="button" aria-label={`Clear ${label}`} onClick={clear}>
              <CloseIcon />
            </button>
          ) : null}
        </span>
        {open && !disabled ? (
          <div className="person-menu" id={listId} role="listbox" aria-label={label}>
            {rows.length === 0 ? <p className="person-menu-empty">No matches.</p> : null}
            {rows.map((option, index) => (
              <button
                key={`${option.value}:${index}`}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={highlight === index || option.value === value}
                disabled={option.disabled}
                className={highlight === index ? "person-menu-item is-active" : "person-menu-item"}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(option)}
              >
                <strong>{option.label}</strong>
                {option.detail ? <span className="quiet">{option.detail}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SearchMultiSelect({
  legend,
  hint,
  options,
  values,
  onChange,
  placeholder = "Search and add…",
  allowCustom = false,
}: {
  legend: string;
  hint?: string;
  options: SearchOption[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const selected = new Set(values);
  const available = options.filter((option) => !selected.has(option.value));
  const needle = norm(query);
  const filtered = available.filter((option) => matchesQuery(option, needle));
  const canCreate =
    allowCustom &&
    Boolean(query.trim()) &&
    !options.some((option) => norm(option.value) === needle || norm(option.label) === needle) &&
    !selected.has(query.trim());
  const rows = canCreate
    ? [...filtered, { value: query.trim(), label: `Add “${query.trim()}”`, detail: "Custom value" }]
    : filtered;

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

  function add(option: SearchOption) {
    if (option.disabled || selected.has(option.value)) return;
    onChange([...values, option.value]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function remove(value: string) {
    onChange(values.filter((item) => item !== value));
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Backspace" && !query && values.length > 0) {
      remove(values[values.length - 1]);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (rows.length === 0) return;
      setHighlight((current) => (current + 1) % rows.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (rows.length === 0) return;
      setHighlight((current) => (current - 1 + rows.length) % rows.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (rows[highlight]) add(rows[highlight]);
    }
  }

  return (
    <fieldset className="guest-list person-picker">
      <legend>{legend}</legend>
      {hint ? <p className="quiet">{hint}</p> : null}
      {values.length > 0 ? (
        <ul className="person-chips" aria-label={`Selected ${legend.toLowerCase()}`}>
          {values.map((value) => {
            const option = options.find((item) => item.value === value);
            const label = option?.label || value;
            return (
              <li key={value}>
                <span className={option ? "person-chip" : "person-chip is-new"}>
                  <span className="person-chip-mark" aria-hidden="true">
                    {mark(label)}
                  </span>
                  <span className="person-chip-copy">
                    <strong>{label}</strong>
                    {option?.detail ? <span className="quiet">{option.detail}</span> : null}
                  </span>
                  {!option ? <span className="person-chip-tag">New</span> : null}
                  <button
                    className="person-chip-remove"
                    type="button"
                    aria-label={`Remove ${label}`}
                    onClick={() => remove(value)}
                  >
                    <CloseIcon />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="quiet person-picker-empty">Nothing chosen yet.</p>
      )}
      <div className="person-combobox" ref={rootRef}>
        <label className="person-search-label">
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
            placeholder={placeholder}
            value={query}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={onKey}
          />
          {query ? (
            <button
              className="person-search-clear"
              type="button"
              aria-label={`Clear ${legend} search`}
              onClick={() => {
                setQuery("");
                setOpen(true);
                inputRef.current?.focus();
              }}
            >
              <CloseIcon />
            </button>
          ) : null}
        </label>
        {open ? (
          <div className="person-menu" id={listId} role="listbox" aria-label={legend}>
            {rows.length === 0 ? (
              <p className="person-menu-empty">
                {available.length === 0 ? "Everything available is already added." : "No matches."}
              </p>
            ) : null}
            {rows.map((option, index) => (
              <button
                key={`${option.value}:${index}`}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={highlight === index}
                disabled={option.disabled}
                className={
                  highlight === index
                    ? option.detail === "Custom value"
                      ? "person-menu-item is-active is-invite"
                      : "person-menu-item is-active"
                    : option.detail === "Custom value"
                      ? "person-menu-item is-invite"
                      : "person-menu-item"
                }
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => add(option)}
              >
                <strong>{option.label}</strong>
                {option.detail ? <span className="quiet">{option.detail}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

export function optionsFrom(values: readonly string[]): SearchOption[] {
  return values.map((value) => ({ value, label: value }));
}

export function parseJoined(value: string) {
  return value
    .split(/[;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinValues(values: string[]) {
  return values.join("; ");
}
