// ── DEMO DATA ───────────────────────────────────────────────────────────────
export const CHANNELS = [
  { id:"instagram", label:"Instagram",     color:"#E1306C", bg:"#fff0f6", maxChars:2200  },
  { id:"twitter",   label:"X/Twitter",     color:"#000000", bg:"#f7f7f7", maxChars:280   },
  { id:"linkedin",  label:"LinkedIn",      color:"#0077B5", bg:"#f0f7fc", maxChars:3000  },
  { id:"facebook",  label:"Facebook",      color:"#1877F2", bg:"#f0f5ff", maxChars:63000 },
  { id:"whatsapp",  label:"WhatsApp",      color:"#25D366", bg:"#f0fdf4", maxChars:65536 },
];
export const STORY_CHANNELS = [
  ...CHANNELS,
  { id:"website", label:"Website / Blog",  color:"#0EA5E9", bg:"#f0f9ff", maxChars:100000 },
  { id:"print",   label:"Print / Zeitung", color:"#64748B", bg:"#f8fafc", maxChars:100000 },
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
  { id:"published", label:"Veroeffentlicht",color:"#6941C6", bg:"#F9F5FF", border:"#DDD6FE", header:"#EDE9FE" },
];
export const CAMP_COLORS = ["#E53E3E","#0077B5","#027A48","#B54708","#6941C6","#E1306C","#25D366","#F59E0B","#06B6D4","#EC4899"];
export const CAMP_ICONS = [
  "Target","Trophy","Star","Rocket","Gift","Flame","Zap","Sun",
  "Heart","Globe","Tag","Megaphone","TrendingUp","Sparkles","Crown","Layers",
];

export const DEMO_WORKSPACES = [
  { id:"ws-ppi-media", name:"ppi Media",     color:"#0077B5", emoji:"🗞️",  description:"Verlagsgruppe, Print & Digital" },
  { id:"ws-ppi-n3xt",  name:"ppi n3xt",      color:"#6941C6", emoji:"🚀",  description:"Digitale Produkte & Innovation" },
  { id:"ws-ppi-talk",  name:"ppi Talk",       color:"#027A48", emoji:"🎙️", description:"Events & Community" },
  { id:"ws-alphabeta", name:"alphabeta neo",  color:"#E1306C", emoji:"✨",  description:"Kreativagentur & Design" },
];

export const DEMO_WORKSPACE_MEMBERS = [
  // admin (id:"1" / admin@demo.com) has full access to all workspaces
  { workspaceId:"ws-ppi-media", userId:"1", role:"admin" },
  { workspaceId:"ws-ppi-n3xt",  userId:"1", role:"admin" },
  { workspaceId:"ws-ppi-talk",  userId:"1", role:"admin" },
  { workspaceId:"ws-alphabeta", userId:"1", role:"admin" },
  // editor (id:"2" / editor@demo.com) has access to ppi Media + ppi n3xt
  { workspaceId:"ws-ppi-media", userId:"2", role:"editor" },
  { workspaceId:"ws-ppi-n3xt",  userId:"2", role:"editor" },
  // viewer (id:"3" / viewer@demo.com) only sees ppi Talk
  { workspaceId:"ws-ppi-talk",  userId:"3", role:"viewer" },
];

