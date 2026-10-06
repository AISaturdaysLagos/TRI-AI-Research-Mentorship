import { FormEvent, useEffect, useState, type ComponentType } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { workspacePath, type SelfServeRole } from "../types/domain";

function LocalFixtures() {
  const [Panel, setPanel] = useState<ComponentType | null>(null);
  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_FIXTURES !== "true") return;
    void import("../fixtures/FixtureSignIn").then((mod) => setPanel(() => mod.FixtureSignIn));
  }, []);
  if (!Panel) return null;
  return <Panel />;
}

function nextPath(value: string | null) {
  if (!value || !value.startsWith("/join/") || value.includes("//")) return "/dashboard";
  return value;
}

export function LoginPage() {
  const [params] = useSearchParams();
  const next = nextPath(params.get("next"));
  const requestedRole = params.get("role");
  const { configured, user, profile, signInWithGoogle, signInWithPassword, registerWithPassword, chooseRole } =
    useAuth();
  const [mode, setMode] = useState<"sign-in" | "create">(params.get("mode") === "create" ? "create" : "sign-in");
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(params.get("name") || "");
  const [role, setRole] = useState<SelfServeRole>(
    requestedRole === "senior_researcher" ? "senior_researcher" : "researcher",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || profile) return;
    setName((current) => current || user.displayName || "");
  }, [profile, user]);

  if (user && profile) {
    const destination = next.startsWith("/join/") ? next : workspacePath(profile.role);
    return <Navigate to={destination} replace />;
  }

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
          <h1>{user && !profile ? "Choose how you are joining." : "Sign in."}</h1>
        </div>
      </header>
      <section className="section-tight">
        <div className="container" style={{ maxWidth: 640 }}>
          {!configured ? (
            <div className="notice">Sign-in is unavailable.</div>
          ) : null}

          {user && !profile ? (
            <form className="fields" onSubmit={onRole}>
              <label>
                Name
                <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <div className="role-pick">
                <button
                  type="button"
                  className={role === "researcher" ? "is-selected" : ""}
                  onClick={() => setRole("researcher")}
                >
                  <strong>Researcher</strong>
                  <p className="quiet">
                    {next.startsWith("/join/") ? "Then you return to the invite." : "Submit a proposal or open an award."}
                  </p>
                </button>
                <button
                  type="button"
                  className={role === "senior_researcher" ? "is-selected" : ""}
                  onClick={() => setRole("senior_researcher")}
                >
                  <strong>Senior Researcher</strong>
                  <p className="quiet">
                    {next.startsWith("/join/") ? "Then you return to the invite." : "Join the Senior Researcher pool."}
                  </p>
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
                {mode === "create" ? <span className="hint">At least 6 characters.</span> : null}
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
                className="btn btn-ghost btn-compact"
                onClick={() => setMode(mode === "create" ? "sign-in" : "create")}
              >
                {mode === "create" ? "I already have an account" : "Create an account"}
              </button>
              <p>
                Looking for the public programme? <Link className="btn btn-ghost btn-compact" to="/">Return home</Link>.
              </p>
              {import.meta.env.VITE_ENABLE_FIXTURES === "true" ? <LocalFixtures /> : null}
            </form>
          )}
        </div>
      </section>
    </article>
  );
}
