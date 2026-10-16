import { useMemo } from "react";
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
import { SearchSelect } from "./SearchSelect";

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
  const zones = useMemo(() => listTimeZones(), []);
  const featured = useMemo(() => {
    const pool = featuredZones();
    return [PROGRAMME_ZONE, ...pool.filter((zone) => zone !== PROGRAMME_ZONE), ...zones.filter((zone) => zone !== PROGRAMME_ZONE && !pool.includes(zone))];
  }, [zones]);

  return (
    <SearchSelect
      label={label}
      options={featured.map((zone) => ({ value: zone, label: zoneLabel(zone), detail: zone }))}
      value={value}
      onChange={onChange}
      placeholder="Search time zones…"
    />
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
        <SearchSelect
          label="Start"
          options={startOptions.map((time) => ({ value: time, label: formatClock(time) }))}
          value={value.start}
          onChange={(start) => onChange(withStart(value, start))}
          placeholder="Start time…"
        />
        <SearchSelect
          label="End"
          options={endOptions.map((time) => ({ value: time, label: formatClock(time) }))}
          value={value.end}
          onChange={(end) => onChange({ ...value, end })}
          placeholder="End time…"
        />
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