export const DEMO_CAMPAIGNS = [
  { id:"c1", name:"KI Suite Launch", icon:"Rocket", color:"#6941C6", description:"Launch der SocialFlow KI-Suite mit vollautomatischem Content-Scheduling und KI-Texten.", goal:"awareness", status:"active", startDate:"2026-04-01", endDate:"2026-06-30", channels:["instagram","linkedin","twitter","website"], keyMessage:"Eine Plattform. Alle Kanaele. Volle Kontrolle.", cta:"Jetzt testen", audience:{ ageRange:"25-45", gender:"all", locations:"D-A-CH", interests:"Marketing, Tech, KI" }, budget:{ total:12000, spent:3400, currency:"EUR" }, kpis:{ impressions:800000, reach:250000, engagementRate:4.2, clicks:18000 }, createdAt:"2026-03-15", workspaceId:"ws-ppi-media" },
  { id:"c2", name:"Thought Leadership Q2", icon:"Crown", color:"#0077B5", description:"Positionierung als fuehrende Stimme im digitalen Content Marketing durch Artikel und LinkedIn.", goal:"engagement", status:"active", startDate:"2026-04-01", endDate:"2026-06-30", channels:["linkedin","website","twitter"], keyMessage:"Content ist Koenig. Strategie ist die Krone.", cta:"Artikel lesen", audience:{ ageRange:"28-50", gender:"all", locations:"Deutschland", interests:"Marketing, Leadership, Business" }, budget:{ total:6000, spent:1200, currency:"EUR" }, kpis:{ impressions:300000, reach:90000, engagementRate:5.8, clicks:9000 }, createdAt:"2026-03-20", workspaceId:"ws-ppi-media" },
  { id:"c3", name:"Employer Branding 2026", icon:"Heart", color:"#E1306C", description:"Authentische Einblicke in unsere Unternehmenskultur, Remote-Work und Teamevents.", goal:"reach", status:"active", startDate:"2026-03-01", endDate:"2026-09-30", channels:["instagram","linkedin","facebook"], keyMessage:"Hier macht Arbeit Sinn.", cta:"Jobs ansehen", audience:{ ageRange:"22-35", gender:"all", locations:"Deutschland, Remote", interests:"Karriere, Tech, Work-Life-Balance" }, budget:{ total:5000, spent:2100, currency:"EUR" }, kpis:{ impressions:400000, reach:120000, engagementRate:3.9, clicks:6500 }, createdAt:"2026-02-20", workspaceId:"ws-ppi-n3xt" },
  { id:"c4", name:"Digital Summit 2026", icon:"Globe", color:"#027A48", description:"Event-Marketing fuer den Digital Summit am 15. Mai in Muenchen.", goal:"sales", status:"planned", startDate:"2026-04-20", endDate:"2026-05-15", channels:["instagram","linkedin","twitter","facebook","whatsapp","print"], keyMessage:"Die Zukunft der Kommunikation – live erleben.", cta:"Ticket sichern", audience:{ ageRange:"25-55", gender:"all", locations:"Muenchen, D-A-CH", interests:"Digital, Marketing, Events" }, budget:{ total:15000, spent:0, currency:"EUR" }, kpis:{ impressions:1200000, reach:400000, engagementRate:3.5, clicks:25000 }, createdAt:"2026-04-01", workspaceId:"ws-ppi-talk" },
];
export const DEMO_POSTS = [
  { id:"p1",  title:"LinkedIn: KI im Content Marketing",      content:"KI veraendert Content Marketing grundlegend.\n\n3 Prinzipien:\n-> KI fuer Struktur, Mensch fuer Haltung\n-> KI fuer Varianten, Mensch fuer Auswahl\n-> KI fuer Geschwindigkeit, Mensch fuer Tiefe\n\n#KI #ContentMarketing #LinkedIn #DigitalMarketing",                                          channels:["linkedin"],            scheduledDate:"2026-03-28", scheduledTime:"09:00", status:"published", mediaId:null, campaignId:"c2", updatedAt:"2026-03-26T10:30:00Z", workspaceId:"ws-ppi-media" },
  { id:"p2",  title:"Instagram: Behind the Scenes",            content:"Freitagmorgen. Kaffee. Kanban.\n\nSo sieht unser Content-Prozess wirklich aus. Jeder Post startet hier: mit ehrlichen Gespraechen und manchmal lautem Lachen.\n\n#BehindTheScenes #Team #Contentcreation #WorkLife",                                                                                            channels:["instagram"],           scheduledDate:"2026-03-21", scheduledTime:"17:00", status:"published", mediaId:null, campaignId:"c3", updatedAt:"2026-03-20T14:00:00Z", workspaceId:"ws-ppi-media" },
  { id:"p3",  title:"Twitter: KI-Studie Teaser",               content:"67% der Marketing-Teams nutzen KI taeglich – aber nur 12% haben eine klare Strategie.\n\nDas ist die eigentliche Herausforderung. Unser Artikel zeigt, wie es geht.\n\n#KI #Marketing #Studie",                                                                                                               channels:["twitter"],             scheduledDate:"2026-03-18", scheduledTime:"08:00", status:"published", mediaId:null, campaignId:"c2", updatedAt:"2026-03-17T09:00:00Z", workspaceId:"ws-ppi-media" },
  { id:"p4",  title:"Facebook: Team-Vorstellung Maria",        content:"Wir stellen vor: Maria K., Head of Content.\n\nIch bin ueberzeugt, dass jede Marke eine echte Geschichte zu erzaehlen hat. Mein Job: diese Geschichte zu finden und auf den richtigen Kanaelen zu erzaehlen.\n\n#TeamSocialFlow #EmployerBranding",                                                           channels:["facebook","instagram"], scheduledDate:"2026-03-10", scheduledTime:"12:00", status:"published", mediaId:null, campaignId:"c3", updatedAt:"2026-03-09T11:00:00Z", workspaceId:"ws-ppi-media" },
  { id:"p5",  title:"LinkedIn: Remote Work Insights",          content:"Remote Work ist kein Kompromiss mehr – es ist unser Wettbewerbsvorteil.\n\n1. Vertrauen schlaegt Kontrolle\n2. Async-Kommunikation verbessert Entscheidungen\n3. Talente waehlen Flexibilitaet ueber Prestige\n\nBewerberzahl +340% seit 2023.\n\n#RemoteWork #EmployerBranding #Startup",                   channels:["linkedin"],            scheduledDate:"2026-02-28", scheduledTime:"08:30", status:"published", mediaId:null, campaignId:"c3", updatedAt:"2026-02-27T15:00:00Z", workspaceId:"ws-ppi-media" },
  { id:"p6",  title:"Instagram: Produkt-Teaser",               content:"Etwas kommt.\n\nKeine Spoiler. Nur so viel: Es wird alles aendern, wie Teams Content erstellen.\n\n15. April 2026. Save the date.\n\n#ComingSoon #SocialFlow #ContentMarketing",                                                                                                                             channels:["instagram","twitter"], scheduledDate:"2026-04-01", scheduledTime:"12:00", status:"published", mediaId:null, campaignId:"c1", updatedAt:"2026-03-30T10:00:00Z", workspaceId:"ws-ppi-media" },
  { id:"p7",  title:"LinkedIn: KI Suite Launch",               content:"Heute launchen wir die SocialFlow KI-Suite.\n\n-> KI schreibt Posts aus deinen Artikeln\n-> Automatisches SEO-Scoring\n-> Hashtag-Vorschlaege mit einem Klick\n-> Google-Vorschau im Editor\n\nKostenlos testen – Link in Kommentaren.\n\n#SocialFlow #Launch #KI #ContentMarketing",                         channels:["linkedin"],            scheduledDate:"2026-04-15", scheduledTime:"09:00", status:"scheduled", mediaId:null, campaignId:"c1", updatedAt:"2026-04-05T14:00:00Z", workspaceId:"ws-ppi-media" },
  { id:"p8",  title:"Instagram: Launch Countdown",             content:"3 Tage noch.\n\nDann zeigen wir, was wir gebaut haben. Es ist mehr als ein Tool.\n\nSeid dabei. Link in Bio.\n\n#Launch #SocialFlow #Countdown",                                                                                                                                                              channels:["instagram"],           scheduledDate:"2026-04-12", scheduledTime:"18:00", status:"scheduled", mediaId:null, campaignId:"c1", updatedAt:"2026-04-05T15:00:00Z", workspaceId:"ws-ppi-media" },
  { id:"p9",  title:"Twitter: Launch Day",                     content:"Wir launchen: SocialFlow KI-Suite\n\nEin Artikel -> alle Kanaele, automatisch optimiert.\n\nsocialflow-pro.pages.dev\n\n#Launch #KI #ContentMarketing",                                                                                                                                                         channels:["twitter"],             scheduledDate:"2026-04-15", scheduledTime:"09:05", status:"scheduled", mediaId:null, campaignId:"c1", updatedAt:"2026-04-05T14:30:00Z", workspaceId:"ws-ppi-media" },
  { id:"p10", title:"WhatsApp: Community Teaser",              content:"Hey! Morgen launchen wir die SocialFlow KI-Suite – ihr bekommt als erste einen Blick dahinter.\n\nEin Tool, das euren Content-Workflow komplett veraendert. Versprochen.\n\nMorgen um 9 Uhr. Seid dabei!",                                                                                                    channels:["whatsapp"],            scheduledDate:"2026-04-14", scheduledTime:"18:00", status:"scheduled", mediaId:null, campaignId:"c1", updatedAt:"2026-04-06T09:00:00Z", workspaceId:"ws-ppi-n3xt" },
  { id:"p11", title:"Facebook: Digital Summit Ankuendigung",   content:"Wir sind beim Digital Summit dabei!\n\n15. Mai 2026, Muenchen. Thema: Von der Idee zum Post – wie KI den Content-Prozess revolutioniert.\n\nWir verlosen 3x2 Freitickets: Post teilen + uns taggen.\n\n#DigitalSummit #Muenchen #Gewinnspiel",                                                                  channels:["facebook","instagram","linkedin"], scheduledDate:"2026-04-20", scheduledTime:"10:00", status:"scheduled", mediaId:null, campaignId:"c4", updatedAt:"2026-04-07T11:00:00Z", workspaceId:"ws-ppi-n3xt" },
  { id:"p12", title:"LinkedIn: Summit Speaker-Teaser",         content:"In 25 Tagen stehe ich auf der Buehne des Digital Summit Muenchen.\n\nVortrag: Von der Idee zum Artikel zum Post.\n\nLive-Demo: wie ein Artikel in Minuten zu Posts fuer alle Kanaele wird.\n\nLink zu Tickets in den Kommentaren.\n\n#DigitalSummit #Speaker #ContentMarketing",                              channels:["linkedin"],            scheduledDate:"2026-04-20", scheduledTime:"08:00", status:"scheduled", mediaId:null, campaignId:"c4", updatedAt:"2026-04-07T12:00:00Z", workspaceId:"ws-ppi-n3xt" },
  { id:"p13", title:"Instagram: 5 KI-Tipps Carousel",         content:"5 Wege, wie du KI fuer Content nutzen kannst:\n\n1/ Erste Entwuerfe – nicht das Finale\n2/ Varianten erstellen und beste auswaehlen\n3/ Keyword-Recherche beschleunigen\n4/ Bildunterschriften generieren und anpassen\n5/ Verschiedene Laengen fuer alle Kanaele\n\n#KI #ContentTipps #SocialMedia",             channels:["instagram"],           scheduledDate:"",           scheduledTime:"",      status:"draft",     mediaId:null, campaignId:"c2", updatedAt:"2026-04-08T09:00:00Z", workspaceId:"ws-ppi-n3xt" },
  { id:"p14", title:"LinkedIn: Studie Content ROI 2026",       content:"Neue Studie: Content Marketing ROI D-A-CH 2026.\n\n200 Marketing-Teams befragt:\n-> 78% sehen Content als Wachstumstreiber\n-> 23% messen den ROI systematisch\n-> Teams mit KI erstellen 3x mehr Content\n\nDer Vorteil liegt nicht im Volumen – sondern in der Reaktionsgeschwindigkeit.\n\n#Studie #ROI #KI",  channels:["linkedin"],            scheduledDate:"",           scheduledTime:"",      status:"draft",     mediaId:null, campaignId:"c2", updatedAt:"2026-04-08T10:30:00Z", workspaceId:"ws-ppi-n3xt" },
  { id:"p15", title:"Twitter: Zitat Authentizitaet",           content:"Authentizitaet ist kein Stil. Es ist eine Entscheidung, die du jeden Tag neu triffst.\n\n#Marketing #Authentizitaet #ContentMarketing",                                                                                                                                                                            channels:["twitter"],             scheduledDate:"",           scheduledTime:"",      status:"draft",     mediaId:null, campaignId:null,  updatedAt:"2026-04-08T11:00:00Z", workspaceId:"ws-ppi-talk" },
  { id:"p16", title:"LinkedIn: Job Senior Content Strategist", content:"Wir suchen: Senior Content Strategist (m/w/d) – Remote\n\nWas du mitbringst:\n-> 4+ Jahre Content Marketing oder Redaktion\n-> Erfahrung mit KI-Tools\n-> Verstaendnis fuer SEO und Social\n-> Muttersprachliches Deutsch\n\nBewerbung: karriere@socialflow.de\n\n#Jobs #ContentMarketing #RemoteWork",          channels:["linkedin","facebook"], scheduledDate:"2026-04-16", scheduledTime:"09:00", status:"pending",   mediaId:null, campaignId:"c3", updatedAt:"2026-04-07T16:00:00Z", workspaceId:"ws-ppi-talk" },
  { id:"p17", title:"Instagram: Summit Countdown",             content:"25 Tage bis zum Digital Summit Muenchen!\n\nWir fiebern schon mit. Ihr?\n\nTag uns in euren Stories – wir teilen die besten!\n\n#DigitalSummit #Muenchen #Event",                                                                                                                                               channels:["instagram"],           scheduledDate:"2026-04-20", scheduledTime:"12:00", status:"pending",   mediaId:null, campaignId:"c4", updatedAt:"2026-04-07T17:00:00Z", workspaceId:"ws-ppi-talk" },
  { id:"p18", title:"Facebook: Gewinnspiel-Erinnerung",        content:"Noch 3 Tage!\n\nGewinnspiel fuer 3x2 Freitickets zum Digital Summit endet Donnerstag.\n\nMitmachen: Post teilen + SocialFlow taggen. Gewinner Freitag.\n\n#Gewinnspiel #DigitalSummit #Event",                                                                                                                   channels:["facebook"],            scheduledDate:"2026-04-22", scheduledTime:"15:00", status:"pending",   mediaId:null, campaignId:"c4", updatedAt:"2026-04-08T08:00:00Z", workspaceId:"ws-ppi-talk" },
];

