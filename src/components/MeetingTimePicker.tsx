import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  PROGRAMME_ZONE,
  featuredZones,
  formatClock,
  formatZonedSpan,
  listTimeZones,
  quarterHours,
  zoneClockName,
  zoneLabel,
  zonedDateAndTime,
  zonedWallTime,
} from "../lib/timezones";

export type TimeChoice = {
  date: string;
  start: string;
  end: string;
  zone: string;
};

export function TimezoneField({
  value,
  onChange,
  label = "Time zone",
}: {
  value: string;
  onChange: (zone: string) => void;
  label?: string;
}) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const zones = useMemo(() => listTimeZones(), []);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = needle
      ? zones.filter((zone) => zone.toLowerCase().includes(needle) || zoneLabel(zone).toLowerCase().includes(needle))
      : featuredZones();
    return [PROGRAMME_ZONE, ...pool.filter((zone) => zone !== PROGRAMME_ZONE)].slice(0, 14);
  }, [query, zones]);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="zone-field" ref={root}>
      <span>{label}</span>
      <button className="zone-current" type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((current) => !current)}>
        {zoneLabel(value)}
      </button>
      {open ? (
        <div className="zone-menu" id={listId}>
          <input
            aria-label="Search time zones"
            value={query}
            placeholder="Search time zones"
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul>
            {shown.map((zone) => (
              <li key={zone}>
                <button
                  type="button"
                  aria-pressed={zone === value}
                  onClick={() => {
                    onChange(zone);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {zoneLabel(zone)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function MeetingClocks({
  start,
  end,
  people,
}: {
  start: Date | null;
  end: Date | null;
  people: { name: string; zone: string }[];
}) {
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return (
    <ul className="zone-clocks">
      {people.map((person, index) => (
        <li key={`${person.name}-${person.zone}-${index}`}>
          <span>{person.name}</span>
          <span className="quiet">{zoneClockName(person.zone, start)}</span>
          <span>{formatZonedSpan(start, end, person.zone)}</span>
        </li>
      ))}
    </ul>
  );
}

export function MeetingTimePicker({
  value,
  onChange,
  people,
  resetOnDate = false,
  preserveInstantOnZone = false,
}: {
  value: TimeChoice;
  onChange: (next: TimeChoice) => void;
  people: { name: string; zone: string }[];
  resetOnDate?: boolean;
  preserveInstantOnZone?: boolean;
}) {
  const slots = quarterHours();
  const startOptions = slots.includes(value.start) ? slots : [value.start, ...slots];
  const endOptions = slots.includes(value.end) ? slots : [value.end, ...slots];
  const start = zonedWallTime(value.date, value.start, value.zone);
  const end = zonedWallTime(value.date, value.end, value.zone);
  const clocks = [{ name: "Programme", zone: PROGRAMME_ZONE }, ...people];

  function chooseZone(zone: string) {
    if (!preserveInstantOnZone || zone === value.zone) {
      onChange({ ...value, zone });
      return;
    }
    const currentStart = zonedWallTime(value.date, value.start, value.zone);
    const currentEnd = zonedWallTime(value.date, value.end, value.zone);
    const nextStart = zonedDateAndTime(currentStart, zone);
    const nextEnd = zonedDateAndTime(currentEnd, zone);
    if (nextStart.date !== value.date || nextEnd.date !== value.date) {
      onChange({ ...value, zone, start: nearestSlot(nextStart.time), end: nearestSlot(nextStart.time) });
      return;
    }
    onChange({
      zone,
      date: value.date,
      start: nearestSlot(nextStart.time),
      end: nearestSlot(nextEnd.time),
    });
  }

  return (
    <div className="time-picker">
      <TimezoneField value={value.zone} onChange={chooseZone} />
      <div className="time-picker-when">
        <label>
          Date
          <input
            type="date"
            value={value.date}
            required
            onChange={(event) =>
              onChange(
                resetOnDate
                  ? { ...value, date: event.target.value, start: "16:00", end: "17:00" }
                  : { ...value, date: event.target.value },
              )
            }
          />
        </label>
        <label>
          Start
          <select value={value.start} onChange={(event) => onChange(withStart(value, event.target.value))}>
            {startOptions.map((time) => (
              <option key={time} value={time}>
                {formatClock(time)}
              </option>
            ))}
          </select>
        </label>
        <label>
          End
          <select value={value.end} onChange={(event) => onChange({ ...value, end: event.target.value })}>
            {endOptions.map((time) => (
              <option key={time} value={time}>
                {formatClock(time)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <p className="quiet">The same time for everyone on this meeting.</p>
        <MeetingClocks start={start} end={end} people={clocks} />
      </div>
    </div>
  );
}

function withStart(value: TimeChoice, start: string): TimeChoice {
  const [hour, minute] = start.split(":").map(Number);
  const total = hour * 60 + minute + 60;
  if (start < value.end || total >= 24 * 60) return { ...value, start };
  const end = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  return { ...value, start, end };
}

function nearestSlot(time: string) {
  const slots = quarterHours();
  if (slots.includes(time)) return time;
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute;
  const rounded = Math.round(total / 15) * 15;
  const next = slots.find((slot) => {
    const [slotHour, slotMinute] = slot.split(":").map(Number);
    return slotHour * 60 + slotMinute >= rounded;
  });
  return next ?? slots[slots.length - 1];
}
