import { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { DEMO_POSTS, DEMO_CAMPAIGNS, DEMO_STORIES, DEMO_WORKSPACES, DEMO_WORKSPACE_MEMBERS } from "../constants/demo.js";
import { storeGet, storeSet } from "../utils/store.js";

// Map a Clerk user object to our internal user format
function mapClerkUser(clerkUser) {
  const fullName = clerkUser.fullName || "";
  const email = clerkUser.primaryEmailAddress?.emailAddress || "";
  const initials = fullName
    ? fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();
  return {
    id: clerkUser.id,
    name: fullName || email.split("@")[0] || "User",
    email,
    role: clerkUser.publicMetadata?.role || "editor",
    avatar: initials,
    imageUrl: clerkUser.imageUrl || null,
  };
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Clerk auth ────────────────────────────────────────────────────────────
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();

  // Demo login bypass (no Clerk account needed)
  const [demoUser, setDemoUser] = useState(null);

  // ── Workspace state ───────────────────────────────────────────────────────
  // currentWorkspaceId = null means "all workspaces" (admin only)
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState(() => {
    try { return localStorage.getItem("sf_workspace") || "ws-ppi-media"; } catch { return "ws-ppi-media"; }
  });

  const setCurrentWorkspaceId = (id) => {
    setCurrentWorkspaceIdState(id);
    try { localStorage.setItem("sf_workspace", id || ""); } catch {}
  };

  // ── Routing ───────────────────────────────────────────────────────────────
  const [nav, setNav] = useState("dashboard");

  // ── Data state ────────────────────────────────────────────────────────────
  const [posts, setPosts] = useState(DEMO_POSTS);
  const [items, setItems] = useState([]);
  const [campaigns, setCampaigns] = useState(DEMO_CAMPAIGNS);
  const [stories, setStories] = useState(DEMO_STORIES);

  // ── Modal / filter state ──────────────────────────────────────────────────
  const [edPost, setEdPost] = useState(null);
  const [schPost, setSchPost] = useState(null);
  const [filt, setFilt] = useState("all");
  const [chFilt, setChFilt] = useState("all");
  const [edStory, setEdStory] = useState(null);
  const [detailPost, setDetailPost] = useState(null);

  // ── KV load-guard refs ────────────────────────────────────────────────────
  // Guards prevent writing demo/empty data back to KV before real data is loaded
  const mediaLoaded = useRef(false);
  const postsLoaded = useRef(false);
  const campsLoaded = useRef(false);
  const storiesLoaded = useRef(false);
  const demoMediaLoaded = useRef(false);

  // ── KV Persistence: Load when Clerk signs in, reset when signed out ───────
  //
  // BUG FIX: The old code used useEffect(fn, []) – running once on mount.
  // At mount time Clerk has not yet established the session, so getToken()
  // returns null → storeGet returns null → guards flip to true with no data.
  // After login the load never re-runs. Fix: depend on isSignedIn + isLoaded.
  //
  useEffect(() => {
    if (!isLoaded) return; // Wait for Clerk to finish initialising

    if (!isSignedIn) {
      // Signed out (or demo mode): reset guards + restore demo data.
      // This also runs on initial page load before any login happens.
      postsLoaded.current   = false;
      campsLoaded.current   = false;
      storiesLoaded.current = false;
      mediaLoaded.current   = false;
      setPosts(DEMO_POSTS);
      setCampaigns(DEMO_CAMPAIGNS);
      setStories(DEMO_STORIES);
      setItems([]);
      return;
    }

    // ── Signed in: load all user data from Cloudflare KV ──────────────────
    postsLoaded.current = false;
    storeGet("posts").then(data => {
      postsLoaded.current = true;
      if (data?.length) {
        // Merge in any new demo posts not yet in KV (added in later releases)
        const kvIds = new Set(data.map(p => p.id));
        const newDemoPosts = DEMO_POSTS.filter(p => !kvIds.has(p.id));
        setPosts(newDemoPosts.length ? [...data, ...newDemoPosts] : data);
      } else {
        setPosts(DEMO_POSTS); // First login: start with demo posts
      }
    });

    campsLoaded.current = false;
    storeGet("campaigns").then(data => {
      campsLoaded.current = true;
      if (data?.length) {
        const kvIds = new Set(data.map(c => c.id));
        const newDemoCamps = DEMO_CAMPAIGNS.filter(c => !kvIds.has(c.id));
        setCampaigns(newDemoCamps.length ? [...data, ...newDemoCamps] : data);
      } else {
        setCampaigns(DEMO_CAMPAIGNS);
      }
    });

    storiesLoaded.current = false;
    storeGet("stories").then(data => {
      storiesLoaded.current = true;
      if (data?.length) setStories(data);
      else setStories(DEMO_STORIES);
    });

    mediaLoaded.current = false;
    storeGet("media:index").then(async index => {
      if (index?.length) {
        const loaded = await Promise.all(index.map(async meta => {
          const img = await storeGet(`media:img:${meta.id}`);
          return { ...meta, url: img?.url || "" };
        }));
        mediaLoaded.current = true;
        setItems(loaded);
      } else {
        mediaLoaded.current = true;
        setItems([]);
      }
    });
  }, [isSignedIn, isLoaded]); // ← re-runs on login AND logout

  // ── KV Persistence: Save on state changes (guarded by loadedRef) ─────────
  useEffect(() => {
    if (!postsLoaded.current) return;
    storeSet("posts", posts);
  }, [posts]);

  useEffect(() => {
    if (!campsLoaded.current) return;
    storeSet("campaigns", campaigns);
  }, [campaigns]);

  useEffect(() => {
    if (!storiesLoaded.current) return;
    storeSet("stories", stories);
  }, [stories]);

  useEffect(() => {
    if (!mediaLoaded.current) return;
    const index = items
      .filter(i => !i.analyzing)
      .map(({ url, analyzing, aiError, ...rest }) => rest);
    storeSet("media:index", index);
    items.filter(i => !i.analyzing && i.url).forEach(i =>
      storeSet(`media:img:${i.id}`, { url: i.url })
    );
  }, [items]);

  // ── Demo-User: localStorage Fallback für Media ───────────────────────────
  // Clerk-User nutzen KV. Demo-User bekommen localStorage als Fallback,
  // damit Medien den Seiten-Reload überleben.
  useEffect(() => {
    if (!demoUser) { demoMediaLoaded.current = false; return; }
    if (demoMediaLoaded.current) return;
    try {
      const saved = localStorage.getItem("demo_media");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.length) { setItems(parsed); mediaLoaded.current = true; }
      }
    } catch {}
    demoMediaLoaded.current = true;
  }, [demoUser]);

  useEffect(() => {
    if (!demoUser || !demoMediaLoaded.current) return;
    try { localStorage.setItem("demo_media", JSON.stringify(items)); }
    catch {}
  }, [items, demoUser]);

  // ── Resolved user ─────────────────────────────────────────────────────────
  const user = demoUser || (isSignedIn && clerkUser ? mapClerkUser(clerkUser) : null);

  // ── Workspace computed data ───────────────────────────────────────────────
  // Compute which workspaces the current user can access (based on DEMO_WORKSPACE_MEMBERS)
  // For Clerk users: give full access to all workspaces
  // For demo users: filter by DEMO_WORKSPACE_MEMBERS
  const userWorkspaces = useMemo(() => {
    const userId = demoUser?.id || null;
    if (!userId) return DEMO_WORKSPACES; // Clerk users see all
    const memberWsIds = new Set(
      DEMO_WORKSPACE_MEMBERS.filter(m => m.userId === userId).map(m => m.workspaceId)
    );
    return DEMO_WORKSPACES.filter(w => memberWsIds.has(w.id));
  }, [demoUser]);

  // Workspace-filtered data for UI consumption
  const filteredPosts = useMemo(() =>
    currentWorkspaceId
      ? posts.filter(p => p.workspaceId === currentWorkspaceId)
      : posts
  , [posts, currentWorkspaceId]);

  const filteredCampaigns = useMemo(() =>
    currentWorkspaceId
      ? campaigns.filter(c => c.workspaceId === currentWorkspaceId)
      : campaigns
  , [campaigns, currentWorkspaceId]);

  const filteredStories = useMemo(() =>
    currentWorkspaceId
      ? stories.filter(s => s.workspaceId === currentWorkspaceId)
      : stories
  , [stories, currentWorkspaceId]);

  // ── Navigation actions ────────────────────────────────────────────────────
  const goNav = n => { setNav(n); setFilt("all"); setChFilt("all"); };
  const goFilter = (pg, f) => { setNav(pg); setFilt(f); setChFilt("all"); };
  const goChNav = chId => { setNav("publisher"); setFilt("all"); setChFilt(chId); };

  // ── Post actions ──────────────────────────────────────────────────────────
  const save = p => {
    const saved = { ...p, workspaceId: p.workspaceId || currentWorkspaceId || "ws-ppi-media", updatedAt: new Date().toISOString() };
    setPosts(prev =>
      prev.find(x => x.id === saved.id) ? prev.map(x => x.id === saved.id ? saved : x) : [...prev, saved]
    );
    setEdPost(null);
  };
  const saveSch = p => {
    const saved = { ...p, updatedAt: new Date().toISOString() };
    setPosts(prev => prev.map(x => x.id === saved.id ? saved : x));
    setSchPost(null);
  };
  const del = id => setPosts(prev => prev.map(p => p.id === id ? { ...p, deleted: true } : p));
  const restore = id => setPosts(prev => prev.map(p => p.id === id ? { ...p, deleted: false } : p));
  const purge = id => setPosts(prev => prev.filter(p => p.id !== id));
  const purgeAll = () => setPosts(prev => prev.filter(p => !p.deleted));
  const approve = (id, st) => setPosts(prev => prev.map(p => p.id === id ? { ...p, status: st } : p));
  const chSt = (id, st) => setPosts(prev => prev.map(p => p.id === id ? { ...p, status: st } : p));
  const chCamp = (id, cid) => setPosts(prev => prev.map(p => p.id === id ? { ...p, campaignId: cid } : p));
  const newPost = () => setEdPost({
    id: null, title: "", content: "", channels: [],
    scheduledDate: "", scheduledTime: "", status: "draft",
    mediaId: null, campaignId: null,
    workspaceId: currentWorkspaceId || "ws-ppi-media",
  });

  // ── Story actions ─────────────────────────────────────────────────────────
  const saveStory = s => {
    setStories(prev =>
      prev.find(x => x.id === s.id) ? prev.map(x => x.id === s.id ? s : x) : [...prev, s]
    );
    setEdStory(null);
  };
  // updateStory: persist without closing the editor
  const updateStory = s => {
    setStories(prev =>
      prev.find(x => x.id === s.id) ? prev.map(x => x.id === s.id ? s : x) : [...prev, s]
    );
  };
  const lockStory = (storyId, lockData) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, lockedBy: lockData } : s));
  };
  const unlockStory = (storyId) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, lockedBy: null } : s));
  };
  const delStory = id => setStories(prev => prev.filter(s => s.id !== id));
  const newStory = () => setEdStory({
    id: null, title: "", subtitle: "", coverMediaId: null,
    category: "", blocks: [], materials: [], derivatives: [],
    targetChannels: [], status: "idea",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: "",
    lockedBy: null, comments: [], history: [],
    workspaceId: currentWorkspaceId || "ws-ppi-media",
  });

  // ── Media actions ─────────────────────────────────────────────────────────
  const uploadItem = i => setItems(prev => [...prev, i]);
  const updateItem = u => setItems(prev => prev.map(x => x.id === u.id ? u : x));
  const deleteItems = ids => setItems(prev => prev.filter(x => !ids.includes(x.id)));

  // ── Auth actions ──────────────────────────────────────────────────────────
  const handleLogout = () => {
    if (demoUser) { setDemoUser(null); }
    else { signOut(); }
  };
  const handleUpdateMe = u => {
    if (demoUser) setDemoUser(u);
    // For Clerk users: profile updates go through Clerk — no local state needed
  };

  // ── Context value ─────────────────────────────────────────────────────────
  const value = {
    // Auth
    isLoaded,
    user,
    demoUser,
    setDemoUser,
    handleLogout,
    handleUpdateMe,
    // Navigation
    nav,
    goNav,
    goFilter,
    goChNav,
    // Posts (filtered by current workspace for display; setPosts operates on raw state)
    posts: filteredPosts,
    setPosts,
    filt,
    setFilt,
    chFilt,
    setChFilt,
    save,
    del,
    restore,
    purge,
    purgeAll,
    approve,
    chSt,
    chCamp,
    newPost,
    // Editor modals
    edPost,
    setEdPost,
    schPost,
    setSchPost,
    saveSch,
    // Campaigns (filtered by current workspace for display)
    campaigns: filteredCampaigns,
    setCampaigns,
    // Media
    items,
    uploadItem,
    updateItem,
    deleteItems,
    // Stories (filtered by current workspace for display)
    stories: filteredStories,
    edStory,
    setEdStory,
    saveStory,
    updateStory,
    lockStory,
    unlockStory,
    delStory,
    newStory,
    detailPost,
    setDetailPost,
    // Workspace
    workspaces: DEMO_WORKSPACES,
    userWorkspaces,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    currentWorkspace: DEMO_WORKSPACES.find(w => w.id === currentWorkspaceId) || DEMO_WORKSPACES[0],
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