// block helpers
const h = (id, level, text) => ({id, type:"heading",   props:{level, textAlignment:"left"}, content:[{type:"text", text, styles:{}}], children:[]});
const p = (id, text)         => ({id, type:"paragraph", props:{textAlignment:"left"},        content:[{type:"text", text, styles:{}}], children:[]});

export const DEMO_STORIES = [
  {
    id:"story-1", title:"5 KI-Trends die dein Content Marketing 2026 veraendern",
    subtitle:"Warum Unternehmen, die jetzt nicht handeln, den Anschluss verlieren",
    category:"Tech", status:"ready",
    seoKeyword:"KI Content Marketing 2026",
    metaTitle:"5 KI-Trends im Content Marketing 2026 | SocialFlow",
    metaDesc:"Die 5 wichtigsten KI-Trends 2026 fuer Marketing-Teams – mit konkreten Handlungsempfehlungen.",
    hashtags:"#KI #ContentMarketing #Marketing2026 #KuenstlicheIntelligenz #DigitalMarketing #Trends #ContentStrategy",
    tags:"ki, content marketing, trends, 2026, kuenstliche intelligenz, marketing automation",
    blocks:[
      p("b1","Die Zahlen sprechen eine deutliche Sprache: 74% der Marketing-Teams in Deutschland setzen bereits KI-Tools ein. Doch nur 18% haben eine kohaerente Strategie dafuer. Der Unterschied zwischen diesen Gruppen wird 2026 zum entscheidenden Wettbewerbsfaktor."),
      h("b2",2,"Trend 1: Hyper-Personalisierung in Echtzeit"),
      p("b3","Generische Inhalte verschwinden. KI ermoeglicht es, denselben Artikel in Dutzenden personalisierten Versionen auszuspielen – je nach Branche, Unternehmensgroesse, Kaufphase und persoenlichem Verhalten des Lesers. Was frueher ein Heer von Textern erforderte, erledigt ein gut trainiertes Modell in Sekunden."),
      p("b4","Konkret bedeutet das: Ein B2B-SaaS-Unternehmen kann denselben Blog-Beitrag ueber Projektmanagement fuer den CFO, den IT-Leiter und den Operations-Manager jeweils anders formulieren – mit anderen Einstiegs-Hooks, anderen Beispielen, anderen CTAs."),
      h("b5",2,"Trend 2: Multimodale Content-Produktion"),
      p("b6","Aus einem Artikel werden automatisch Videos, Podcasts, Infografiken, Social-Media-Posts und Newsletter-Versionen. Die Zeiten, in denen Redakteure, Grafiker und Social-Manager separat taetig wurden, gehoeren der Vergangenheit an."),
      p("b7","Die wichtigste Kompetenz fuer Content-Teams 2026: Orchestrierung. Wer versteht, wie man KI-Systeme koordiniert, gewinnt."),
      h("b8",2,"Trend 3: Predictive Content Planning"),
      p("b9","KI analysiert Suchtrends, Social-Media-Signale und Competitor-Daten und empfiehlt proaktiv Themen – Wochen bevor sie im Mainstream ankommen. SocialFlow kombiniert diese Daten mit dem eigenen Performance-Verlauf und erstellt automatisch Redaktionsplaene."),
      h("b10",2,"Trend 4: KI als Co-Autor, nicht als Ghostwriter"),
      p("b11","Der groesste Fehler: menschliches Schreiben komplett durch KI ersetzen. Das Ergebnis klingt wie alle anderen. Die Gewinner nutzen KI als strukturgebende Kraft – und lassen menschliche Autoren Haltung, Ueberzeugungen und Charakter einbringen."),
      h("b12",2,"Trend 5: Content Performance in Echtzeit"),
      p("b13","KI-gestuetzte Analytics erkennen innerhalb der ersten Stunden nach Veroeffentlichung, ob ein Beitrag performen wird. Schwache Titel werden automatisch getestet, schlecht performende Posts erhalten optimierte Versionen."),
      h("b14",2,"Fazit: Die Frage ist nicht ob, sondern wie"),
      p("b15","Unternehmen, die KI strategisch einsetzen, produzieren 3x mehr Content bei 40% weniger Aufwand. Der beste Zeitpunkt fuer eine KI-Content-Strategie war vor einem Jahr. Der zweitbeste ist heute."),
    ],
    materials:[
      {id:"m1",type:"link",url:"https://www.statista.com/topics/3104/artificial-intelligence/",title:"Statista: KI in Marketing 2026",description:"",addedAt:"2026-04-02"},
      {id:"m2",type:"link",url:"https://contentmarketinginstitute.com/",title:"Content Marketing Institute Jahresstudie 2026",description:"",addedAt:"2026-04-02"},
      {id:"m3",type:"note",url:"",title:"Stat pruefen: 74% Quelle eigene Umfrage Q1 2026 n=200",description:"",addedAt:"2026-04-03"},
    ],
    derivatives:[{id:"d1",channel:"linkedin",postId:"p1",createdAt:"2026-04-04T10:00:00Z"},{id:"d2",channel:"twitter",postId:"p3",createdAt:"2026-04-04T10:05:00Z"}],
    targetChannels:["linkedin","twitter","website"], coverMediaId:null,
    createdAt:"2026-04-01", updatedAt:"2026-04-06T14:00:00Z", lockedBy:null,
    comments:[{id:"com1",text:"Abschnitt Trend 3 ist noch etwas duenn – mehr Beispiele waeren gut.",authorId:"2",authorName:"Maria K.",createdAt:"2026-04-05T09:30:00Z",resolved:false}],
    history:[{id:"h1",savedAt:"2026-04-01T16:00:00Z",savedBy:"Dietmar S.",wordCount:180,title:"5 KI-Trends"},{id:"h2",savedAt:"2026-04-04T11:00:00Z",savedBy:"Dietmar S.",wordCount:420,title:"5 KI-Trends die dein Content Marketing 2026 veraendern"}],
    workspaceId:"ws-ppi-media",
  },
  {
    id:"story-2", title:"Employer Branding im digitalen Zeitalter: Authentizitaet als Wettbewerbsvorteil",
    subtitle:"Wie moderne Unternehmen Top-Talente gewinnen – ohne Hochglanz-Broschueren",
    category:"Marketing", status:"ready",
    seoKeyword:"Employer Branding digital",
    metaTitle:"Employer Branding im digitalen Zeitalter | SocialFlow Blog",
    metaDesc:"Authentisches Employer Branding schlaegt jede Stellenanzeige. Wie Unternehmen 2026 Talente ueber Social Media gewinnen.",
    hashtags:"#EmployerBranding #HR #Recruiting #Talente #RemoteWork #Unternehmenskultur #NewWork #LinkedIn #Karriere",
    tags:"employer branding, recruiting, new work, unternehmenskultur, social media, linkedin",
    blocks:[
      p("b1","Der Arbeitsmarkt hat sich gedreht. Nicht Unternehmen waehlen Kandidaten aus – Kandidaten waehlen Unternehmen. Wer Top-Talente gewinnen will, braucht mehr als ein attraktives Gehalt. Er braucht eine Geschichte, die Menschen beruehrt."),
      h("b2",2,"Warum klassisches Employer Branding nicht mehr funktioniert"),
      p("b3","Hochglanz-Karriereseiten mit Stockfotos von laechelnden Menschen – das war gestern. Die Generation Z und Millennials durchschauen inszenierte Unternehmenskommunikation sofort. Sie suchen nach Ehrlichkeit: Wie sieht ein normaler Arbeitstag wirklich aus?"),
      h("b4",2,"Die 4 Saeulen des digitalen Employer Brandings"),
      p("b5","Erstens: Mitarbeiter als Markenbotschafter. Die authentischsten Inhalte kommen nicht von der PR-Abteilung – sie kommen von echten Mitarbeitern. Ein LinkedIn-Post eines Entwicklers erzeugt mehr Vertrauen als jede Kampagne."),
      p("b6","Zweitens: Transparenz ueber Prozesse. Retros, Stand-ups, Entscheidungsfindung – Einblicke in echte Prozesse bauen Vertrauen auf und ermoeglichen realistische Erwartungen bei Kandidaten."),
      p("b7","Drittens: Kanalspezifische Kommunikation. LinkedIn fuer berufliche Einblicke, Instagram fuer Kultur und Team-Moments. Jede Plattform hat ihre Sprache."),
      p("b8","Viertens: Konsistenz ueber Zeit. Employer Branding ist kein Projekt, es ist ein Dauerthema. Wer nur bei offenen Stellen postet, wird scheitern."),
      h("b9",2,"Messung und Optimierung"),
      p("b10","Die wichtigsten KPIs: Bewerbungsqualitaet, Time-to-Hire, Offer-Acceptance-Rate und Employee Net Promoter Score. Wer diese Zahlen mit Content-Aktivitaeten verknuepft, bekommt ein klares Bild."),
      h("b11",2,"Fazit"),
      p("b12","Employer Branding ist heute Content Marketing mit HR-Brille. Authentizitaet kostet kein Budget – sie kostet Mut."),
    ],
    materials:[
      {id:"m5",type:"link",url:"https://www.linkedin.com/business/talent/blog",title:"LinkedIn Talent Blog: Employer Branding 2026",description:"",addedAt:"2026-03-25"},
      {id:"m6",type:"note",url:"",title:"Interne Daten: Bewerberzahl +340% seit Remote-Einfuehrung – HR-Report 2025",description:"",addedAt:"2026-03-26"},
    ],
    derivatives:[{id:"d3",channel:"linkedin",postId:"p5",createdAt:"2026-03-27T09:00:00Z"}],
    targetChannels:["linkedin","instagram","website"], coverMediaId:null,
    createdAt:"2026-03-20", updatedAt:"2026-04-02T11:00:00Z", lockedBy:null, comments:[],
    history:[{id:"h3",savedAt:"2026-03-20T14:00:00Z",savedBy:"Maria K.",wordCount:240,title:"Employer Branding im digitalen Zeitalter"},{id:"h4",savedAt:"2026-04-01T10:00:00Z",savedBy:"Dietmar S.",wordCount:380,title:"Employer Branding: Authentizitaet als Wettbewerbsvorteil"}],
    workspaceId:"ws-ppi-media",
  },
  {
    id:"story-3", title:"Digital Summit 2026: Was euch in Muenchen erwartet",
    subtitle:"Speakers, Themen und warum dieses Event anders ist",
    category:"Marketing", status:"draft",
    seoKeyword:"Digital Summit Muenchen 2026",
    metaTitle:"Digital Summit Muenchen 2026 – Programm und Speaker | SocialFlow",
    metaDesc:"Der Digital Summit am 15. Mai in Muenchen: Top-Speaker, Live-Demos und Networking.",
    hashtags:"#DigitalSummit #Muenchen #Event #Marketing #ContentMarketing #KI #Networking",
    tags:"digital summit, muenchen, event, konferenz, marketing, speaker, 2026",
    blocks:[
      p("b1","Am 15. Mai 2026 findet in Muenchen der Digital Summit statt – und dieses Jahr ist alles anders. Kein Konferenz-Bingo mit generischen Keynotes. Stattdessen: Konkretes Handwerkszeug, ehrliche Fallstudien und echte Diskussionen."),
      h("b2",2,"Das Programm im Ueberblick"),
      p("b3","Drei parallele Tracks: Content und KI, Performance Marketing sowie Leadership und Kultur. Jeder Track hat vier Slots – kein Filler-Content, nur Speaker die wirklich etwas zu sagen haben."),
      h("b4",2,"Unsere Session: Von der Idee zum Post"),
      p("b5","Wir praesentieren um 14:30 Uhr im Content und KI Track. Die Session zeigt live, wie ein einziger Artikel mit SocialFlow in Minuten kanalspezifische Posts fuer Instagram, LinkedIn, X und WhatsApp wird."),
      h("b6",2,"Tickets und Rabatte"),
      p("b7","SocialFlow-Nutzer erhalten 20% Rabatt mit dem Code SOCIALFLOW2026. Ausserdem verlosen wir 3x2 Freitickets auf unseren Social-Media-Kanaelen."),
    ],
    materials:[
      {id:"m8",type:"link",url:"https://digital-summit.de",title:"Digital Summit 2026 – offizielle Website",description:"",addedAt:"2026-04-01"},
      {id:"m9",type:"note",url:"",title:"Slide-Deck fertigstellen bis 1. Mai – Abstimmung mit Designteam",description:"",addedAt:"2026-04-02"},
    ],
    derivatives:[], targetChannels:["linkedin","instagram","twitter","facebook","website"], coverMediaId:null,
    createdAt:"2026-04-05", updatedAt:"2026-04-08T08:00:00Z", lockedBy:null,
    comments:[{id:"com2",text:"Speaker-Bilder fehlen noch.",authorId:"2",authorName:"Maria K.",createdAt:"2026-04-07T14:00:00Z",resolved:false}],
    history:[],
    workspaceId:"ws-ppi-n3xt",
  },
  {
    id:"story-4", title:"LinkedIn vs. Instagram vs. TikTok: Wo ist deine Zielgruppe wirklich?",
    subtitle:"Ein datenbasierter Vergleich fuer B2B- und B2C-Marken",
    category:"Marketing", status:"draft",
    seoKeyword:"LinkedIn Instagram TikTok Vergleich",
    metaTitle:"LinkedIn vs. Instagram vs. TikTok fuer Unternehmen 2026",
    metaDesc:"Welche Plattform passt zu deiner Zielgruppe? Wir vergleichen LinkedIn, Instagram und TikTok mit echten Zahlen.",
    hashtags:"#LinkedIn #Instagram #TikTok #SocialMedia #Marketing #B2B #B2C #Plattformvergleich",
    tags:"linkedin, instagram, tiktok, social media, plattformvergleich, b2b, b2c, zielgruppe",
    blocks:[
      p("b1","Wir muessen auf TikTok. Diesen Satz hoert man in fast jedem Marketing-Meeting. Aber stimmt das wirklich? Und was ist mit LinkedIn? Ueberschaetzt oder die unterschaetzte Goldmine? Wir schauen auf die Daten."),
      h("b2",2,"LinkedIn: Das B2B-Powerhouse"),
      p("b3","LinkedIn hat 22 Millionen aktive Nutzer in Deutschland. Der durchschnittliche Nutzer ist 35-50 Jahre alt, hat Budgetverantwortung und sucht aktiv nach Loesungen. Fuer B2B-Unternehmen gibt es keine effizientere Plattform."),
      h("b4",2,"Instagram: Emotion und Kultur"),
      p("b5","Instagram ist fuer B2C-Marken erste Wahl. Aber auch B2B-Unternehmen nutzen Instagram erfolgreich – fuer Employer Branding und Unternehmenskultur. Der Schluessel: emotional, visuell stark, authentisch."),
      h("b6",2,"TikTok: Reichweite, aber fuer wen?"),
      p("b7","TikTok hat die hoechste organische Reichweite aller Plattformen. Die Herausforderung: Die Hauptzielgruppe ist 16-28 Jahre alt. Fuer Consumer-Brands perfekt. Fuer die meisten B2B-Anbieter sind andere Plattformen effizienter."),
      h("b8",2,"Empfehlung"),
      p("b9","Lieber 1-2 Plattformen mit voller Ueberzeugung bespielen als allen halbherzig zu folgen. Die Frage lautet: Wo ist deine Zielgruppe heute – nicht wo du theoretisch sein solltest."),
    ],
    materials:[
      {id:"m10",type:"link",url:"https://www.statista.com/topics/1164/social-networks/",title:"Statista: Social Media Nutzerzahlen Deutschland 2026",description:"",addedAt:"2026-04-03"},
      {id:"m11",type:"note",url:"",title:"Zielgruppen-Daten aus eigenem Tool validieren",description:"",addedAt:"2026-04-04"},
    ],
    derivatives:[], targetChannels:["linkedin","instagram","website","twitter"], coverMediaId:null,
    createdAt:"2026-04-03", updatedAt:"2026-04-08T10:00:00Z", lockedBy:null, comments:[], history:[],
    workspaceId:"ws-ppi-n3xt",
  },
  {
    id:"story-5", title:"Print ist nicht tot – es ist exklusiver geworden",
    subtitle:"Warum Printmedien 2026 wieder an Bedeutung gewinnen",
    category:"Marketing", status:"idea",
    seoKeyword:"Print Marketing 2026",
    metaTitle:"Print Marketing 2026 – Warum Print wieder wichtig wird",
    metaDesc:"In einer ueberfluteten digitalen Welt gewinnt das physische Medium wieder an Exklusivitaet und Wirkung.",
    hashtags:"#PrintMarketing #Print #Marketing2026 #ContentMarketing #Multichannel #OfflineMarketing",
    tags:"print, printmarketing, multichannel, offline, medien, 2026",
    blocks:[
      p("b1","Seit 15 Jahren lesen wir Schlagzeilen ueber den Tod des Printmediums. Und doch: 2026 erleben wir eine Renaissance. Hochwertige Magazine und kuratierte Jahresberichte kehren zurueck – nicht als Nostalgie, sondern als strategische Entscheidung."),
      h("b2",2,"Das Paradox der Aufmerksamkeit"),
      p("b3","In einer Welt, in der taeglich 500 Stunden Video auf YouTube hochgeladen werden, wird Stille zum Luxus. Ein hochwertiges Magazin landet auf dem Schreibtisch eines Entscheiders und verweilt dort – nicht 2 Sekunden wie ein Social-Post, sondern Wochen."),
      h("b4",2,"Wann lohnt sich Print?"),
      p("b5","Print lohnt sich, wenn die Zielgruppe wertvoll ist, das Produkt ein hohes Preis-Niveau hat, Haptik die Markenwahrnehmung staerkt und der Inhalt Zeitlosigkeit besitzt."),
    ],
    materials:[{id:"m12",type:"note",url:"",title:"Recherche: Print-Auflagen 2026 – welche Segmente wachsen?",description:"",addedAt:"2026-04-06"}],
    derivatives:[], targetChannels:["print","website","linkedin"], coverMediaId:null,
    createdAt:"2026-04-06", updatedAt:"2026-04-06T12:00:00Z", lockedBy:null, comments:[], history:[],
    workspaceId:"ws-ppi-talk",
  },
  {
    id:"story-6", title:"SocialFlow KI-Suite: Das haben wir 18 Monate gebaut",
    subtitle:"Ein ehrlicher Behind-the-Scenes-Bericht ueber Entwicklung, Fehler und den Launch",
    category:"Tech", status:"published",
    seoKeyword:"SocialFlow KI-Suite Launch",
    metaTitle:"SocialFlow KI-Suite: 18 Monate Entwicklung im Rueckblick",
    metaDesc:"Von der ersten Idee bis zum Launch: Was hinter der SocialFlow KI-Suite steckt.",
    hashtags:"#Launch #SocialFlow #KISuite #ContentMarketing #BehindTheScenes #Startup #KI #SaaS",
    tags:"launch, socialflow, ki, produktentwicklung, saas, startup, behind the scenes",
    blocks:[
      p("b1","Es begann mit einer schlichten Beobachtung: Content-Teams verbringen 60% ihrer Zeit mit Aufgaben ohne kreative Energie – Formatieren, Umschreiben fuer verschiedene Kanaele, Meta-Texte schreiben. Das musste sich aendern."),
      h("b2",2,"Die erste Idee: September 2024"),
      p("b3","Das erste Konzept war simpel: ein KI-Tool, das aus Blog-Artikeln automatisch Social-Media-Posts erstellt. Nach drei Wochen hatten wir einen Prototyp. Er war schrecklich. Die Posts klangen generisch, ohne Haltung, ohne Seele."),
      h("b4",2,"Der Pivot: Vom Tool zur Plattform"),
      p("b5","Nach Interviews mit 40 Content-Teams verstanden wir: Das Problem ist nicht die Texterstellung. Es ist der fehlende Workflow – von der Idee ueber Recherche, Schreiben, SEO-Optimierung bis zur kanalspezifischen Ableitung. Wir mussten breiter denken."),
      h("b6",2,"Was wir gelernt haben"),
      p("b7","KI-Features allein machen kein gutes Produkt. Was den Unterschied macht, ist der Workflow um sie herum. Wir haben mehr Zeit in die UX des Editors investiert als in die KI-Modelle selbst. Das war die richtige Entscheidung."),
      p("b8","Heute, am Launch-Tag, sind wir stolz – und wissen: Version 1.0 ist erst der Anfang. Was kommt? Analytics, Collaboration-Features und eine Kampagnen-KI, die Themen und Timings proaktiv empfiehlt."),
    ],
    materials:[
      {id:"m13",type:"note",url:"",title:"Produktvideo Schnitt bis 12. April",description:"",addedAt:"2026-04-01"},
      {id:"m14",type:"link",url:"https://socialflow-pro.pages.dev",title:"SocialFlow Pro – Live-URL",description:"",addedAt:"2026-04-01"},
    ],
    derivatives:[
      {id:"d4",channel:"linkedin",postId:"p7",createdAt:"2026-04-05T10:00:00Z"},
      {id:"d5",channel:"instagram",postId:"p8",createdAt:"2026-04-05T10:05:00Z"},
      {id:"d6",channel:"twitter",postId:"p9",createdAt:"2026-04-05T10:10:00Z"},
      {id:"d7",channel:"whatsapp",postId:"p10",createdAt:"2026-04-05T10:15:00Z"},
    ],
    targetChannels:["linkedin","instagram","twitter","whatsapp","website"], coverMediaId:null,
    createdAt:"2026-04-01", updatedAt:"2026-04-08T16:00:00Z", lockedBy:null, comments:[],
    history:[
      {id:"h5",savedAt:"2026-04-01T18:00:00Z",savedBy:"Dietmar S.",wordCount:150,title:"SocialFlow KI-Suite: Das haben wir 18 Monate gebaut"},
      {id:"h6",savedAt:"2026-04-04T09:00:00Z",savedBy:"Dietmar S.",wordCount:310,title:"SocialFlow KI-Suite: Das haben wir 18 Monate gebaut"},
      {id:"h7",savedAt:"2026-04-07T17:00:00Z",savedBy:"Maria K.",wordCount:390,title:"SocialFlow KI-Suite: Das haben wir 18 Monate gebaut"},
    ],
    workspaceId:"ws-alphabeta",
  },
];

