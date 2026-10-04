import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Wordmark } from "./Wordmark";

const links = [
  { to: "/how-it-works", label: "How It Works" },
  { to: "/researchers", label: "For Researchers" },
  { to: "/senior-researchers", label: "For Senior Researchers" },
  { to: "/research", label: "Research Projects" },
  { to: "/about", label: "About TRI AI Research" },
];

function themeNext(current: string | null) {
  if (current === "dark") return "light";
  if (current === "light") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark";
}

export function Header() {
  const { user, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);

  function toggleTheme() {
    const next = themeNext(document.documentElement.getAttribute("data-theme"));
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("triai-theme", next);
  }

  return (
    <header className="hdr">
      <div className="container hdr-inner">
        <NavLink to="/" end aria-label="TRI AI Research home" onClick={() => setOpen(false)}>
          <Wordmark />
        </NavLink>
        <nav className="hdr-nav" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? "hdr-link is-active" : "hdr-link")}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="hdr-actions">
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label="Toggle color theme">
            ◐
          </button>
          {user ? (
            <>
              <NavLink to="/dashboard" className="hdr-link">
                {profile ? "Dashboard" : "Continue"}
              </NavLink>
              <button className="btn btn-ghost hdr-cta desktop-only" type="button" onClick={() => void logout()}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="hdr-link">
                Sign in
              </NavLink>
              <NavLink to="/apply/researcher" className="btn btn-primary hdr-cta desktop-only">
                Apply as a Researcher
              </NavLink>
            </>
          )}
          <button
            className="hdr-burger"
            type="button"
            aria-expanded={open}
            aria-label="Open menu"
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
      {open ? (
        <div className="hdr-drawer">
          <nav className="drawer-nav" aria-label="Mobile">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className="drawer-link" onClick={() => setOpen(false)}>
                {link.label}
              </NavLink>
            ))}
            <NavLink to={user ? "/dashboard" : "/login"} className="drawer-link" onClick={() => setOpen(false)}>
              {user ? "Dashboard" : "Sign in"}
            </NavLink>
            <NavLink to="/apply/researcher" className="drawer-link" onClick={() => setOpen(false)}>
              Apply as a Researcher
            </NavLink>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
