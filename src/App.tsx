import { HashRouter, Route, Routes } from "react-router-dom";
import { PublicLayout, RequireAuth } from "./components/Layout";
import { AuthProvider } from "./lib/auth";
import { AboutPage } from "./pages/About";
import { AdminHomePage, AdminLayout, AdminPlaceholder, AdminProposalsPage } from "./pages/Admin";
import { ApplyResearcherPage } from "./pages/ApplyResearcher";
import { ApplySeniorPage } from "./pages/ApplySenior";
import { AwardPage } from "./pages/Award";
import { DashboardPage } from "./pages/Dashboard";
import { HomePage } from "./pages/Home";
import { HowItWorksPage } from "./pages/HowItWorks";
import { LoginPage } from "./pages/Login";
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
            <Route path="login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="dashboard/application" element={<ApplyResearcherPage />} />
              <Route path="dashboard/opportunities" element={<DashboardPage />} />
              <Route path="dashboard/projects/:id" element={<DashboardPage />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminHomePage />} />
                <Route path="proposals" element={<AdminProposalsPage />} />
                <Route
                  path="matching"
                  element={
                    <AdminPlaceholder
                      title="Matching"
                      copy="Match records appear here after TRI creates them. Mentors respond from their own dashboard."
                    />
                  }
                />
                <Route
                  path="projects"
                  element={
                    <AdminPlaceholder
                      title="Projects"
                      copy="Active projects are created after scoping. Public release is a separate flag on the project."
                    />
                  }
                />
                <Route
                  path="mentors"
                  element={
                    <AdminPlaceholder
                      title="Mentors"
                      copy="Senior Researcher profiles are written by mentors when they join the pool."
                    />
                  }
                />
                <Route
                  path="reports"
                  element={
                    <AdminPlaceholder
                      title="Reports"
                      copy="Reporting stays light in this version: proposal status, match responses, and project health."
                    />
                  }
                />
              </Route>
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
