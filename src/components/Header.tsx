import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { roleLabel, workspacePath } from "../types/domain";
import { CloseIcon } from "./CloseButton";
import { Icon, type IconName } from "./Icon";
import { Wordmark } from "./Wordmark";

const links: { to: string; label: string; icon: IconName; primary?: boolean }[] = [
  { to: "/how-it-works", label: "How It Works", icon: "path", primary: true },
  { to: "/researchers", label: "For Researchers", icon: "researcher", primary: true },
  { to: "/senior-researchers", label: "For Senior Researchers", icon: "senior", primary: true },
  { to: "/research", label: "Research Projects", icon: "projects", primary: true },
  { to: "/about", label: "About TRI AI Research", icon: "about" },
];

function themeNext(current: string | null) {
  if (current === "dark") return "light";
  if (current === "light") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark";
}

export function Header() {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setAccountOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

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
          {links.filter((link) => link.primary).map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? "hdr-link is-active" : "hdr-link")}
            >
              <Icon name={link.icon} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="hdr-actions">
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label="Toggle color theme">
            <Icon name="theme" />
          </button>
          {user ? (
            <>
              <NavLink to={profile ? workspacePath(profile.role) : "/dashboard"} className="hdr-link">
                <Icon name="dashboard" />
                {profile ? "Dashboard" : "Continue"}
              </NavLink>
              <div className="account-menu" ref={menuRef}>
                <button
                  className="btn btn-ghost btn-compact hdr-cta"
                  type="button"
                  aria-expanded={accountOpen}
                  aria-controls="account-panel"
                  onClick={() => setAccountOpen((value) => !value)}
                >
                  <Icon name="account" />
                  Account
                </button>
                {accountOpen ? (
                  <div className="account-panel" id="account-panel">
                    <p className="mono">Account</p>
                    <p className="account-name">{profile?.displayName || user.email}</p>
                    <p className="quiet">{user.email}</p>
                    {profile ? <p className="quiet">{roleLabel(profile.role)}</p> : null}
                    <NavLink className="btn btn-primary btn-compact" to="/account" onClick={() => setAccountOpen(false)}>
                      <Icon name="account" />
                      View and edit profile
                    </NavLink>
                    <button className="btn btn-ghost btn-compact" type="button" onClick={() => void logout()}>
                      <Icon name="sign-out" />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className="hdr-link">
                <Icon name="sign-in" />
                Sign in
              </NavLink>
              <NavLink to="/apply/researcher" className="btn btn-primary hdr-cta desktop-only">
                <Icon name="apply" />
                Apply as a Researcher
              </NavLink>
            </>
          )}
          <button
            className={open ? "hdr-burger is-open" : "hdr-burger"}
            type="button"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <CloseIcon /> : (
              <>
                <span />
                <span />
              </>
            )}
          </button>
        </div>
      </div>
      {open ? (
        <div className="hdr-drawer">
          <nav className="drawer-nav" aria-label="Menu">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className="drawer-link" onClick={() => setOpen(false)}>
                <Icon name={link.icon} />
                {link.label}
              </NavLink>
            ))}
            <NavLink
              to={user ? (profile ? workspacePath(profile.role) : "/dashboard") : "/login"}
              className="drawer-link"
              onClick={() => setOpen(false)}
            >
              <Icon name={user ? "dashboard" : "sign-in"} />
              {user ? "Dashboard" : "Sign in"}
            </NavLink>
            {user ? (
              <NavLink to="/account" className="drawer-link" onClick={() => setOpen(false)}>
                <Icon name="account" />
                Account settings
              </NavLink>
            ) : null}
            <NavLink to="/apply/researcher" className="drawer-link" onClick={() => setOpen(false)}>
              <Icon name="apply" />
              Apply as a Researcher
            </NavLink>
            {user ? (
              <button className="drawer-link" type="button" onClick={() => void logout()}>
                <Icon name="sign-out" />
                Sign out
              </button>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
