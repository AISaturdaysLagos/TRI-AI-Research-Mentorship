import { useState } from "react";
import { fixtureAccounts, fixturePassword } from "./accounts";
import { useAuth } from "../lib/auth";

export function FixtureSignIn() {
  const { signInWithPassword } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(email: string) {
    setError("");
    setBusy(true);
    try {
      await signInWithPassword(email, fixturePassword);
    } catch {
      setError("Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="notice">
      <p>
        <strong>Demo accounts.</strong>
      </p>
      <div className="decision-row" style={{ marginTop: 12 }}>
        {fixtureAccounts.map((account) => (
          <button
            key={account.email}
            className="btn btn-ghost"
            type="button"
            disabled={busy}
            onClick={() => void signIn(account.email)}
          >
            {account.label}
          </button>
        ))}
      </div>
      <p className="quiet" style={{ marginTop: 12 }}>
        Shared password: {fixturePassword}.
      </p>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
