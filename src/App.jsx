import { useState, useEffect, useRef } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { C, FONT, CSS } from "./constants/colors.js";
import { DEMO_POSTS, DEMO_CAMPAIGNS, DEMO_STORIES } from "./constants/demo.js";
import { storeGet, storeSet } from "./utils/store.js";
import Login from "./components/Login.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import TopBar from "./components/layout/TopBar.jsx";
import GlobalRightSidebar from "./components/layout/GlobalRightSidebar.jsx";
import Editor from "./modals/Editor.jsx";
import SchedModal from "./modals/SchedModal.jsx";
import StoryEditorModal from "./modals/StoryEditorModal.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PublisherPage from "./pages/PublisherPage.jsx";
import TrashPage from "./pages/TrashPage.jsx";
import CampaignsPage from "./pages/CampaignsPage.jsx";
import MediaPage from "./pages/MediaPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import PlannerPage from "./pages/PlannerPage.jsx";
import PerformancePage from "./pages/PerformancePage.jsx";
import StoriesPage from "./pages/StoriesPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

// Map a Clerk user object to our internal user format
function mapClerkUser(clerkUser) {
  const fullName = clerkUser.fullName || "";
  const email = clerkUser.primaryEmailAddress?.emailAddress || "";
  const initials = fullName
    ? fullName.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()
    : email.slice(0,2).toUpperCase();
  return {
    id: clerkUser.id,
    name: fullName || email.split("@")[0] || "User",
    email,
    role: clerkUser.publicMetadata?.role || "editor",
    avatar: initials,
    imageUrl: clerkUser.imageUrl || null,
  };
}

