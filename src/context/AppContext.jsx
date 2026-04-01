import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { DEMO_POSTS, DEMO_CAMPAIGNS, DEMO_STORIES } from "../constants/demo.js";
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
      if (data?.length) setPosts(data);
      else setPosts(DEMO_POSTS); // First login: start with demo posts
    });

    campsLoaded.current = false;
    storeGet("campaigns").then(data => {
      campsLoaded.current = true;
      if (data?.length) setCampaigns(data);
      else setCampaigns(DEMO_CAMPAIGNS);
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
    const index = items.map(({ url, analyzing, ...rest }) => rest);
    storeSet("media:index", index);
    items.filter(i => !i.analyzing && i.url).forEach(i =>
      storeSet(`media:img:${i.id}`, { url: i.url })
    );
  }, [items]);

  // ── Resolved user ─────────────────────────────────────────────────────────
  const user = demoUser || (isSignedIn && clerkUser ? mapClerkUser(clerkUser) : null);

  // ── Navigation actions ────────────────────────────────────────────────────
  const goNav = n => { setNav(n); setFilt("all"); setChFilt("all"); };
  const goFilter = (pg, f) => { setNav(pg); setFilt(f); setChFilt("all"); };
  const goChNav = chId => { setNav("publisher"); setFilt("all"); setChFilt(chId); };

  // ── Post actions ──────────────────────────────────────────────────────────
  const save = p => {
    setPosts(prev =>
      prev.find(x => x.id === p.id) ? prev.map(x => x.id === p.id ? p : x) : [...prev, p]
    );
    setEdPost(null);
  };
  const saveSch = p => {
    setPosts(prev => prev.map(x => x.id === p.id ? p : x));
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
  });

  // ── Story actions ─────────────────────────────────────────────────────────
  const saveStory = s => {
    setStories(prev =>
      prev.find(x => x.id === s.id) ? prev.map(x => x.id === s.id ? s : x) : [...prev, s]
    );
    setEdStory(null);
  };
  const delStory = id => setStories(prev => prev.filter(s => s.id !== id));
  const newStory = () => setEdStory({
    id: null, title: "", subtitle: "", coverMediaId: null,
    category: "", sections: [], status: "draft",
    createdAt: new Date().toLocaleDateString("de-DE"), tags: "",
  });
  const convertSection = (sec, story) => {
    setEdPost({
      id: null,
      title: `${story.title}${sec.heading ? ` – ${sec.heading}` : ""}`,
      content: sec.content || "",
      channels: [], scheduledDate: "", scheduledTime: "",
      status: "draft", mediaId: story.coverMediaId || null, campaignId: null,
    });
  };

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
    // Posts
    posts,
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
    // Campaigns
    campaigns,
    setCampaigns,
    // Media
    items,
    uploadItem,
    updateItem,
    deleteItems,
    // Stories
    stories,
    edStory,
    setEdStory,
    saveStory,
    delStory,
    newStory,
    convertSection,
    detailPost,
    setDetailPost,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
