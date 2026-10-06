import { useEffect, useMemo, useState, type ReactNode } from "react";
import { watDateAndTime } from "../lib/calendar";
import { meetingDate, type MeetingRow } from "../lib/meetings";
import { formatClock } from "../lib/timezones";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function watParts(value: Date) {
  const parts = watDateAndTime(value);
  const [year, month, day] = parts.date.split("-").map(Number);
  return { year, month, day, date: parts.date, time: parts.time };
}

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shiftMonth(year: number, month: number, delta: number) {
  const next = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
}

function meetingDay(meeting: MeetingRow) {
  const start = meetingDate(meeting.startsAt);
  return start ? watParts(start) : null;
}

export function MeetingSchedule({
  meetings,
  list,
  renderMeeting,
}: {
  meetings: MeetingRow[];
  list: ReactNode;
  renderMeeting: (meeting: MeetingRow) => ReactNode;
}) {
  const today = watParts(new Date());
  const soonest = meetings
    .map((meeting) => meetingDay(meeting))
    .filter((day): day is NonNullable<typeof day> => Boolean(day))
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const opening = soonest ?? today;
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [cursor, setCursor] = useState({ year: opening.year, month: opening.month });
  const [selectedDate, setSelectedDate] = useState(opening.date);
  const [chosen, setChosen] = useState(false);
  const soonestKey = soonest ? `${soonest.year}-${soonest.month}-${soonest.date}` : "";

  useEffect(() => {
    if (chosen || !soonestKey || !soonest) return;
    setSelectedDate(soonest.date);
    setCursor((current) =>
      current.year === soonest.year && current.month === soonest.month ? current : { year: soonest.year, month: soonest.month },
    );
  }, [chosen, soonest, soonestKey]);

  const byDay = useMemo(() => {
    const groups = new Map<string, MeetingRow[]>();
    for (const meeting of meetings) {
      const day = meetingDay(meeting);
      if (!day) continue;
      const rows = groups.get(day.date) ?? [];
      rows.push(meeting);
      groups.set(day.date, rows);
    }
    for (const rows of groups.values()) {
      rows.sort((a, b) => (meetingDate(a.startsAt)?.getTime() ?? 0) - (meetingDate(b.startsAt)?.getTime() ?? 0));
    }
    return groups;
  }, [meetings]);

  const cells = useMemo(() => {
    const count = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
    const lead = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay();
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: count }, (_, index) => {
        const day = index + 1;
        const date = [
          cursor.year,
          String(cursor.month).padStart(2, "0"),
          String(day).padStart(2, "0"),
        ].join("-");
        return { day, date };
      }),
    ];
  }, [cursor]);

  const selected = byDay.get(selectedDate) ?? [];
  const selectedLabel = new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <div className="meeting-schedule">
      <div className="meeting-view" role="group" aria-label="How to view scheduled meetings">
        <button
          className={view === "calendar" ? "btn btn-primary btn-compact" : "btn btn-ghost btn-compact"}
          type="button"
          aria-pressed={view === "calendar"}
          onClick={() => setView("calendar")}
        >
          Calendar
        </button>
        <button
          className={view === "list" ? "btn btn-primary btn-compact" : "btn btn-ghost btn-compact"}
          type="button"
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
        >
          List
        </button>
      </div>
      {view === "list" ? (
        list
      ) : (
        <>
          <div className="meeting-month">
            <button
              className="btn btn-ghost btn-compact"
              type="button"
              aria-label="Previous month"
              onClick={() => setCursor((value) => shiftMonth(value.year, value.month, -1))}
            >
              Previous
            </button>
            <h3>{monthLabel(cursor.year, cursor.month)}</h3>
            <button
              className="btn btn-ghost btn-compact"
              type="button"
              aria-label="Next month"
              onClick={() => setCursor((value) => shiftMonth(value.year, value.month, 1))}
            >
              Next
            </button>
          </div>
          <p className="quiet">Times are WAT.</p>
          <div className="meeting-cal" role="grid" aria-label={`${monthLabel(cursor.year, cursor.month)}, West Africa Time`}>
            {WEEKDAYS.map((day) => (
              <div className="meeting-cal-head" key={day} role="columnheader">
                {day}
              </div>
            ))}
            {cells.map((cell, index) =>
              cell ? (
                <div
                  key={cell.date}
                  className={[
                    "meeting-day",
                    cell.date === today.date ? "is-today" : "",
                    selectedDate === cell.date ? "is-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role="gridcell"
                >
                  <button
                    className="meeting-day-num"
                    type="button"
                    aria-label={`${cell.day} ${monthLabel(cursor.year, cursor.month)}`}
                    onClick={() => {
                      setChosen(true);
                      setSelectedDate(cell.date);
                    }}
                  >
                    {cell.day}
                  </button>
                  {(byDay.get(cell.date) ?? []).map((meeting) => {
                    const start = meetingDate(meeting.startsAt);
                    const time = start ? formatClock(watDateAndTime(start).time) : "";
                    return (
                      <button
                        key={meeting.id}
                        className={meeting.kind === "project" ? "meeting-chip is-project" : "meeting-chip"}
                        type="button"
                        onClick={() => {
                          setChosen(true);
                          setSelectedDate(cell.date);
                        }}
                      >
                        <span>{time}</span> {meeting.title || "Meeting"}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="meeting-day is-empty" key={`empty-${index}`} role="gridcell" />
              ),
            )}
          </div>
          <h3 style={{ marginTop: 20 }}>{selectedLabel}</h3>
          {selected.length === 0 ? <div className="empty">No meeting is scheduled on this day.</div> : null}
          {selected.map((meeting) => (
            <div key={meeting.id}>{renderMeeting(meeting)}</div>
          ))}
        </>
      )}
    </div>
  );
}
