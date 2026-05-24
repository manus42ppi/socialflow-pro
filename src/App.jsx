import { Routes, Route } from "react-router-dom";
import { C, FONT, CSS } from "./constants/colors.js";
import { AppProvider, useApp } from "./context/AppContext.jsx";
import Login from "./components/Login.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import TopBar from "./components/layout/TopBar.jsx";
import GlobalRightSidebar from "./components/layout/GlobalRightSidebar.jsx";
import SchedModal from "./modals/SchedModal.jsx";
import StoryEditorModal from "./modals/StoryEditorModal.jsx";
import PostEditorModal from "./modals/PostEditorModal.jsx";
import PostDetailDrawer from "./modals/PostDetailDrawer.jsx";
import { TITLE } from "./constants/nav.js";
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
import VoodooPage from "./pages/VoodooPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import ProductEditorModal from "./modals/ProductEditorModal.jsx";
import ContentLibraryPage from "./pages/ContentLibraryPage.jsx";
import SparkOrb from "./components/spark/SparkOrb.jsx";

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
  const { isLoaded, user, setDemoUser, nav, edPost, schPost, edStory, edProduct, detailPost } = useApp();

  // Loading spinner while Clerk initialises
  if (!isLoaded) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: FONT }}>
      <style>{CSS}</style>
      <div style={{ width: 28, height: 28, border: `3px solid ${C.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
    </div>
  );

  // Login screen
  if (!user) return <Login onLogin={u => setDemoUser(u)} />;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: FONT, background: C.bg, overflow: "hidden" }}>
      <style>{CSS}</style>
      <Sidebar />

      {/* Full-screen editors fill the content area (no floating modal) */}
      {edStory ? <StoryEditorModal /> : edPost ? <PostEditorModal /> : edProduct ? <ProductEditorModal /> : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <TopBar title={TITLE[nav] || "SocialFlow"} />
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <Routes>
                <Route path="/"                element={<Dashboard />} />
                <Route path="/content"         element={<ContentLibraryPage />} />
                <Route path="/publisher"       element={<PublisherPage />} />
                <Route path="/trash"           element={<TrashPage />} />
                <Route path="/campaigns"       element={<CampaignsPage />} />
                <Route path="/media"           element={<MediaPage />} />
                <Route path="/calendar"        element={<CalendarPage />} />
                <Route path="/planner"         element={<PlannerPage />} />
                <Route path="/performance"     element={<PerformancePage />} />
                <Route path="/monitoring"      element={<MonitoringPage />} />
                <Route path="/trends"          element={<TrendsPage />} />
                <Route path="/domain-analyse"  element={<DomainAnalysePage />} />
                <Route path="/wettbewerber"    element={<WettbewerberPage />} />
                <Route path="/content-audit"   element={<ContentAuditPage />} />
                <Route path="/structure-audit" element={<StructureAuditPage />} />
                <Route path="/social-intel"    element={<SocialIntelligencePage />} />
                <Route path="/stories"         element={<StoriesPage />} />
                <Route path="/produkte"        element={<ProductsPage />} />
                <Route path="/admin"           element={<AdminPage />} />
                <Route path="/ugc"             element={<UGCPortalPage />} />
                <Route path="/voodoo"          element={<VoodooPage />} />
                <Route path="*"               element={<Dashboard />} />
              </Routes>
            </div>
            <GlobalRightSidebar />
          </div>
        </div>
      )}

      {/* Remaining overlays (schedule, detail drawer) */}
      {schPost    && <SchedModal />}
      {detailPost && <PostDetailDrawer />}

      {/* Spark Voice Assistant – always mounted, floats bottom-right */}
      <SparkOrb />
    </div>
  );
}
