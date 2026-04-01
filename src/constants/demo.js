// ── DEMO DATA ───────────────────────────────────────────────────────────────
export const CHANNELS = [
  { id:"instagram", label:"Instagram",  color:"#E1306C", bg:"#fff0f6", maxChars:2200  },
  { id:"twitter",   label:"X/Twitter",  color:"#000000", bg:"#f7f7f7", maxChars:280   },
  { id:"linkedin",  label:"LinkedIn",   color:"#0077B5", bg:"#f0f7fc", maxChars:3000  },
  { id:"facebook",  label:"Facebook",   color:"#1877F2", bg:"#f0f5ff", maxChars:63000 },
  { id:"whatsapp",  label:"WhatsApp",   color:"#25D366", bg:"#f0fdf4", maxChars:65536 },
];

export const ROLES = {
  admin:  { label:"Admin",      color:"#E53E3E", can:["read","write","schedule","delete","admin","approve"] },
  editor: { label:"Editor",     color:"#175CD3", can:["read","write","schedule"] },
  viewer: { label:"Betrachter", color:"#667085", can:["read"] },
};

export const DEMO_USERS = [
  { id:"1", email:"admin@demo.com",  password:"admin123",  name:"Dietmar S.", role:"admin",  avatar:"DS" },
  { id:"2", email:"editor@demo.com", password:"editor123", name:"Maria K.",   role:"editor", avatar:"MK" },
  { id:"3", email:"viewer@demo.com", password:"view123",   name:"Lukas M.",   role:"viewer", avatar:"LM" },
];

export const STAGES = [
  { id:"draft",     label:"Entwurf",        color:"#B54708", bg:"#FFFAEB", border:"#FDE68A", header:"#FEF3C7" },
  { id:"pending",   label:"Zur Freigabe",   color:"#175CD3", bg:"#EFF8FF", border:"#BFDBFE", header:"#DBEAFE" },
  { id:"scheduled", label:"Geplant",        color:"#027A48", bg:"#ECFDF3", border:"#A7F3D0", header:"#D1FAE5" },
  { id:"published", label:"Veröffentlicht", color:"#6941C6", bg:"#F9F5FF", border:"#DDD6FE", header:"#EDE9FE" },
];

export const CAMP_COLORS = ["#E53E3E","#0077B5","#027A48","#B54708","#6941C6","#E1306C","#25D366","#F59E0B","#06B6D4","#EC4899"];

// Monochrome Lucide-Icon-Namen – werden in CampaignsPage als <LucideIcon> gerendert
// Kein Emoji mehr, alles passend zum App-Designsystem (stroke, color von Kampagnenfarbe)
export const CAMP_ICONS = [
  "Target","Trophy","Star","Rocket","Gift","Flame","Zap","Sun",
  "Heart","Globe","Tag","Megaphone","TrendingUp","Sparkles","Crown","Layers",
];

export const DEMO_CAMPAIGNS = [
  {
    id:"c1", name:"Sommer-Sale", icon:"Sun", color:"#F59E0B",
    description:"Sommerkampagne für den Jahresabverkauf mit Fokus auf Rabattaktionen und saisonale Inhalte.",
    goal:"sales", status:"active",
    startDate:"2026-06-01", endDate:"2026-08-31",
    channels:["instagram","facebook"],
    keyMessage:"Bis zu 40% Rabatt – nur kurze Zeit!",
    cta:"Jetzt shoppen",
    audience:{ ageRange:"25-44", gender:"all", locations:"Deutschland, Österreich", interests:"Shopping, Mode, Lifestyle" },
    budget:{ total:5000, spent:1840, currency:"EUR" },
    kpis:{ impressions:500000, reach:150000, engagementRate:3.5, clicks:8000 },
    createdAt:"2026-05-15",
  },
  {
    id:"c2", name:"Produktlaunch", icon:"Rocket", color:"#6941C6",
    description:"Launch der neuen Produktlinie Q2 2026 auf allen relevanten Kanälen.",
    goal:"awareness", status:"planned",
    startDate:"2026-04-15", endDate:"2026-06-30",
    channels:["instagram","linkedin","twitter"],
    keyMessage:"Das nächste Level ist da.",
    cta:"Mehr erfahren",
    audience:{ ageRange:"18-35", gender:"all", locations:"Deutschland", interests:"Tech, Innovation, Business" },
    budget:{ total:8000, spent:0, currency:"EUR" },
    kpis:{ impressions:1000000, reach:300000, engagementRate:4.0, clicks:15000 },
    createdAt:"2026-03-01",
  },
];

