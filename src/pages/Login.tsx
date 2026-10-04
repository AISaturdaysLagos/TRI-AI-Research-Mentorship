import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { SelfServeRole } from "../types/domain";

export function LoginPage() {
  const { configured, user, profile, signInWithGoogle, signInWithPassword, registerWithPassword, chooseRole } =
    useAuth();
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<SelfServeRole>("researcher");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user && profile) return <Navigate to="/dashboard" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "create") await registerWithPassword(email, password);
      else await signInWithPassword(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onRole(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await chooseRole(role, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">Sign in</p>
          <h1>{user && !profile ? "Choose how you are joining." : "Sign in to your programme record."}</h1>
          <p className="lede">
            Researchers and Senior Researchers create their own accounts with Google or email. TRI
            assigns admin and reviewer access.
          </p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container" style={{ maxWidth: 640 }}>
          {!configured ? (
            <div className="notice">
              <strong>Firebase is not configured.</strong> Add the web config from{" "}
              <code>.env.example</code> to a local <code>.env</code> file, then restart the dev
              server. The public pages still work without it.
            </div>
          ) : null}

          {user && !profile ? (
            <form className="fields" onSubmit={onRole}>
              <label>
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <div className="role-pick">
                <button
                  type="button"
                  className={role === "researcher" ? "is-selected" : ""}
                  onClick={() => setRole("researcher")}
                >
                  <strong>Researcher</strong>
                  <p className="quiet">Submit a proposal or open an award invite.</p>
                </button>
                <button
                  type="button"
                  className={role === "senior_researcher" ? "is-selected" : ""}
                  onClick={() => setRole("senior_researcher")}
                >
                  <strong>Senior Researcher</strong>
                  <p className="quiet">Join the mentor pool and respond to matches.</p>
                </button>
              </div>
              {error ? <p className="error">{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={busy || !configured}>
                Continue
              </button>
            </form>
          ) : (
            <form className="fields" onSubmit={onSubmit}>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete={mode === "create" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </label>
              {error ? <p className="error">{error}</p> : null}
              <div className="actions">
                <button className="btn btn-primary" type="submit" disabled={busy || !configured}>
                  {mode === "create" ? "Create account" : "Sign in"}
                </button>
                <button className="btn btn-ghost" type="button" disabled={busy || !configured} onClick={() => void onGoogle()}>
                  Continue with Google
                </button>
              </div>
              <button
                type="button"
                className="hdr-link"
                onClick={() => setMode(mode === "create" ? "sign-in" : "create")}
              >
                {mode === "create" ? "I already have an account" : "Create an account"}
              </button>
              <p className="quiet">
                Looking for the public programme? <Link to="/">Return home</Link>.
              </p>
            </form>
          )}
        </div>
      </section>
    </article>
  );
}
