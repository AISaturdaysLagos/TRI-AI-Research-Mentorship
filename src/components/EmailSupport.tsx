import { useState } from "react";
import { openLocalEmail, type EmailDraft } from "../lib/email";

function line(people: EmailDraft["to"]) {
  if (people.length === 0) return "Add the address in your email app.";
  return people
    .map((person) => (person.email ? `${person.name || person.email} <${person.email}>` : person.name || "Address missing"))
    .join(", ");
}

export function EmailSupport({ draft }: { draft: EmailDraft | null }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  if (!draft) return null;
  return (
    <div className="email-support">
      <p className="mono">Email</p>
      <p>
        <strong>To</strong> {line(draft.to)}
      </p>
      {draft.cc.length > 0 ? (
        <p>
          <strong>Cc</strong> {line(draft.cc)}
        </p>
      ) : null}
      <p>
        <strong>Subject</strong> {draft.subject}
      </p>
      {draft.attachments.length > 0 ? (
        <p className="quiet">Attached: {draft.attachments.map((file) => file.filename).join(", ")}</p>
      ) : null}
      <details>
        <summary>Message</summary>
        <pre>{draft.body}</pre>
      </details>
      <button
        className="btn btn-primary"
        type="button"
        onClick={() => {
          setError("");
          setNote("");
          void openLocalEmail(draft)
            .then((kind) => {
              setNote(
                kind === "attachment"
                  ? "The draft is downloaded. Open it in your email app."
                  : "Your email app is opening this draft.",
              );
            })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Could not open the email.");
            });
        }}
      >
        Open in email
      </button>
      {note ? <p className="quiet">{note}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
