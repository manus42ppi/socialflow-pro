import { C, FONT, CSS } from "./constants/colors.js";
import { AppProvider, useApp } from "./context/AppContext.jsx";
import Login from "./components/Login.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import TopBar from "./components/layout/TopBar.jsx";
import GlobalRightSidebar from "./components/layout/GlobalRightSidebar.jsx";
import Editor from "./modals/Editor.jsx";
import SchedModal from "./modals/SchedModal.jsx";
import StoryEditorModal from "./modals/StoryEditorModal.jsx";
import PostDetailDrawer from "./modals/PostDetailDrawer.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PublisherPage from "./pages/PublisherPage.jsx";
import TrashPage from "./pages/TrashPage.jsx";
import CampaignsPage from "./pages/CampaignsPage.jsx";
import MediaPage from "./pages/MediaPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import PlannerPage from "./pages/PlannerPage.jsx";
import PerformancePage from "./pages/PerformancePage.jsx";
import TrendsPage from "./pages/TrendsPage.jsx";
import DomainAnalysePage from "./pages/DomainAnalysePage.jsx";
import WettbewerberPage from "./pages/WettbewerberPage.jsx";
import ContentAuditPage from "./pages/ContentAuditPage.jsx";
import StructureAuditPage from "./pages/StructureAuditPage.jsx";
import SocialIntelligencePage from "./pages/SocialIntelligencePage.jsx";
import MonitoringPage from "./pages/MonitoringPage.jsx";
import StoriesPage from "./pages/StoriesPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import UGCPortalPage from "./pages/UGCPortalPage.jsx";

// ── APP ROOT ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

// ── APP SHELL (uses context) ───────────────────────────────────────────────
function AppShell() {
  const { isLoaded, user, setDemoUser, nav, edPost, schPost, edStory, detailPost } = useApp();

  // Loading spinner while Clerk initialises
  if (!isLoaded) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: FONT }}>
      <style>{CSS}</style>
      <div style={{ width: 28, height: 28, border: `3px solid ${C.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
    </div>
  );

  // Login screen
  if (!user) return <Login onLogin={u => setDemoUser(u)} />;

  const TITLE = {
    dashboard: "Dashboard", publisher: "Publisher",
    trash: "Papierkorb", stories: "Storys", campaigns: "Kampagnen",
    media: "Medienbibliothek", calendar: "Kalender", planner: "Planner",
    performance: "Performance",
    monitoring: "Instagram Monitoring", admin: "Admin", ugc: "UGC Portal",
    trends: "Trends", "domain-analyse": "Domain-Analyse",
    wettbewerber: "Wettbewerber", "content-audit": "Content-Audit",
    "structure-audit": "Structure-Audit", "social-intel": "Social Intelligence",
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: FONT, background: C.bg, overflow: "hidden" }}>
      <style>{CSS}</style>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar title={TITLE[nav] || "SocialFlow"} />
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {nav === "dashboard"   && <Dashboard />}
            {nav === "publisher"   && <PublisherPage />}
            {nav === "trash"       && <TrashPage />}
            {nav === "campaigns"   && <CampaignsPage />}
            {nav === "media"       && <MediaPage />}
            {nav === "calendar"    && <CalendarPage />}
            {nav === "planner"     && <PlannerPage />}
            {nav === "performance"     && <PerformancePage />}
            {nav === "monitoring"     && <MonitoringPage />}
            {nav === "trends"         && <TrendsPage />}
            {nav === "domain-analyse" && <DomainAnalysePage />}
            {nav === "wettbewerber"   && <WettbewerberPage />}
            {nav === "content-audit"  && <ContentAuditPage />}
            {nav === "structure-audit"&& <StructureAuditPage />}
            {nav === "social-intel"   && <SocialIntelligencePage />}
            {nav === "stories"     && <StoriesPage />}
            {nav === "admin"       && <AdminPage />}
            {nav === "ugc"         && <UGCPortalPage />}
          </div>
          <GlobalRightSidebar />
        </div>
      </div>

      {/* Full-screen overlays — rendered on top of everything */}
      {edStory    && <StoryEditorModal />}
      {edPost     && <Editor />}
      {schPost    && <SchedModal />}
      {detailPost && <PostDetailDrawer />}
    </div>
  );
}
