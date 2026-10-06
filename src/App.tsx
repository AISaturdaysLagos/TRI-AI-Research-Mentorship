import { HashRouter, Route, Routes } from "react-router-dom";
import { PublicLayout, RequireAuth } from "./components/Layout";
import { AuthProvider } from "./lib/auth";
import { AboutPage } from "./pages/About";
import { AccountPage } from "./pages/Account";
import { AdminHomePage, AdminLayout, AdminMentorsPage, AdminProposalsPage } from "./pages/Admin";
import { AdminReportsPage } from "./pages/AdminReports";
import { AdminTasksPage } from "./pages/AdminTasks";
import { AdminMeetingsPage } from "./pages/AdminMeetings";
import { AdminProjectsPage } from "./pages/AdminProjects";
import { AdminMatchingPage } from "./pages/AdminMatching";
import { AdminReviewPage } from "./pages/AdminReview";
import { ApplyResearcherPage } from "./pages/ApplyResearcher";
import { ApplySeniorPage } from "./pages/ApplySenior";
import { AwardPage } from "./pages/Award";
import { DashboardPage } from "./pages/Dashboard";
import { HomePage } from "./pages/Home";
import { HowItWorksPage } from "./pages/HowItWorks";
import { JoinProjectPage } from "./pages/JoinProject";
import { LoginPage } from "./pages/Login";
import { MeetingsPage } from "./pages/Meetings";
import { ProjectWorkspacePage } from "./pages/ProjectWorkspace";
import { ResearchPage } from "./pages/Research";
import { ResearchersPage } from "./pages/Researchers";
import { SeniorResearchersPage } from "./pages/SeniorResearchers";

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
            <Route path="research" element={<ResearchPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="apply/researcher" element={<ApplyResearcherPage />} />
            <Route path="apply/senior-researcher" element={<ApplySeniorPage />} />
            <Route path="award/:token" element={<AwardPage />} />
            <Route path="join/:token" element={<JoinProjectPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="dashboard/meetings" element={<MeetingsPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="dashboard/application" element={<ApplyResearcherPage />} />
              <Route path="dashboard/opportunities" element={<DashboardPage />} />
              <Route path="dashboard/projects/:id" element={<ProjectWorkspacePage />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminHomePage />} />
                <Route path="tasks" element={<AdminTasksPage />} />
                <Route path="proposals" element={<AdminProposalsPage />} />
                <Route path="proposals/:id" element={<AdminReviewPage />} />
                <Route path="matching" element={<AdminMatchingPage />} />
                <Route path="meetings" element={<AdminMeetingsPage />} />
                <Route path="projects" element={<AdminProjectsPage />} />
                <Route path="mentors" element={<AdminMentorsPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
