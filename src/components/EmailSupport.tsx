import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { openLocalEmail, type EmailDraft } from "../lib/email";
import { userFacingError } from "../lib/errors";
import { useDialogFocus } from "../lib/focusTrap";
import { CloseButton } from "./CloseButton";
import { Icon, Mark } from "./Icon";

function line(people: EmailDraft["to"]) {
  if (people.length === 0) return "Add the address in your email app.";
  return people
    .map((person) => (person.email ? `${person.name || person.email} <${person.email}>` : person.name || "Address missing"))
    .join(", ");
}

export function EmailSupport({
  draft,
  label = "Email draft",
  autoOpen = false,
}: {
  draft: EmailDraft | null;
  label?: string;
  autoOpen?: boolean;
}) {
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(autoOpen);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!draft) setOpen(false);
  }, [draft]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useDialogFocus(open, panelRef, triggerRef);

  if (!draft) return null;

  return (
    <>
      <button
        ref={triggerRef}
        className="btn btn-ghost btn-compact email-support-trigger"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Icon name="email" />
        {label}
      </button>
      {open
        ? createPortal(
            <div className="email-overlay" role="presentation">
              <button
                className="email-overlay-backdrop"
                type="button"
                aria-label="Close email draft"
                tabIndex={-1}
                onClick={() => setOpen(false)}
              />
              <div
                ref={panelRef}
                className="email-overlay-panel has-dismiss"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
              >
                <CloseButton label="Close email draft" className="btn-compact" onClick={() => setOpen(false)} />
                <div className="email-support">
                  <h2 className="email-support-title" id={titleId}>
                    <Mark name="email">{label}</Mark>
                  </h2>
                  <p className="quiet email-support-hint">Review the draft, then open it in your email app.</p>
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
                  <div className="email-support-body">
                    <p className="mono">Message</p>
                    <pre>{draft.body}</pre>
                  </div>
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
                          setError(userFacingError(err, "Could not open the email."));
                        });
                    }}
                  >
                    <Icon name="email" />
                    Open in email
                  </button>
                  {note ? <p className="quiet">{note}</p> : null}
                  {error ? <p className="error">{error}</p> : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