export const DEMO_POSTS = [
  { id:"p1", title:"Produktlaunch Q2",     content:"Unser neues Produkt ist da! 🚀\n\n#launch #neu",                 channels:["instagram","linkedin"], scheduledDate:"2026-03-15", scheduledTime:"09:00", status:"scheduled",  mediaId:null, campaignId:"c2" },
  { id:"p2", title:"Tipp der Woche",       content:"Regelmäßiges Posting steigert deine Reichweite um 40%.\n\n#marketing", channels:["twitter","facebook"],  scheduledDate:"",          scheduledTime:"",      status:"draft",      mediaId:null, campaignId:null },
  { id:"p3", title:"Behind the Scenes",    content:"Blick hinter die Kulissen! 💪\n\n#team #bts",                     channels:["instagram","whatsapp"], scheduledDate:"2026-03-20", scheduledTime:"18:00", status:"scheduled",  mediaId:null, campaignId:null },
  { id:"p4", title:"Kundenreview",         content:"Was unsere Kunden sagen. Danke! ❤️\n\n#review",                 channels:["instagram","linkedin"], scheduledDate:"",          scheduledTime:"",      status:"pending",    mediaId:null, campaignId:null },
  { id:"p5", title:"Sommer Sale",          content:"☀️ Bis zu 40% Rabatt – nur kurze Zeit!\n\n#sale",              channels:["instagram","facebook"], scheduledDate:"2026-06-01", scheduledTime:"10:00", status:"draft",      mediaId:null, campaignId:"c1" },
  { id:"p6", title:"Frühjahrs-Kampagne",   content:"Der Frühling ist da – und wir feiern ihn mit euch! 🌸\n\n#spring #sale", channels:["instagram","facebook"], scheduledDate:"2026-02-14", scheduledTime:"11:00", status:"published", mediaId:null, campaignId:"c1" },
  { id:"p7", title:"Workshop Einladung",   content:"Kommt zu unserem kostenlosen LinkedIn-Workshop! 🎓\n\n#workshop #linkedin", channels:["linkedin","twitter"],  scheduledDate:"2026-01-28", scheduledTime:"09:00", status:"published", mediaId:null, campaignId:null },
  { id:"p8", title:"Jahresrückblick 2025", content:"Was für ein Jahr! Danke an unsere Community. ❤️\n\n#2025 #danke",  channels:["instagram","linkedin","facebook"], scheduledDate:"2025-12-31", scheduledTime:"12:00", status:"published", mediaId:null, campaignId:null },
];

export const DEMO_STORIES = [
  {id:"story-1",title:"Wie Social Media die Kommunikation verändert",subtitle:"Eine Analyse der digitalen Transformation",coverMediaId:null,category:"Tech",status:"draft",sections:[
    {id:"sec-1",heading:"Die neue Kommunikationslandschaft",content:"Social Media hat in den letzten zehn Jahren die Kommunikation grundlegend verändert. Plattformen wie Instagram, Twitter und LinkedIn sind längst keine Spielwiesen mehr, sondern ernsthafte Kommunikationskanäle für Unternehmen und Privatpersonen gleichermaßen."},
    {id:"sec-2",heading:"Chancen und Risiken",content:"Mit der wachsenden Bedeutung sozialer Netzwerke entstehen sowohl neue Möglichkeiten als auch Herausforderungen. Content Creator und Marken müssen authentisch, konsistent und strategisch vorgehen, um ihre Zielgruppen zu erreichen und echte Bindungen aufzubauen."},
    {id:"sec-3",heading:"Ausblick",content:"Die Zukunft gehört denjenigen, die Inhalte plattformspezifisch anpassen und gleichzeitig ihre authentische Stimme bewahren. Tools wie SocialFlow Pro helfen dabei, diesen Spagat erfolgreich zu meistern."},
  ],createdAt:"2024-03-15",tags:"social media, kommunikation, digital"},
];
