import { lazy } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { PublicLayout, RequireAuth, SdkGate } from "./components/Layout";
import { AuthProvider, useAuth } from "./lib/auth";
import { AboutPage } from "./pages/About";
import { HomePage } from "./pages/Home";
import { HowItWorksPage } from "./pages/HowItWorks";
import { ResearchersPage } from "./pages/Researchers";
import { SeniorResearchersPage } from "./pages/SeniorResearchers";

const AccountPage = lazy(() => import("./pages/Account").then((m) => ({ default: m.AccountPage })));
const AdminReportsPage = lazy(() => import("./pages/AdminReports").then((m) => ({ default: m.AdminReportsPage })));
const AdminTasksPage = lazy(() => import("./pages/AdminTasks").then((m) => ({ default: m.AdminTasksPage })));
const AdminMeetingsPage = lazy(() => import("./pages/AdminMeetings").then((m) => ({ default: m.AdminMeetingsPage })));
const AdminOnboardingPage = lazy(() => import("./pages/AdminOnboarding").then((m) => ({ default: m.AdminOnboardingPage })));
const AdminProjectsPage = lazy(() => import("./pages/AdminProjects").then((m) => ({ default: m.AdminProjectsPage })));
const AdminMatchingPage = lazy(() => import("./pages/AdminMatching").then((m) => ({ default: m.AdminMatchingPage })));
const AdminReviewPage = lazy(() => import("./pages/AdminReview").then((m) => ({ default: m.AdminReviewPage })));
const ApplyResearcherPage = lazy(() =>
  import("./pages/ApplyResearcher").then((m) => ({ default: m.ApplyResearcherPage })),
);
const ApplySeniorPage = lazy(() => import("./pages/ApplySenior").then((m) => ({ default: m.ApplySeniorPage })));
const AwardPage = lazy(() => import("./pages/Award").then((m) => ({ default: m.AwardPage })));
const DashboardPage = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.DashboardPage })));
const RoleTasksPage = lazy(() => import("./pages/RoleTasks").then((m) => ({ default: m.RoleTasksPage })));
const JoinProjectPage = lazy(() => import("./pages/JoinProject").then((m) => ({ default: m.JoinProjectPage })));
const LoginPage = lazy(() => import("./pages/Login").then((m) => ({ default: m.LoginPage })));
const MeetingsPage = lazy(() => import("./pages/Meetings").then((m) => ({ default: m.MeetingsPage })));
const ProjectWorkspacePage = lazy(() =>
  import("./pages/ProjectWorkspace").then((m) => ({ default: m.ProjectWorkspacePage })),
);
const ResearchPage = lazy(() => import("./pages/Research").then((m) => ({ default: m.ResearchPage })));

const loadAdmin = () => import("./pages/Admin");
const AdminHomePage = lazy(() => loadAdmin().then((m) => ({ default: m.AdminHomePage })));
const AdminLayout = lazy(() => loadAdmin().then((m) => ({ default: m.AdminLayout })));
const AdminMentorsPage = lazy(() => loadAdmin().then((m) => ({ default: m.AdminMentorsPage })));
const AdminProposalsPage = lazy(() => loadAdmin().then((m) => ({ default: m.AdminProposalsPage })));
const AdminResearchersPage = lazy(() => loadAdmin().then((m) => ({ default: m.AdminResearchersPage })));

function AdminTasksEntry() {
  const { profile } = useAuth();
  if (!profile) return null;
  if (profile.role === "reviewer") return <RoleTasksPage embedded />;
  return <AdminTasksPage />;
}

export function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="how-it-works" element={<HowItWorksPage />} />
            <Route path="researchers" element={<ResearchersPage />} />
            <Route path="senior-researchers" element={<SeniorResearchersPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route element={<SdkGate />}>
              <Route path="research" element={<ResearchPage />} />
              <Route path="apply/researcher" element={<ApplyResearcherPage />} />
              <Route path="apply/senior-researcher" element={<ApplySeniorPage />} />
              <Route path="award/:token" element={<AwardPage />} />
              <Route path="join/:token" element={<JoinProjectPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="dashboard/tasks" element={<RoleTasksPage />} />
                <Route path="dashboard/meetings" element={<MeetingsPage />} />
                <Route path="account" element={<AccountPage />} />
                <Route path="dashboard/application" element={<ApplyResearcherPage />} />
                <Route path="dashboard/opportunities" element={<DashboardPage />} />
                <Route path="dashboard/projects/:id" element={<ProjectWorkspacePage />} />
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<AdminHomePage />} />
                  <Route path="tasks" element={<AdminTasksEntry />} />
                  <Route path="proposals" element={<AdminProposalsPage />} />
                  <Route path="proposals/:id" element={<AdminReviewPage />} />
                  <Route path="matching" element={<AdminMatchingPage />} />
                  <Route path="meetings" element={<AdminMeetingsPage />} />
                  <Route path="projects" element={<AdminProjectsPage />} />
                  <Route path="researchers" element={<AdminResearchersPage />} />
                  <Route path="mentors" element={<AdminMentorsPage />} />
                  <Route path="onboarding" element={<AdminOnboardingPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
