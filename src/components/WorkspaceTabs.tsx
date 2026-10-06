import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Icon, type IconName } from "./Icon";

export function WorkspaceTabs({ current }: { current: "projects" | "records" | "meetings" }) {
  const { profile } = useAuth();
  if (!profile || (profile.role !== "researcher" && profile.role !== "senior_researcher")) return null;
  const records = profile.role === "senior_researcher" ? "Match requests" : "Proposals";
  const tabs: { id: "projects" | "records" | "meetings"; to: string; label: string; icon: IconName }[] = [
    { id: "projects", to: "/dashboard", label: "Projects", icon: "projects" },
    { id: "records", to: "/dashboard?tab=records", label: records, icon: profile.role === "senior_researcher" ? "match" : "document" },
    { id: "meetings", to: "/dashboard/meetings", label: "Scoping meetings", icon: "meeting" },
  ];
  return (
    <nav className="section-nav" aria-label="Workspace">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          aria-current={current === tab.id ? "page" : undefined}
          to={tab.to}
        >
          <Icon name={tab.icon} />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