// ── APP ROOT ───────────────────────────────────────────────────────────────
export default function App(){
  // Clerk auth state
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();

  // Demo login bypass (no Clerk account needed)
  const [demoUser, setDemoUser] = useState(null);

  const [nav,setNav]=useState("dashboard");
  const [posts,setPosts]=useState(DEMO_POSTS);
  const [items,setItems]=useState([]);
  const [campaigns,setCampaigns]=useState(DEMO_CAMPAIGNS);
  const [edPost,setEdPost]=useState(null);
  const [schPost,setSchPost]=useState(null);
  const [filt,setFilt]=useState("all");
  const [chFilt,setChFilt]=useState("all");
  const [stories,setStories]=useState(DEMO_STORIES);
  const [edStory,setEdStory]=useState(null);
  const mediaLoaded=useRef(false);
  const postsLoaded=useRef(false);
  const campsLoaded=useRef(false);
  const storiesLoaded=useRef(false);

  // Posts aus KV laden (beim Start)
  useEffect(()=>{
    storeGet("posts").then(data=>{
      postsLoaded.current=true;
      if(data?.length) setPosts(data);
    });
  },[]);

  // Posts in KV speichern (bei Änderungen)
  useEffect(()=>{
    if(!postsLoaded.current)return;
    storeSet("posts",posts);
  },[posts]);

  // Kampagnen aus KV laden (beim Start)
  useEffect(()=>{
    storeGet("campaigns").then(data=>{
      campsLoaded.current=true;
      if(data?.length) setCampaigns(data);
    });
  },[]);

  // Kampagnen in KV speichern (bei Änderungen)
  useEffect(()=>{
    if(!campsLoaded.current)return;
    storeSet("campaigns",campaigns);
  },[campaigns]);

  // Storys aus KV laden
  useEffect(()=>{
    storeGet("stories").then(data=>{
      storiesLoaded.current=true;
      if(data?.length)setStories(data);
    });
  },[]);

  // Storys in KV speichern
  useEffect(()=>{
    if(!storiesLoaded.current)return;
    storeSet("stories",stories);
  },[stories]);

  // Medien aus KV laden (beim Start)
  useEffect(()=>{
    storeGet("media:index").then(async index=>{
      if(index?.length){
        const loaded=await Promise.all(index.map(async meta=>{
          const img=await storeGet(`media:img:${meta.id}`);
          return{...meta,url:img?.url||""};
        }));
        mediaLoaded.current=true;
        setItems(loaded);
      } else {
        mediaLoaded.current=true;
      }
    });
  },[]);

  // Medien in KV speichern (bei Änderungen)
  useEffect(()=>{
    if(!mediaLoaded.current)return;
    const index=items.map(({url,analyzing,...rest})=>rest);
    storeSet("media:index",index);
    items.filter(i=>!i.analyzing&&i.url).forEach(i=>storeSet(`media:img:${i.id}`,{url:i.url}));
  },[items]);

  // ── Loading state while Clerk initialises ──────────────────────────────
  if(!isLoaded) return(
    <div style={{display:"flex",height:"100vh",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:FONT}}>
      <style>{CSS}</style>
      <div style={{width:28,height:28,border:`3px solid ${C.accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
    </div>
  );

  // Resolve active user: Clerk > demo > null
  const user = demoUser || (isSignedIn && clerkUser ? mapClerkUser(clerkUser) : null);

  // ── Login screen ───────────────────────────────────────────────────────
  if(!user) return <Login onLogin={u=>setDemoUser(u)}/>;

  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = () => {
    if(demoUser){ setDemoUser(null); }
    else { signOut(); }
  };

  const save=p=>{setPosts(prev=>prev.find(x=>x.id===p.id)?prev.map(x=>x.id===p.id?p:x):[...prev,p]);setEdPost(null);};
  const saveSch=p=>{setPosts(prev=>prev.map(x=>x.id===p.id?p:x));setSchPost(null);};
  const del=id=>setPosts(prev=>prev.map(p=>p.id===id?{...p,deleted:true}:p));
  const restore=id=>setPosts(prev=>prev.map(p=>p.id===id?{...p,deleted:false}:p));
  const purge=id=>setPosts(prev=>prev.filter(p=>p.id!==id));
  const purgeAll=()=>setPosts(prev=>prev.filter(p=>!p.deleted));
  const approve=(id,st)=>setPosts(prev=>prev.map(p=>p.id===id?{...p,status:st}:p));
  const chSt=(id,st)=>setPosts(prev=>prev.map(p=>p.id===id?{...p,status:st}:p));
  const chCamp=(id,cid)=>setPosts(prev=>prev.map(p=>p.id===id?{...p,campaignId:cid}:p));
  const newPost=()=>setEdPost({id:null,title:"",content:"",channels:[],scheduledDate:"",scheduledTime:"",status:"draft",mediaId:null,campaignId:null});
  const saveStory=s=>{setStories(prev=>prev.find(x=>x.id===s.id)?prev.map(x=>x.id===s.id?s:x):[...prev,s]);setEdStory(null);};
  const delStory=id=>setStories(prev=>prev.filter(s=>s.id!==id));
  const newStory=()=>setEdStory({id:null,title:"",subtitle:"",coverMediaId:null,category:"",sections:[],status:"draft",createdAt:new Date().toLocaleDateString("de-DE"),tags:""});
  const convertSection=(sec,story)=>{setEdPost({id:null,title:`${story.title}${sec.heading?` – ${sec.heading}`:""}`,content:sec.content||"",channels:[],scheduledDate:"",scheduledTime:"",status:"draft",mediaId:story.coverMediaId||null,campaignId:null});};
  const goNav=n=>{setNav(n);setFilt("all");setChFilt("all");};
  const goFilter=(pg,f)=>{setNav(pg);setFilt(f);setChFilt("all");};
  const goChNav=(chId)=>{setNav("publisher");setFilt("all");setChFilt(chId);};

  // Allow AdminPage to update user profile (display name, role for demo users)
  const handleUpdateMe = u => {
    if(demoUser) setDemoUser(u);
    // For Clerk users: profile updates go through Clerk — no local state needed
  };

  const TITLE={dashboard:"Dashboard",publisher:"Publisher",drafts:"Entwürfe",trash:"Papierkorb",stories:"Storys",campaigns:"Kampagnen",media:"Medienbibliothek",calendar:"Kalender",planner:"Planner",performance:"Performance",admin:"Admin"};

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:FONT,background:C.bg,overflow:"hidden"}}>
      <style>{CSS}</style>
      <Sidebar active={nav} onNav={goNav} user={user} onLogout={handleLogout} pend={posts.filter(p=>p.status==="pending").length} posts={posts} onChNav={goChNav} activeCh={chFilt}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <TopBar title={TITLE[nav]||"SocialFlow"} user={user} onNew={newPost}/>
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            {nav==="dashboard"   &&<Dashboard posts={posts.filter(p=>!p.deleted)} items={items} campaigns={campaigns} user={user} onNav={goNav} onFilterNav={goFilter}/>}
            {(nav==="publisher"||nav==="drafts")&&<PublisherPage posts={posts} items={items} campaigns={campaigns} onEdit={setEdPost} onSched={setSchPost} onDel={del} onApprove={approve} onStatus={chSt} onCampaign={chCamp} onNew={newPost} role={user.role} filt={nav==="drafts"?"draft":filt} setFilt={nav==="drafts"?()=>{}:setFilt} chFilt={chFilt} setChFilt={setChFilt}/>}
            {nav==="trash"       &&<TrashPage posts={posts} onRestore={restore} onPurge={purge} onPurgeAll={purgeAll}/>}
            {nav==="campaigns"   &&<CampaignsPage campaigns={campaigns} setCampaigns={setCampaigns} posts={posts.filter(p=>!p.deleted)} onEditPost={setEdPost}/>}
            {nav==="media"       &&<MediaPage items={items} posts={posts} onUpload={i=>setItems(p=>[...p,i])} onUpdate={u=>setItems(p=>p.map(x=>x.id===u.id?u:x))} onDelete={ids=>setItems(p=>p.filter(x=>!ids.includes(x.id)))}/>}
            {nav==="calendar"    &&<CalendarPage posts={posts} onEdit={setEdPost}/>}
            {nav==="planner"     &&<PlannerPage posts={posts} campaigns={campaigns} items={items} onEdit={setEdPost}/>}
            {nav==="performance" &&<PerformancePage posts={posts}/>}
            {nav==="stories"     &&<StoriesPage stories={stories} items={items} onEdit={setEdStory} onNew={newStory} onDelete={delStory}/>}
            {nav==="admin"       &&user.role==="admin"&&<AdminPage me={user} onUpdateMe={handleUpdateMe}/>}
          </div>
          <GlobalRightSidebar posts={posts.filter(p=>!p.deleted)} campaigns={campaigns} onNav={goNav}/>
        </div>
      </div>
      {edPost&&<Editor post={edPost} items={items} posts={posts} campaigns={campaigns} onSave={save} onClose={()=>setEdPost(null)} onUpload={i=>setItems(p=>[...p,i])} onUpdate={u=>setItems(p=>p.map(x=>x.id===u.id?u:x))} user={user}/>}
      {edStory&&<StoryEditorModal story={edStory} items={items} onSave={saveStory} onClose={()=>setEdStory(null)} onUpload={i=>setItems(p=>[...p,i])} onConvertSection={convertSection}/>}
      {schPost&&<SchedModal post={schPost} onSave={saveSch} onClose={()=>setSchPost(null)}/>}
    </div>
  );
}