export const DEMO_MEDIA = [
  // ppi Media (ws-ppi-media) — 4 items
  { id:"img-m1", workspaceId:"ws-ppi-media", name:"redaktion-team.jpg",    url:"https://picsum.photos/seed/ppimedia1/800/600", type:"image", size:245000, date:"08.04.2026", width:800, height:600, tags:"team, redaktion, buero", description:"Redaktionsteam bei der Arbeit", altText:"Redaktionsteam im Buero", category:"Team", focusPoint:{x:50,y:40}, mood:"professional", source:"upload" },
  { id:"img-m2", workspaceId:"ws-ppi-media", name:"druckmaschine.jpg",     url:"https://picsum.photos/seed/ppimedia2/1200/800", type:"image", size:412000, date:"07.04.2026", width:1200, height:800, tags:"druck, produktion, maschine", description:"Druckmaschine in der Produktion", altText:"Druckmaschine", category:"Produktion", focusPoint:{x:50,y:50}, mood:"industrial", source:"upload" },
  { id:"img-m3", workspaceId:"ws-ppi-media", name:"zeitung-titel.jpg",     url:"https://picsum.photos/seed/ppimedia3/900/600",  type:"image", size:198000, date:"06.04.2026", width:900, height:600, tags:"zeitung, print, titelseite", description:"Aktuelle Titelseite", altText:"Zeitung Titelseite", category:"Print", focusPoint:{x:50,y:30}, mood:"editorial", source:"upload" },
  { id:"img-m4", workspaceId:"ws-ppi-media", name:"konferenz-saal.jpg",    url:"https://picsum.photos/seed/ppimedia4/1000/700", type:"image", size:334000, date:"05.04.2026", width:1000, height:700, tags:"konferenz, meeting, buero", description:"Konferenzsaal fuer Redaktionskonferenz", altText:"Konferenzsaal", category:"Event", focusPoint:{x:50,y:50}, mood:"corporate", source:"upload" },
  // ppi n3xt (ws-ppi-n3xt) — 3 items
  { id:"img-n1", workspaceId:"ws-ppi-n3xt",  name:"ki-dashboard.jpg",      url:"https://picsum.photos/seed/ppinext1/1200/800", type:"image", size:287000, date:"08.04.2026", width:1200, height:800, tags:"ki, tech, dashboard, software", description:"KI-Dashboard Screenshot", altText:"KI-Dashboard Interface", category:"Tech", focusPoint:{x:50,y:50}, mood:"tech", source:"upload" },
  { id:"img-n2", workspaceId:"ws-ppi-n3xt",  name:"developer-team.jpg",    url:"https://picsum.photos/seed/ppinext2/800/600",  type:"image", size:203000, date:"07.04.2026", width:800, height:600, tags:"team, entwickler, tech, remote", description:"Entwicklerteam beim Standup", altText:"Entwicklerteam", category:"Team", focusPoint:{x:50,y:45}, mood:"dynamic", source:"upload" },
  { id:"img-n3", workspaceId:"ws-ppi-n3xt",  name:"product-launch.jpg",    url:"https://picsum.photos/seed/ppinext3/1000/700", type:"image", size:356000, date:"06.04.2026", width:1000, height:700, tags:"produkt, launch, praesentation", description:"Produkt-Launch Praesentation", altText:"Produkt Launch Event", category:"Event", focusPoint:{x:60,y:40}, mood:"excited", source:"upload" },
  // ppi Talk (ws-ppi-talk) — 3 items
  { id:"img-t1", workspaceId:"ws-ppi-talk",   name:"podcast-studio.jpg",    url:"https://picsum.photos/seed/ppitalk1/900/600",  type:"image", size:178000, date:"08.04.2026", width:900, height:600, tags:"podcast, studio, audio, mikrofon", description:"Podcast-Aufnahme im Studio", altText:"Podcast Studio", category:"Event", focusPoint:{x:50,y:50}, mood:"creative", source:"upload" },
  { id:"img-t2", workspaceId:"ws-ppi-talk",   name:"event-buehne.jpg",      url:"https://picsum.photos/seed/ppitalk2/1200/800", type:"image", size:445000, date:"07.04.2026", width:1200, height:800, tags:"event, buehne, vortrag, publikum", description:"Vortrag auf der Buehne", altText:"Buehne mit Redner", category:"Event", focusPoint:{x:50,y:35}, mood:"energetic", source:"upload" },
  { id:"img-t3", workspaceId:"ws-ppi-talk",   name:"community-dinner.jpg",  url:"https://picsum.photos/seed/ppitalk3/800/600",  type:"image", size:223000, date:"05.04.2026", width:800, height:600, tags:"community, networking, event, abendessen", description:"Community Networking Abend", altText:"Networking Event", category:"Team", focusPoint:{x:50,y:50}, mood:"warm", source:"upload" },
  // alphabeta neo (ws-alphabeta) — 3 items
  { id:"img-a1", workspaceId:"ws-alphabeta",  name:"design-studio.jpg",     url:"https://picsum.photos/seed/alphabeta1/1000/700", type:"image", size:312000, date:"08.04.2026", width:1000, height:700, tags:"design, studio, kreativ, workspace", description:"Kreativ-Studio von alphabeta neo", altText:"Design Studio", category:"Team", focusPoint:{x:50,y:50}, mood:"creative", source:"upload" },
  { id:"img-a2", workspaceId:"ws-alphabeta",  name:"kampagne-visual.jpg",   url:"https://picsum.photos/seed/alphabeta2/1200/800", type:"image", size:489000, date:"07.04.2026", width:1200, height:800, tags:"kampagne, visual, werbung, grafik", description:"Kampagnen-Visual fuer Stadtmuseum", altText:"Kampagnen Visual", category:"Kampagne", focusPoint:{x:40,y:50}, mood:"artistic", source:"upload" },
  { id:"img-a3", workspaceId:"ws-alphabeta",  name:"preiszeremonie.jpg",    url:"https://picsum.photos/seed/alphabeta3/900/600",  type:"image", size:267000, date:"06.04.2026", width:900, height:600, tags:"preis, award, zeremonie, design", description:"Designpreis-Verleihung 2026", altText:"Preisverleihung", category:"Event", focusPoint:{x:50,y:45}, mood:"celebratory", source:"upload" },
];

// ── Creation Voodoo demo projects ────────────────────────────────────────────
export const DEMO_PROJECTS = [];

// ── Voodoo content-source types ──────────────────────────────────────────────
export const VOODOO_SOURCE_TYPES = [
  { id:"story",  label:"Story",            icon:"BookOpen"  },
  { id:"post",   label:"Publisher-Post",   icon:"Send"      },
  { id:"media",  label:"Medienbibliothek", icon:"Image"     },
  { id:"url",    label:"Externe URL",      icon:"Globe"     },
];
