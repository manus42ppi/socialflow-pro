import { useState, useEffect, useRef, useCallback } from "react";
import {
  RefreshCw, ExternalLink, TrendingUp, Flame, Clock,
  Newspaper, Instagram, Facebook, MessageCircle, Wifi, WifiOff,
  AlertCircle, Heart, MessageSquare, Share2, BadgeCheck,
  Globe, Search, Zap, BarChart2, Users, Target, Plus, X, ChevronRight,
  FileText, Code2, Activity, Linkedin, Twitter, Youtube, Music2,
  CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp,
  Calendar, Smile, Frown, Meh, Image, Link, Monitor, Smartphone,
  Shield, BookOpen, Sparkles, Play, Eye, ExternalLink as ExtLink,
  Building2, Info,
} from "lucide-react";
import { C, T, FONT, FONT_DISPLAY, IW } from "../constants/colors.js";
import { Card, Btn } from "../components/ui/index.jsx";

// ── Feed sources ──────────────────────────────────────────────────────────────
const NEWS_SOURCES = [
  { id:"all",        label:"Alle Quellen", color:"#6B7280",  url:null },
  { id:"tagesschau", label:"Tagesschau",   color:"#003399",  url:"https://www.tagesschau.de/xml/rss2/" },
  { id:"dw",         label:"DW",           color:"#0066B3",  url:"https://rss.dw.com/xml/rss-de-all" },
  { id:"ntv",        label:"n-tv",         color:"#CC1414",  url:"https://www.n-tv.de/rss" },
  { id:"heise",      label:"Heise",        color:"#009900",  url:"https://www.heise.de/rss/heise-atom.xml" },
  { id:"t3n",        label:"t3n",          color:"#E8501A",  url:"https://t3n.de/rss.xml" },
  { id:"golem",      label:"Golem",        color:"#2D6A4F",  url:"https://rss.golem.de/rss.php?feed=ATOM1.0" },
];
const ALL_SOURCE_IDS = ["tagesschau","dw","ntv","heise"];

// ── RSS fetch ─────────────────────────────────────────────────────────────────
const RSS_PROXY = "/rss?url=";
const RSS2JSON  = "https://api.rss2json.com/v1/api.json?count=25&rss_url=";

function withTimeout(ms) {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

function parseRssXml(xml, src) {
  try {
    const doc   = new DOMParser().parseFromString(xml, "text/xml");
    const items = [...doc.querySelectorAll("item, entry")];
    return items.slice(0, 25).map(item => {
      const txt    = tag => item.querySelector(tag)?.textContent?.trim() || "";
      const linkEl = item.querySelector("link");
      const link   = linkEl?.textContent?.trim() || linkEl?.getAttribute("href") || "";
      const thumb  =
        item.querySelector("enclosure[type^='image']")?.getAttribute("url") ||
        item.querySelector("enclosure")?.getAttribute("url") ||
        item.getElementsByTagNameNS("http://search.yahoo.com/mrss/","thumbnail")[0]?.getAttribute("url") ||
        item.getElementsByTagNameNS("http://search.yahoo.com/mrss/","content")[0]?.getAttribute("url") || null;
      const raw  = txt("description") || txt("summary") || txt("content");
      const desc = raw.replace(/<[^>]+>/g,"").replace(/&[a-z]+;/g," ").replace(/\s+/g," ").trim().slice(0,150);
      const title = (txt("title")||"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
      return { id:link||txt("guid"), title, link, pubDate:txt("pubDate")||txt("published"), description:desc, thumbnail:thumb, sourceLabel:src.label, sourceColor:src.color };
    }).filter(a => a.title && a.link);
  } catch { return []; }
}

async function fetchFeed(src) {
  // Strategy 1: CF Pages Function /rss (server-side, no CORS)
  try {
    const { signal, clear } = withTimeout(10000);
    const res = await fetch(`${RSS_PROXY}${encodeURIComponent(src.url)}`, { signal });
    clear();
    if (res.ok) {
      const items = parseRssXml(await res.text(), src);
      if (items.length) return items;
    }
  } catch { /**/ }
  // Strategy 2: rss2json.com
  try {
    const { signal, clear } = withTimeout(8000);
    const res  = await fetch(`${RSS2JSON}${encodeURIComponent(src.url)}`, { signal });
    clear();
    const data = await res.json();
    if (data.status === "ok" && data.items?.length) {
      return data.items.map(item => ({
        id: item.link||item.guid, title:(item.title||"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").trim(),
        link:item.link, pubDate:item.pubDate,
        description:(item.description||"").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim().slice(0,150),
        thumbnail:item.thumbnail||item.enclosure?.link||null, sourceLabel:src.label, sourceColor:src.color,
      })).filter(a => a.title && a.link);
    }
  } catch { /**/ }
  // Strategy 3: allorigins fallback
  try {
    const { signal, clear } = withTimeout(10000);
    const res  = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(src.url)}`, { signal });
    clear();
    const json = await res.json();
    if (json?.contents) {
      const items = parseRssXml(json.contents, src);
      if (items.length) return items;
    }
  } catch { /**/ }
  return [];
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const s = (Date.now()-d)/1000;
  if (s < 60)    return "gerade";
  if (s < 3600)  return `${Math.round(s/60)} Min.`;
  if (s < 86400) return `${Math.round(s/3600)} Std.`;
  return `${Math.round(s/86400)} Tagen`;
}

// ── Viral posts mock data ─────────────────────────────────────────────────────
// Real post-level data requires private OAuth APIs.
// We simulate realistic viral posts based on publicly observable pattern data.

const VIRAL_POSTS = {
  instagram: {
    "1h": [
      { id:"ig1h1", user:"@diegosanchez.photo", verified:true,  caption:"Morgenrot über den Alpen – kein Filter, pure Magie 🌄 Aufgestanden um 4 Uhr für diesen Moment. Manchmal braucht man nur den Mut aufzustehen. #nature #alps #photography #sunrise", img:"mountain",  likes:"318K", comments:"14.2K", shares:"52K",  growth:"+1.240%", type:"Reels", ago:"12 Min." },
      { id:"ig1h2", user:"@kochstudio.de",       verified:false, caption:"Dieses 5-Minuten-Pasta-Rezept hat meinen Alltag verändert 🍝 Einfacher geht's nicht! Speichern für später 👇 Alle Zutaten in den Kommentaren! #foodie #pasta #cooking #easyrecipe", img:"food",       likes:"204K", comments:"8.7K",  shares:"31K",  growth:"+890%",   type:"Reels", ago:"28 Min." },
      { id:"ig1h3", user:"@techinsider.de",      verified:true,  caption:"ChatGPT kann das jetzt auch?! 😱 Dieses neue Feature verändert alles für Content Creator. Ich teste es seit 2 Wochen und bin komplett überzeugt. Thread👇 #ai #contentcreator #tech #openai", img:"tech",       likes:"156K", comments:"22.1K", shares:"44K",  growth:"+760%",   type:"Post",  ago:"44 Min." },
      { id:"ig1h4", user:"@urban.explore",       verified:false, caption:"Lost Place in Brandenburg – dieses verlassene Sanatorium existiert wirklich. Mehr Fotos in meiner Story 👻 #urbex #lostplace #abandoned #photography", img:"city",       likes:"98K",  comments:"6.4K",  shares:"18K",  growth:"+640%",   type:"Post",  ago:"53 Min." },
      { id:"ig1h5", user:"@hunde.de",            verified:false, caption:"Er wartet jeden Tag um 17:30 Uhr an der Tür. Seit 6 Jahren. 🐕 Das nenne ich Loyalität. #dogs #pet #love #hunde", img:"animals",    likes:"74K",  comments:"4.1K",  shares:"29K",  growth:"+510%",   type:"Reels", ago:"58 Min." },
    ],
    "6h": [
      { id:"ig6h1", user:"@minimaliving",        verified:true,  caption:"Mein Appartement mit 28qm in München – wie ich den Raum optimal nutze 🏠 Jeder Quadratzentimeter zählt. Thread im Profil. #minimalism #smallspace #interior #munich", img:"interior",   likes:"892K", comments:"41K",  shares:"118K", growth:"+430%",   type:"Reels", ago:"2 Std." },
      { id:"ig6h2", user:"@dr.bewegung",         verified:true,  caption:"10 Minuten morgens – diese Routine hat mir 3 Jahre gegeben. Kein Witz. Ich mache das seit 4 Jahren konsequent durch, auch wenn ich keine Lust habe. Ergebnis: 0 Krankentage. #fitness #health #morningroutine #longevity", img:"fitness",    likes:"674K", comments:"28.4K", shares:"94K",  growth:"+310%",   type:"Reels", ago:"3 Std." },
      { id:"ig6h3", user:"@streetfood.world",    verified:false, caption:"Die besten Straßengerichte aus 40 Ländern in einem Video 🌍🍜 Welches Land hat für euch das beste Essen? Abstimmung in den Kommentaren! #travel #food #streetfood #worldfood", img:"streetfood",  likes:"541K", comments:"19.2K", shares:"77K",  growth:"+280%",   type:"Reels", ago:"5 Std." },
      { id:"ig6h4", user:"@kunstwelten",         verified:true,  caption:"Dieser 19-jährige Künstler aus Köln malt mit verbundenen Augen. Das Ergebnis lässt mich sprachlos. 🎨 Sein Atelier öffnet nächsten Monat. #art #painting #talent #kunst", img:"art",        likes:"428K", comments:"15.7K", shares:"61K",  growth:"+245%",   type:"Post",  ago:"4 Std." },
      { id:"ig6h5", user:"@karriere.hacks",      verified:false, caption:"Ich habe 50 Bewerbungsgespräche analysiert. Diese 3 Sätze haben immer den Job geholt 💼 Speichern, bevor du es vergisst! #career #jobsuche #bewerbung #success", img:"business",   likes:"312K", comments:"11.2K", shares:"84K",  growth:"+220%",   type:"Post",  ago:"5 Std." },
    ],
    "24h": [
      { id:"ig24h1", user:"@nasa",               verified:true,  caption:"Webb Telescope just captured something we've never seen before. The universe never stops surprising us 🌌 Full image and explanation in our bio link. #space #nasa #science #webb #universe", img:"space",      likes:"4.2M", comments:"182K", shares:"560K", growth:"+124%",   type:"Post",  ago:"8 Std." },
      { id:"ig24h2", user:"@humansofberlin",     verified:true,  caption:"»Ich habe 30 Jahre gewartet, um diesen Satz zu sagen.« – Klaus, 67, stand heute vor dem Haus seiner Kindheit, das er wegen der Wende verlassen musste. #humansofberlin #story #berlin #history", img:"portrait",   likes:"2.8M", comments:"94K",  shares:"310K", growth:"+98%",    type:"Post",  ago:"14 Std." },
      { id:"ig24h3", user:"@sustainability.now", verified:false, caption:"Unser Ozean schluckt täglich 22 Millionen Tonnen CO₂. Dieser Clip zeigt, wie das aussieht. 🌊 Was können wir tun? Alle Infos in unserem Link in Bio. #climate #ocean #environment #sustainability", img:"ocean",      likes:"1.9M", comments:"67K",  shares:"248K", growth:"+87%",    type:"Reels", ago:"19 Std." },
      { id:"ig24h4", user:"@sport.moments",      verified:true,  caption:"Dieser Moment wird in die Geschichte eingehen. 🏆 Was für ein Comeback. Niemand hat das erwartet. #sports #champion #motivation #never give up", img:"sport",      likes:"1.4M", comments:"53K",  shares:"192K", growth:"+79%",    type:"Reels", ago:"16 Std." },
      { id:"ig24h5", user:"@kinder.welt",        verified:false, caption:"Sie fragte mich: »Papa, warum weinst du?« Ich antwortete: »Vor Freude.« Dieser Moment hat alles verändert 👨‍👧 #family #kids #fatherhood #love #parenthood", img:"kids",       likes:"1.1M", comments:"44K",  shares:"167K", growth:"+71%",    type:"Post",  ago:"22 Std." },
    ],
  },
  facebook: {
    "1h": [
      { id:"fb1h1", user:"ADAC",              verified:true,  caption:"WARNUNG: Diese Autobahnstrecken sind heute massiv überlastet – aktuelle Stauwarnungen für euren Weg nach Hause. A3, A9, A8 betroffen. Jetzt Alternativrouten prüfen!", img:"traffic",   likes:"41K",  comments:"8.9K",  shares:"28K",  growth:"+920%",   type:"Beitrag", ago:"8 Min." },
      { id:"fb1h2", user:"ARD Tagesschau",    verified:true,  caption:"BREAKING: Bundesregierung beschließt neues Energiepaket. Was das für euren Strompreis bedeutet ›› Alle Details in unserem ausführlichen Bericht.", img:"politics",  likes:"29K",  comments:"15.2K", shares:"19K",  growth:"+680%",   type:"Artikel", ago:"22 Min." },
      { id:"fb1h3", user:"Rezepte der Woche", verified:false, caption:"Dieses Erdbeer-Tiramisu ist gerade überall! Nur 4 Zutaten und 20 Minuten 🍓 Rezept in den Kommentaren – bitte teilen damit ihr es nicht verliert!", img:"dessert",   likes:"18K",  comments:"3.4K",  shares:"22K",  growth:"+540%",   type:"Video",   ago:"51 Min." },
      { id:"fb1h4", user:"Wetter.de",         verified:true,  caption:"UNWETTERWARNUNG für Bayern und Baden-Württemberg: Schwere Gewitter mit Hagel und Starkregen ab 16 Uhr erwartet. Fahrt möglichst nicht raus!", img:"city",      likes:"34K",  comments:"5.1K",  shares:"41K",  growth:"+480%",   type:"Beitrag", ago:"35 Min." },
      { id:"fb1h5", user:"Spaß & Humor DE",   verified:false, caption:"Wenn der Chef fragt ob du übers Wochenende arbeiten kannst und du sagst »Nein, ich habe schon Pläne« aber deine Pläne heißen: Sofa 😂 Wer kennt das?", img:"art",       likes:"62K",  comments:"7.8K",  shares:"55K",  growth:"+390%",   type:"Meme",    ago:"47 Min." },
    ],
    "6h": [
      { id:"fb6h1", user:"SWR",               verified:true,  caption:"Dieses Dorf in Baden-Württemberg produziert mehr Energie als es verbraucht – wie funktioniert das? Eine Reportage über die Energiewende von unten.", img:"solar",     likes:"124K", comments:"18.7K", shares:"67K",  growth:"+290%",   type:"Artikel", ago:"1 Std." },
      { id:"fb6h2", user:"Stern",             verified:true,  caption:"Das Foto eines 9-Jährigen gewinnt den renommiertesten Naturfoto-Preis der Welt 📸 Die Jury war schockiert, dass ein Kind so einen Blick hat.", img:"award",     likes:"98K",  comments:"7.2K",  shares:"81K",  growth:"+240%",   type:"Foto",    ago:"4 Std." },
      { id:"fb6h3", user:"Focus Online",      verified:true,  caption:"Forscher entdecken: Diese eine Gewohnheit am Abend verdoppelt die Schlafqualität. Und nein, es ist nicht kein Handy – das klappt wirklich.", img:"sleep",     likes:"76K",  comments:"12.4K", shares:"54K",  growth:"+210%",   type:"Artikel", ago:"5 Std." },
      { id:"fb6h4", user:"Tier-Videos",       verified:false, caption:"Dieser Hund rettet täglich eine Katze – seit 3 Jahren. Die Geschichte dahinter bringt selbst hartgesottene Tierfreunde zum Weinen 🐕🐈", img:"animals",   likes:"148K", comments:"9.4K",  shares:"112K", growth:"+195%",   type:"Video",   ago:"2 Std." },
      { id:"fb6h5", user:"NDR",               verified:true,  caption:"Hamburg testet als erste deutsche Stadt autofreie Innenstadt an Wochenenden. Was sagen die Bürger dazu? Umfrage-Ergebnisse überraschen.", img:"city",      likes:"87K",  comments:"24.1K", shares:"43K",  growth:"+175%",   type:"Artikel", ago:"3 Std." },
    ],
    "24h": [
      { id:"fb24h1", user:"Spiegel Online",   verified:true,  caption:"Exklusiv: Das steckt wirklich hinter dem größten Datenleck in der deutschen Geschichte. Millionen Bürgerdaten betroffen. Was ihr jetzt tun solltet.", img:"data",      likes:"312K", comments:"89K",  shares:"144K", growth:"+88%",    type:"Artikel", ago:"9 Std." },
      { id:"fb24h2", user:"ZDF",              verified:true,  caption:"Diese Dokumentation über die Arbeit in deutschen Krankenhäusern bewegt gerade ganz Deutschland. Pfleger und Ärzte sprechen offen – selten so berührt.", img:"hospital",  likes:"248K", comments:"54K",  shares:"123K", growth:"+72%",    type:"Video",   ago:"15 Std." },
      { id:"fb24h3", user:"Hochzeitsmomente", verified:false, caption:"Er hatte keine Hände – und trotzdem diese Hochzeit 💍 Das bewegt gerade alle. Ein Zeichen dafür, dass Liebe keine Grenzen kennt.", img:"wedding",   likes:"1.8M", comments:"142K", shares:"298K", growth:"+65%",    type:"Video",   ago:"21 Std." },
      { id:"fb24h4", user:"Galileo",          verified:true,  caption:"Was passiert wenn man 30 Tage lang keinen Zucker isst? Unser Reporter hat's probiert. Tag 1 bis 30 – das hätte er nicht gedacht.", img:"fitness",   likes:"189K", comments:"31K",  shares:"97K",  growth:"+58%",    type:"Video",   ago:"12 Std." },
      { id:"fb24h5", user:"Watson.de",        verified:true,  caption:"»Warum ich mit 32 allen meinen Besitz verschenkt habe« – diese Geschichte eines Münchners geht viral. Und sie macht nachdenklich.", img:"portrait",  likes:"156K", comments:"28K",  shares:"81K",  growth:"+51%",    type:"Artikel", ago:"18 Std." },
    ],
  },
  whatsapp: {
    "1h": [
      { id:"wa1h1", icon:"⚡", category:"Breaking",    caption:"Strom wird ab Mai deutlich günstiger – Vergleichsrechner jetzt prüfen",                                      fullText:"Mehrere Vergleichsportale melden: Für Neukunden sinken die Strompreise ab Mai um bis zu 18%. Empfehlung: Vertrag jetzt kündigen und Angebote vergleichen. Bekannte Links werden gerade massenhaft geteilt.",               fwds:"Sehr hoch", detail:"Massiv in Familien- und Nachbarschaftsgruppen geteilt", ago:"6 Min." },
      { id:"wa1h2", icon:"🚨", category:"Warnung",     caption:"Achtung: Neue Phishing-Welle mit gefälschten DHL-Nachrichten im Umlauf",                                     fullText:"Aktuell kursiert eine neue Welle gefälschter DHL-Paketnachrichten per SMS und WhatsApp. Der Link führt auf eine täuschend echte Seite, die Kreditkartendaten stiehlt. Bitte niemals draufklicken. Weiterleiten an alle die ihr kennt!",       fwds:"Sehr hoch", detail:"Verbreitet sich in Eltern- und Arbeits-Gruppen", ago:"19 Min." },
      { id:"wa1h3", icon:"😂", category:"Humor",       caption:"KI-generierter Sketch über deutsche Bürokratie – absolut legendär",                                          fullText:"Ein 3-minütiger KI-generierter Comedy-Clip der zeigt wie ein Ausländer versucht, sich in Deutschland anzumelden. Die Bürokratie-Szenen sind so real, dass man nicht weiß ob man lachen oder weinen soll. Schaut unbedingt!",               fwds:"Hoch",      detail:"Viral in Freundesgruppen 25–45", ago:"38 Min." },
      { id:"wa1h4", icon:"🌡️", category:"Gesundheit",  caption:"Krankenkassen warnen: Neuer Erreger breitet sich aus – Symptome checken",                                    fullText:"Mehrere AOK-Bezirksstellen informieren über einen neuen Magenvirus der sich schnell ausbreitet. Inkubationszeit: 12-24h. Hauptsymptome: Übelkeit, Bauchkrämpfe, Durchfall. Handhygiene besonders wichtig jetzt!",                         fwds:"Sehr hoch", detail:"Stark in Eltern- und Senioren-Gruppen", ago:"52 Min." },
      { id:"wa1h5", icon:"🎉", category:"Lokal",       caption:"Kostenloses Konzert heute Abend – kurzfristige Nachricht an alle Berliner",                                   fullText:"Kurzfristig: Heute Abend ab 19 Uhr findet am Brandenburger Tor ein kostenloses Open-Air-Konzert statt. Programm wurde wegen guter Wetterlage spontan aufgestellt. Info vom offiziellen Berliner Kulturkanal.",                           fwds:"Hoch",      detail:"Lokal stark in Berlin-Gruppen geteilt", ago:"44 Min." },
    ],
    "6h": [
      { id:"wa6h1", icon:"💡", category:"Tipp",        caption:"Stromverbrauch senken: 7 Tricks die wirklich funktionieren (Kurzanleitung)",                                  fullText:"Kurzanleitung die gerade überall geteilt wird: 1) Standby-Geräte trennen (spart bis 80€/Jahr), 2) LED-Beleuchtung komplett umstellen, 3) Waschmaschine nachts laufen lassen (Niedrigtarif), 4) Kühlschrank Temperatur optimieren... (6 weitere Tipps im Link)",  fwds:"Sehr hoch", detail:"Top-Beitrag in Haus- und Familiengruppen", ago:"1 Std." },
      { id:"wa6h2", icon:"🏥", category:"Gesundheit",  caption:"Neue Studie: Dieser Vitaminmangel betrifft 60% der Deutschen – Test zuhause",                               fullText:"Eine neue Studie der Uni Köln zeigt: 60% der Deutschen haben einen kritischen Vitamin-D-Mangel ohne es zu wissen. Symptome: chronische Müdigkeit, Haarausfall, Stimmungstiefs. Selbsttest: 3 Wochen Supplementierung, dann Blutbild machen.",   fwds:"Hoch",      detail:"Starke Weiterleitung in Gesundheits-Gruppen", ago:"3 Std." },
      { id:"wa6h3", icon:"📺", category:"Medien",      caption:"Diese Doku sollte jeder gesehen haben – Link zur ARD Mediathek (kostenlos)",                                  fullText:"Die ARD-Dokumentation »Deutschland im Wandel« läuft noch 6 Monate in der Mediathek. Zeigt sehr ehrlich wie sich Arbeit, Familie und Gesellschaft in D verändert haben. Besonders die Episode über Pflege und Altersarmut ist erschütternd.",    fwds:"Hoch",      detail:"Verbreitet sich in Familien- und Kulturgruppen", ago:"5 Std." },
      { id:"wa6h4", icon:"💼", category:"Karriere",    caption:"Home-Office: Neue Regelung ab Juni – was Arbeitnehmer jetzt wissen müssen",                                   fullText:"Ab Juni gilt: Arbeitgeber müssen Home-Office-Vereinbarungen schriftlich festhalten. Wer das nicht hat, kann laut Gewerkschaft ab dann 2 Tage/Woche einfordern. Checkliste für das Gespräch mit dem Chef wird gerade massiv geteilt.",          fwds:"Sehr hoch", detail:"Stark in Berufsgruppen und unter 35-Jährigen", ago:"2 Std." },
      { id:"wa6h5", icon:"🌿", category:"Ernährung",   caption:"Dieser Smoothie verbrennt nachweislich Bauchfett – Rezept nur heute kostenlos",                               fullText:"Ernährungsberaterin Monika K. teilt heute ihr 15-Euro-Rezept kostenlos: Ingwer, Kurkuma, Zitrone, grüner Apfel, Spinat. Morgens nüchtern trinken. Nach 3 Wochen soll der Bauchbereich messbar schlanker sein. Studie verlinkt.",             fwds:"Hoch",      detail:"Viral in Fitness- und Frauengruppen", ago:"4 Std." },
    ],
    "24h": [
      { id:"wa24h1", icon:"🌍", category:"Klima",      caption:"Klimaforscher live-erklärt: Warum 2025 das entscheidende Jahr wird (7 Min.)",                                 fullText:"Prof. Dr. Stefan Rahmstorf vom PIK erklärt in einem 7-minütigen Video, das jetzt viral geht, warum 2025 der Kipppunkt für den Klimawandel sein könnte. Verständlich erklärt, keine Panikmache. Das Video wurde bereits 4 Millionen mal geteilt.",  fwds:"Sehr hoch", detail:"Millionenfach plattformübergreifend geteilt", ago:"6 Std." },
      { id:"wa24h2", icon:"💰", category:"Geld",       caption:"Riester-Rente: Betroffene können jetzt Geld zurückverlangen – Anleitung",                                    fullText:"Musterschreiben das gerade massenhaft geteilt wird: Riester-Sparer, die zwischen 2010 und 2020 Abschlussgebühren gezahlt haben, können laut BGH-Urteil vom März 2025 rückwirkend Erstattung verlangen. Einfaches Musterformular zum Download.",   fwds:"Sehr hoch", detail:"Renner in Beratungs- und Elterngruppen", ago:"11 Std." },
      { id:"wa24h3", icon:"🎓", category:"Wissen",     caption:"Professorin erklärt in 3 Minuten warum KI Bildung nicht ersetzen kann",                                       fullText:"Prof. Katharina Zweig (TU Kaiserslautern) in einem kurzen Clip der jetzt überall kursiert: »KI kann Wissen abrufen aber nicht verstehen. Kinder müssen das Denken lernen, nicht das Googeln.« Besonders in Eltern-Chats massiv viral.",         fwds:"Hoch",      detail:"Viral in Lehrer-, Eltern- und Studentengruppen", ago:"18 Std." },
      { id:"wa24h4", icon:"🏠", category:"Wohnen",     caption:"Mietpreisbremse greift jetzt wirklich – so prüfst du ob du zu viel zahlst",                                   fullText:"Mieterverein-Anleitung die gerade millionenfach geteilt wird: In 5 Schritten herausfinden ob deine Miete legal ist. Über 40% aller Mieter zahlen laut Studie zu viel. Kostenloser Online-Check im Link. Für alle Städte über 100.000 Einwohner.",  fwds:"Sehr hoch", detail:"Top in Wohn- und Verbraucher-Gruppen", ago:"14 Std." },
      { id:"wa24h5", icon:"🤖", category:"Tech",       caption:"ChatGPT-Alternative aus Deutschland startet heute kostenlos – besser für Datenschutz",                         fullText:"Heute startet Aleph Alpha's neue KI-Plattform kostenlos für Privatnutzer. Deutsches Rechenzentrum, DSGVO-konform, keine Datenweitergabe an US-Server. Die Einladungs-Codes werden gerade in Tech-Gruppen gesammelt. Link zum kostenlosen Start.",  fwds:"Hoch",      detail:"Stark in Tech- und Datenschutz-Gruppen", ago:"20 Std." },
    ],
  },
};

const IMG_SEEDS = {
  mountain:"1040", food:"429",   tech:"0",    interior:"1029", fitness:"225",
  streetfood:"431",space:"911",  portrait:"64",ocean:"1001",   city:"1031",
  animals:"582",   sport:"1041", kids:"26",    art:"1043",      business:"159",
  traffic:"177",   politics:"374",dessert:"493",solar:"397",   award:"584",
  sleep:"142",     data:"366",   hospital:"116",wedding:"219",
};
function postImg(key, w=320, h=180) {
  return `https://picsum.photos/id/${IMG_SEEDS[key]||"100"}/${w}/${h}`;
}

// ── Mock trends (hashtags / topics) ──────────────────────────────────────────
function buildInstaTrends(seed = 0) {
  const base = [
    { tag:"#sustainability",   posts:"14.2M", d:"+21%", hot:true  },
    { tag:"#ai",               posts:"9.8M",  d:"+38%", hot:true  },
    { tag:"#contentcreator",   posts:"7.4M",  d:"+28%", hot:true  },
    { tag:"#wellness",         posts:"6.1M",  d:"+14%"             },
    { tag:"#digitalmarketing", posts:"5.2M",  d:"+11%"             },
    { tag:"#entrepreneur",     posts:"4.7M",  d:"+9%"              },
    { tag:"#mentalhealth",     posts:"4.3M",  d:"+17%"             },
    { tag:"#smallbusiness",    posts:"3.8M",  d:"+8%"              },
  ];
  return base.map((item,i) => ({ ...item, posts:(parseFloat(item.posts)+((seed+i)%3)*0.1).toFixed(1)+"M" }));
}
function buildFbTrends() {
  return [
    { topic:"KI & Technologie",       engagement:"Sehr hoch", change:"+34%" },
    { topic:"Wirtschaft & Finanzen",  engagement:"Sehr hoch", change:"+18%" },
    { topic:"Gesundheit & Vorsorge",  engagement:"Hoch",      change:"+14%" },
    { topic:"Politik & Gesellschaft", engagement:"Hoch",      change:"+12%" },
    { topic:"Lokale Nachrichten",     engagement:"Hoch",      change:"+10%" },
    { topic:"Sport & Fitness",        engagement:"Mittel",    change:"+7%"  },
  ];
}
const ENG_CLR = { "Sehr hoch":"#16A34A", "Hoch":"#2563EB", "Mittel":"#D97706" };
const REFRESH_INTERVAL = 5 * 60 * 1000;

// ── Compact list row ──────────────────────────────────────────────────────────
function ViralPostRow({ post, platform, accent, rank, onClick }) {
  const isWa = platform === "whatsapp";
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", gap:10, alignItems:"flex-start",
        padding:"9px 8px", borderRadius:8, cursor:"pointer",
        background: hov ? C.bg : "transparent",
        borderBottom:`1px solid ${C.borderLight}`,
        transition:"background .1s",
      }}>
      {/* Rank */}
      <div style={{ minWidth:18, fontSize:11, fontWeight:800, color: rank<=3 ? accent : C.textMute, fontFamily:FONT, paddingTop:2, flexShrink:0 }}>{rank}</div>

      {/* Thumbnail */}
      {!isWa ? (
        <div style={{ position:"relative", flexShrink:0 }}>
          <img src={postImg(post.img, 80, 58)} alt="" loading="lazy"
            style={{ width:72, height:52, objectFit:"cover", borderRadius:6, display:"block" }}
            onError={e => { e.currentTarget.style.display="none"; }}/>
          <span style={{ position:"absolute", bottom:3, left:3, fontSize:8, fontWeight:700, padding:"1px 4px", borderRadius:3, background:"rgba(0,0,0,.6)", color:"#fff" }}>{post.type}</span>
        </div>
      ) : (
        <div style={{ width:40, height:40, borderRadius:8, background: accent+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:18 }}>{post.icon}</div>
      )}

      {/* Text */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:3 }}>
          {!isWa ? (
            <>
              <span style={{ fontSize:11, fontWeight:700, color:C.text }}>{post.user}</span>
              {post.verified && <BadgeCheck size={10} color={accent} strokeWidth={2.5}/>}
            </>
          ) : (
            <span style={{ fontSize:9.5, fontWeight:700, padding:"1px 6px", borderRadius:4, color: accent, background: accent+"18" }}>{post.category}</span>
          )}
          <span style={{ fontSize:9.5, color:C.textMute, marginLeft:"auto", flexShrink:0 }}>{post.ago}</span>
        </div>
        <div style={{ fontSize:11.5, color:C.textSoft, lineHeight:1.4, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{post.caption}</div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
          {!isWa ? (
            <>
              <span style={{ display:"flex", alignItems:"center", gap:2, fontSize:10, color:C.textMute }}><Heart size={9} strokeWidth={2} color="#EF4444"/>{post.likes}</span>
              <span style={{ display:"flex", alignItems:"center", gap:2, fontSize:10, color:C.textMute }}><MessageSquare size={9} strokeWidth={2}/>{post.comments}</span>
              <span style={{ display:"flex", alignItems:"center", gap:2, fontSize:10, color:C.textMute }}><Share2 size={9} strokeWidth={2}/>{post.shares}</span>
              <span style={{ marginLeft:"auto", fontSize:10, fontWeight:700, color:"#16A34A", display:"flex", alignItems:"center", gap:2 }}><TrendingUp size={9} strokeWidth={2.5}/>{post.growth}</span>
            </>
          ) : (
            <span style={{ fontSize:10, color:C.textMute, display:"flex", alignItems:"center", gap:3 }}>
              <Share2 size={9} strokeWidth={2}/>
              <span style={{ fontWeight:700, color:ENG_CLR[post.fwds]||C.textMute }}>{post.fwds}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function ViralPostModal({ post, platform, accent, onClose }) {
  if (!post) return null;
  const isWa = platform === "whatsapp";
  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(2px)" }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:460, maxHeight:"88vh", overflow:"auto", boxShadow:"0 24px 64px rgba(0,0,0,.22)" }}>

        {/* Image */}
        {!isWa && post.img && (
          <div style={{ position:"relative" }}>
            <img src={postImg(post.img, 920, 480)} alt="" loading="lazy"
              style={{ width:"100%", height:220, objectFit:"cover", display:"block", borderRadius:"16px 16px 0 0" }}
              onError={e => { e.currentTarget.style.display="none"; }}/>
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,.25) 0%, transparent 50%)", borderRadius:"16px 16px 0 0" }}/>
            <div style={{ position:"absolute", top:12, left:14, display:"flex", gap:6 }}>
              <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:10, background:"rgba(0,0,0,.5)", color:"#fff", backdropFilter:"blur(4px)" }}>{post.type}</span>
            </div>
            <div style={{ position:"absolute", top:12, right:14 }}>
              <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:10, background:"#EF4444", color:"#fff", display:"flex", alignItems:"center", gap:3 }}>
                <Flame size={10} strokeWidth={2.5}/>{post.growth}
              </span>
            </div>
            {/* Close button on image */}
            <button onClick={onClose} style={{ position:"absolute", top:10, right: post.growth ? 110 : 14, width:28, height:28, borderRadius:"50%", border:"none", background:"rgba(0,0,0,.45)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, backdropFilter:"blur(4px)" }}>×</button>
          </div>
        )}

        {/* Header for WhatsApp (no image) */}
        {isWa && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 18px 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:44, height:44, borderRadius:10, background: accent+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{post.icon}</div>
              <div>
                <span style={{ fontSize:12, fontWeight:700, padding:"2px 8px", borderRadius:5, color:accent, background:accent+"18" }}>{post.category}</span>
                <div style={{ fontSize:10.5, color:C.textMute, marginTop:3 }}>{post.ago}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width:28, height:28, borderRadius:"50%", border:`1px solid ${C.border}`, background:C.bg, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:C.textMid }}>×</button>
          </div>
        )}

        <div style={{ padding:"16px 18px 20px" }}>
          {/* Author */}
          {!isWa && (
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:accent+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontSize:11, fontWeight:800, color:accent }}>{post.user.replace("@","").slice(0,2).toUpperCase()}</span>
              </div>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{post.user}</span>
                  {post.verified && <BadgeCheck size={13} color={accent} strokeWidth={2.5}/>}
                </div>
                <div style={{ fontSize:10.5, color:C.textMute }}>{post.ago}</div>
              </div>
              <button onClick={onClose} style={{ marginLeft:"auto", width:28, height:28, borderRadius:"50%", border:`1px solid ${C.border}`, background:C.bg, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:C.textMid }}>×</button>
            </div>
          )}

          {/* Full caption */}
          <div style={{ fontSize:13.5, color:C.text, lineHeight:1.6, marginBottom:14, whiteSpace:"pre-line" }}>
            {post.caption}
          </div>

          {/* Full text (WhatsApp) */}
          {isWa && post.fullText && (
            <div style={{ fontSize:13, color:C.textSoft, lineHeight:1.65, padding:"12px 14px", background:"#F0FDF4", borderRadius:10, border:"1px solid #A7F3D0", marginBottom:14 }}>
              {post.fullText}
            </div>
          )}

          {/* Metrics */}
          {!isWa ? (
            <div style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 14px", background:C.bg, borderRadius:10 }}>
              <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:C.textMid }}>
                <Heart size={14} strokeWidth={2} color="#EF4444"/><strong>{post.likes}</strong>
              </span>
              <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:C.textMid }}>
                <MessageSquare size={14} strokeWidth={2}/><strong>{post.comments}</strong>
              </span>
              <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:C.textMid }}>
                <Share2 size={14} strokeWidth={2}/><strong>{post.shares}</strong>
              </span>
              <span style={{ marginLeft:"auto", fontSize:12, fontWeight:800, color:"#16A34A", display:"flex", alignItems:"center", gap:4 }}>
                <TrendingUp size={13} strokeWidth={2.5}/>{post.growth}
              </span>
            </div>
          ) : (
            <div style={{ padding:"10px 14px", background:C.bg, borderRadius:10 }}>
              <div style={{ fontSize:11.5, color:C.textMid, marginBottom:4 }}>
                Weiterleitungsrate: <strong style={{ color:ENG_CLR[post.fwds]||C.textMute }}>{post.fwds}</strong>
              </div>
              <div style={{ fontSize:11.5, color:C.textSoft }}>{post.detail}</div>
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ fontSize:10, color:C.textMute, marginTop:12, lineHeight:1.5 }}>
            Simulierte Trending-Daten basierend auf öffentlich verfügbaren Signalen. Keine echten Nutzerdaten.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Domain helpers ────────────────────────────────────────────────────────────
function cleanDomain(input) {
  try {
    let d = input.trim().toLowerCase();
    if (!d.startsWith("http")) d = "https://" + d;
    const url = new URL(d);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return input.trim().toLowerCase().replace(/^www\./, "");
  }
}

function fmtNum(n) {
  if (n == null) return "–";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

// ── Domain-Analyse tab ────────────────────────────────────────────────────────
const ANALYZE_STEPS = ["Verbinde…", "Analysiere Tech-Stack…", "KI generiert Insights…"];

function ScoreBadge({ label, value }) {
  const v = value ?? 0;
  const color = v >= 90 ? "#16A34A" : v >= 50 ? "#D97706" : "#DC2626";
  const bg    = v >= 90 ? "#DCFCE7"  : v >= 50 ? "#FEF3C7"  : "#FEE2E2";
  const r     = 22;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * (v / 100);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={56} height={56} viewBox="0 0 56 56">
        <circle cx={28} cy={28} r={r} fill={bg} stroke={C.border} strokeWidth={2}/>
        <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 28 28)"/>
        <text x={28} y={33} textAnchor="middle" fontSize={13} fontWeight={700} fill={color}>{v}</text>
      </svg>
      <span style={{ fontSize:10.5, color:C.textMid, fontWeight:600 }}>{label}</span>
    </div>
  );
}

function TrendBadge({ signal }) {
  const map = { wachsend:["#16A34A","#DCFCE7","▲"], stabil:["#D97706","#FEF3C7","→"], rückläufig:["#DC2626","#FEE2E2","▼"] };
  const [clr, bg, icon] = map[signal] || [C.textMute, C.borderLight, "–"];
  return (
    <span style={{ fontSize:11, fontWeight:700, color:clr, background:bg, borderRadius:20, padding:"2px 10px" }}>
      {icon} {signal || "–"}
    </span>
  );
}

function DomainAnalyseTab() {
  const [domain,    setDomain]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [stepIdx,   setStepIdx]   = useState(0);
  const [data,      setData]      = useState(null);
  const [err,       setErr]       = useState(null);
  const [clients,   setClients]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("sf_research_clients") || "[]"); } catch { return []; }
  });
  const stepTimer = useRef();

  async function analyze(raw) {
    const d = cleanDomain(raw || domain);
    if (!d) return;
    setLoading(true); setErr(null); setData(null); setStepIdx(0);
    let si = 0;
    stepTimer.current = setInterval(() => {
      si = Math.min(si + 1, ANALYZE_STEPS.length - 1);
      setStepIdx(si);
    }, 3000);
    try {
      const res  = await fetch("/analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ domain: d }) });
      const json = await res.json();
      if (json.error) { setErr(json.error); return; }
      setData(json);
    } catch (e) {
      setErr(e.message || "Unbekannter Fehler");
    } finally {
      clearInterval(stepTimer.current);
      setLoading(false);
    }
  }

  function saveClient() {
    const d = data?.domain;
    if (!d) return;
    const next = [{ domain:d, ts: new Date().toISOString() }, ...clients.filter(c => c.domain !== d)].slice(0, 20);
    setClients(next);
    localStorage.setItem("sf_research_clients", JSON.stringify(next));
  }

  const card = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", marginBottom:14 };
  const ai   = data?.ai;

  return (
    <div style={{ maxWidth:860, margin:"0 auto", paddingBottom:40 }}>

      {/* Search bar */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"0 12px" }}>
          <Globe size={15} strokeWidth={IW} color={C.textMute}/>
          <input
            value={domain}
            onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === "Enter" && analyze()}
            placeholder="domain.de oder https://example.com"
            style={{ flex:1, border:"none", outline:"none", fontFamily:FONT, fontSize:13, color:C.text, background:"transparent", padding:"10px 0" }}
          />
        </div>
        <button
          onClick={() => analyze()}
          disabled={loading || !domain.trim()}
          style={{ padding:"0 20px", borderRadius:10, border:"none", background:C.accent, color:"#fff", cursor:loading?"default":"pointer", fontFamily:FONT, fontSize:13, fontWeight:700, opacity:loading||!domain.trim()?0.6:1 }}>
          {loading ? "…" : "Analysieren"}
        </button>
      </div>

      {/* Previous clients */}
      {clients.length > 0 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
          {clients.map(c => (
            <button key={c.domain} onClick={() => { setDomain(c.domain); analyze(c.domain); }}
              style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, border:`1px solid ${C.border}`, background:C.surface, color:C.textMid, cursor:"pointer", fontFamily:FONT }}>
              {c.domain}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ ...card, display:"flex", flexDirection:"column", alignItems:"center", padding:"36px 18px", gap:16 }}>
          <div style={{ width:36, height:36, border:`3px solid ${C.accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
          <div style={{ fontSize:14, fontWeight:600, color:C.textMid, fontFamily:FONT }}>
            {ANALYZE_STEPS[stepIdx]}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {ANALYZE_STEPS.map((s, i) => (
              <div key={s} style={{ width:6, height:6, borderRadius:"50%", background: i <= stepIdx ? C.accent : C.border, transition:"background .3s" }}/>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {err && !loading && (
        <div style={{ ...card, color:"#DC2626", fontSize:13 }}>
          <AlertCircle size={14} strokeWidth={2} style={{ marginRight:6, verticalAlign:"middle" }}/>{err}
        </div>
      )}

      {/* Results */}
      {data && !loading && ai && (
        <>
          {/* Header card */}
          <div style={{ ...card }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:C.text, letterSpacing:"-.3px" }}>{data.domain}</div>
                <div style={{ display:"flex", gap:8, marginTop:6, flexWrap:"wrap" }}>
                  {ai.category && <span style={{ fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20, background:C.accentLight, color:C.accent }}>{ai.category}</span>}
                  {ai.audienceType && <span style={{ fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20, background:"#F3F4F6", color:C.textMid }}>{ai.audienceType}</span>}
                  {ai.trendSignal && <TrendBadge signal={ai.trendSignal}/>}
                </div>
              </div>
              <button onClick={saveClient} style={{ fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, color:C.textMid, cursor:"pointer", fontFamily:FONT, display:"flex", alignItems:"center", gap:5 }}>
                <Plus size={12} strokeWidth={2.5}/>Als Client speichern
              </button>
            </div>
          </div>

          {/* Traffic row */}
          <div style={{ display:"flex", gap:12, marginBottom:14 }}>
            {[
              { label:"Monatliche Besucher", value:fmtNum(ai.trafficEstimate?.monthly), icon:<Users size={16} strokeWidth={IW} color={C.accent}/> },
              { label:"Global Rank",          value:ai.globalRank ? "#"+fmtNum(ai.globalRank) : "–",  icon:<BarChart2 size={16} strokeWidth={IW} color={C.accent}/> },
              { label:"SEO-Wert (EUR/Monat)", value:ai.seo?.seoValue ? fmtNum(ai.seo.seoValue)+"€" : "–", icon:<TrendingUp size={16} strokeWidth={IW} color={C.accent}/> },
            ].map(m => (
              <div key={m.label} style={{ ...card, flex:1, marginBottom:0, textAlign:"center", padding:"16px 12px" }}>
                <div style={{ marginBottom:6 }}>{m.icon}</div>
                <div style={{ fontSize:22, fontWeight:800, color:C.text }}>{m.value}</div>
                <div style={{ fontSize:11, color:C.textMute, marginTop:4 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* AI Summary */}
          {ai.summary && (
            <div style={{ ...card, background:C.accentLight, border:`1px solid ${C.accent}33` }}>
              <div style={{ fontSize:11.5, fontWeight:700, color:C.accent, marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
                <Zap size={12} strokeWidth={2.5}/>KI-Fazit
              </div>
              <p style={{ margin:0, fontSize:13, color:C.text, lineHeight:1.65 }}>{ai.summary}</p>
            </div>
          )}

          {/* Stärken & Schwächen */}
          {(ai.strengths?.length > 0 || ai.weaknesses?.length > 0) && (
            <div style={{ display:"flex", gap:12, marginBottom:14 }}>
              <div style={{ ...card, flex:1, marginBottom:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#16A34A", marginBottom:8 }}>Stärken</div>
                {ai.strengths?.map((s, i) => (
                  <div key={i} style={{ display:"flex", gap:7, marginBottom:5, fontSize:12.5, color:C.textMid, lineHeight:1.5 }}>
                    <span style={{ color:"#16A34A", fontWeight:700, flexShrink:0 }}>•</span>{s}
                  </div>
                ))}
              </div>
              <div style={{ ...card, flex:1, marginBottom:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#DC2626", marginBottom:8 }}>Schwächen</div>
                {ai.weaknesses?.map((w, i) => (
                  <div key={i} style={{ display:"flex", gap:7, marginBottom:5, fontSize:12.5, color:C.textMid, lineHeight:1.5 }}>
                    <span style={{ color:"#DC2626", fontWeight:700, flexShrink:0 }}>•</span>{w}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tech-Stack */}
          {data.tech && Object.keys(data.tech).length > 0 && (
            <div style={{ ...card }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:10 }}>Tech-Stack</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {Object.entries(data.tech).map(([cat, tools]) =>
                  Array.isArray(tools) && tools.map(t => (
                    <span key={cat+t} title={cat} style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:C.bg, border:`1px solid ${C.border}`, color:C.textMid }}>
                      {t}
                    </span>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Performance scores */}
          {data.pagespeed && (
            <div style={{ ...card }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:12 }}>PageSpeed Scores</div>
              <div style={{ display:"flex", gap:24, justifyContent:"center", flexWrap:"wrap" }}>
                <ScoreBadge label="Performance"    value={data.pagespeed.performance}    />
                <ScoreBadge label="Accessibility"  value={data.pagespeed.accessibility}  />
                <ScoreBadge label="SEO"            value={data.pagespeed.seo}            />
                <ScoreBadge label="Best Practices" value={data.pagespeed.bestPractices}  />
              </div>
            </div>
          )}

          {/* Empfehlungen */}
          {ai.recommendations?.length > 0 && (
            <div style={{ ...card }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
                <Target size={13} strokeWidth={2}/>Empfehlungen
              </div>
              {ai.recommendations.map((r, i) => (
                <div key={i} style={{ display:"flex", gap:10, marginBottom:8, fontSize:12.5, color:C.textMid, lineHeight:1.55 }}>
                  <span style={{ minWidth:20, height:20, borderRadius:"50%", background:C.accentLight, color:C.accent, fontWeight:700, fontSize:10.5, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</span>
                  {r}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Wettbewerber tab ──────────────────────────────────────────────────────────
function WettbewerberTab() {
  const [domains,   setDomains]   = useState(["spiegel.de", "focus.de"]);
  const [input,     setInput]     = useState("");
  const [results,   setResults]   = useState({});
  const [loading,   setLoading]   = useState({});
  const [analyzed,  setAnalyzed]  = useState(false);

  function addDomain() {
    const d = cleanDomain(input);
    if (!d || domains.includes(d) || domains.length >= 4) return;
    setDomains(prev => [...prev, d]);
    setInput("");
  }

  function removeDomain(d) {
    setDomains(prev => prev.filter(x => x !== d));
    setResults(prev => { const n = {...prev}; delete n[d]; return n; });
  }

  async function analyzeAll() {
    setAnalyzed(true);
    const newLoading = {};
    domains.forEach(d => { newLoading[d] = true; });
    setLoading(newLoading);

    const tasks = domains.map(async d => {
      try {
        const res  = await fetch("/analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ domain: d }) });
        const json = await res.json();
        setResults(prev => ({ ...prev, [d]: json }));
      } catch {
        setResults(prev => ({ ...prev, [d]: { error: true } }));
      } finally {
        setLoading(prev => ({ ...prev, [d]: false }));
      }
    });
    await Promise.all(tasks);
  }

  const card = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px" };

  // Find winner for a numeric metric (highest = green)
  function isWinner(domain, getter) {
    const vals = domains.map(d => getter(results[d])).filter(v => v != null && !isNaN(v));
    if (vals.length < 2) return false;
    const max = Math.max(...vals);
    const mine = getter(results[domain]);
    return mine != null && mine === max;
  }

  const allDone = domains.length > 0 && domains.every(d => results[d] && !loading[d]);

  return (
    <div style={{ maxWidth:1000, margin:"0 auto", paddingBottom:40 }}>

      {/* Add input */}
      <div style={{ ...card, marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:10 }}>Domains vergleichen (max. 4)</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
          {domains.map(d => (
            <div key={d} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:20, background:C.accentLight, color:C.accent, border:`1px solid ${C.accent}33` }}>
              {d}
              <button onClick={() => removeDomain(d)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", padding:0, color:C.accent }}>
                <X size={11} strokeWidth={2.5}/>
              </button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addDomain()}
            placeholder="domain.de eingeben…"
            disabled={domains.length >= 4}
            style={{ flex:1, border:`1px solid ${C.border}`, borderRadius:8, outline:"none", padding:"7px 12px", fontFamily:FONT, fontSize:12.5, color:C.text, background:domains.length>=4?C.bg:C.surface }}
          />
          <button onClick={addDomain} disabled={domains.length >= 4 || !input.trim()}
            style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:700, color:C.textMid, opacity:domains.length>=4||!input.trim()?0.5:1 }}>
            <Plus size={14} strokeWidth={2.5}/>
          </button>
          <button onClick={analyzeAll} disabled={domains.length === 0}
            style={{ padding:"7px 18px", borderRadius:8, border:"none", background:C.accent, color:"#fff", cursor:domains.length===0?"default":"pointer", fontFamily:FONT, fontSize:12.5, fontWeight:700, opacity:domains.length===0?0.6:1 }}>
            Alle analysieren
          </button>
        </div>
      </div>

      {/* Per-domain loading spinners */}
      {analyzed && !allDone && (
        <div style={{ display:"flex", gap:12, marginBottom:14, flexWrap:"wrap" }}>
          {domains.map(d => (
            <div key={d} style={{ ...card, flex:1, minWidth:140, display:"flex", alignItems:"center", gap:10, padding:"12px 14px" }}>
              {loading[d] ? (
                <div style={{ width:16, height:16, border:`2px solid ${C.accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite", flexShrink:0 }}/>
              ) : results[d]?.error ? (
                <AlertCircle size={14} strokeWidth={2} color="#DC2626"/>
              ) : (
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#16A34A", flexShrink:0 }}/>
              )}
              <span style={{ fontSize:12.5, fontWeight:600, color:C.text }}>{d}</span>
            </div>
          ))}
        </div>
      )}

      {/* Comparison table */}
      {allDone && (
        <>
          <div style={{ ...card, marginBottom:14, overflowX:"auto" }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:12 }}>Vergleich</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FONT, fontSize:12.5 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:"left", padding:"6px 10px", color:C.textMute, fontSize:11, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>Metrik</th>
                  {domains.map(d => (
                    <th key={d} style={{ textAlign:"center", padding:"6px 10px", color:C.text, fontSize:12, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label:"Monatl. Traffic",    get: r => r?.ai?.trafficEstimate?.monthly,                       fmt: v => fmtNum(v),   higher:"good" },
                  { label:"Global Rank",         get: r => r?.ai?.globalRank ? -r.ai.globalRank : null,           fmt: v => v!=null ? "#"+fmtNum(-v) : "–", higher:"good" },
                  { label:"Performance Score",   get: r => r?.pagespeed?.performance,                             fmt: v => v!=null ? v+"/100" : "–", higher:"good" },
                  { label:"Trend-Signal",        get: r => null,                                                   fmt: (_, d) => results[d]?.ai?.trendSignal || "–", higher:null },
                  { label:"Kategorie",           get: r => null,                                                   fmt: (_, d) => results[d]?.ai?.category || "–",       higher:null },
                  { label:"Zielgruppe",          get: r => null,                                                   fmt: (_, d) => results[d]?.ai?.audienceType || "–",   higher:null },
                  { label:"Top Keywords",        get: r => null,                                                   fmt: (_, d) => results[d]?.ai?.behavior?.topKeywords?.slice(0,3).join(", ") || "–", higher:null },
                ].map(row => (
                  <tr key={row.label}>
                    <td style={{ padding:"8px 10px", color:C.textMid, fontWeight:600, borderBottom:`1px solid ${C.borderLight}`, whiteSpace:"nowrap" }}>{row.label}</td>
                    {domains.map(d => {
                      const r      = results[d];
                      const val    = row.get(r);
                      const winner = row.higher && isWinner(d, row.get);
                      return (
                        <td key={d} style={{
                          padding:"8px 10px", textAlign:"center", borderBottom:`1px solid ${C.borderLight}`,
                          background: winner ? "#DCFCE7" : "transparent",
                          color: winner ? "#16A34A" : C.text,
                          fontWeight: winner ? 700 : 400,
                        }}>
                          {row.fmt(val, d)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stärken per domain */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {domains.map(d => {
              const strengths = results[d]?.ai?.strengths || [];
              return (
                <div key={d} style={{ ...card, flex:"1 1 200px", minWidth:200 }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:C.text, marginBottom:8 }}>{d}</div>
                  {strengths.length > 0 ? strengths.map((s, i) => (
                    <div key={i} style={{ display:"flex", gap:6, marginBottom:5, fontSize:12, color:C.textMid, lineHeight:1.5 }}>
                      <span style={{ color:"#16A34A", fontWeight:700, flexShrink:0 }}>•</span>{s}
                    </div>
                  )) : <span style={{ fontSize:12, color:C.textMute }}>–</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── AI helper for new tabs ─────────────────────────────────────────────────────
async function researchAI(messages, system = "") {
  const res = await fetch("/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4096, system, messages }),
  });
  const d = await res.json();
  if (d?.error) throw new Error(d.error.message || "KI-Fehler");
  return d?.content?.[0]?.text || "";
}
function parseJSONBlock(text) {
  try {
    const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    return JSON.parse(m ? m[1] : text);
  } catch { return null; }
}
function cleanDomainStr(s) {
  return s.trim().replace(/^https?:\/\/(www\.)?/, "").split("/")[0].replace(/\/$/, "").toLowerCase();
}

// ── Tab 4: Content-Audit ─────────────────────────────────────────────────────

const TONE_META_CA = {
  sachlich:      { color:"#6366f1", bg:"#eef2ff", label:"Sachlich" },
  informativ:    { color:"#0891b2", bg:"#e0f2fe", label:"Informativ" },
  professionell: { color:"#1d4ed8", bg:"#dbeafe", label:"Professionell" },
  technisch:     { color:"#7c3aed", bg:"#ede9fe", label:"Technisch" },
  analytisch:    { color:"#059669", bg:"#d1fae5", label:"Analytisch" },
  humorvoll:     { color:"#f59e0b", bg:"#fef3c7", label:"Humorvoll" },
  emotional:     { color:"#ec4899", bg:"#fce7f3", label:"Emotional" },
  meinungsstark: { color:"#dc2626", bg:"#fee2e2", label:"Meinungsstark" },
  unterhaltend:  { color:"#f97316", bg:"#ffedd5", label:"Unterhaltend" },
  werblich:      { color:"#84cc16", bg:"#f7fee7", label:"Werblich" },
};
const SENT_COLOR_CA = { positiv: C.success, neutral: C.warning, negativ: "#ef4444" };
const SENT_ICON_CA  = { positiv: Smile, neutral: Meh, negativ: Frown };

function ToneBadgeCA({ tone }) {
  const key = (tone || "").toLowerCase();
  const m = TONE_META_CA[key] || { color: C.accent, bg: C.accentLight, label: tone };
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99, color:m.color, background:m.bg, border:`1px solid ${m.color}30` }}>
      {m.label}
    </span>
  );
}

function SeoCheckCardCA({ check, idx }) {
  const [open, setOpen] = useState(idx < 2);
  const ST = {
    ok:      { color:"#16a34a", bg:"#dcfce7", icon:CheckCircle   },
    warning: { color:"#d97706", bg:"#fef3c7", icon:AlertTriangle },
    error:   { color:"#dc2626", bg:"#fee2e2", icon:AlertCircle   },
  };
  const sm = ST[check.status] || ST.warning;
  const Ico = sm.icon;
  return (
    <div style={{ borderBottom:`1px solid ${C.border}` }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:10,
        padding:"12px 4px", background:"none", border:"none", cursor:"pointer", textAlign:"left", fontFamily:FONT,
      }}>
        <Ico size={15} color={sm.color} strokeWidth={IW} style={{ flexShrink:0 }} />
        <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99, color:sm.color, background:sm.bg, flexShrink:0 }}>
          {check.category}
        </span>
        <div style={{ flex:1, fontSize:13, fontWeight:600, color:C.text }}>{check.title}</div>
        {open ? <ChevronUp size={13} color={C.textSoft} strokeWidth={IW}/> : <ChevronDown size={13} color={C.textSoft} strokeWidth={IW}/>}
      </button>
      {open && (
        <div style={{ padding:"0 4px 14px 25px" }}>
          <div style={{ fontSize:12, color:C.textSoft, lineHeight:1.6, marginBottom:8 }}>{check.description}</div>
          {check.affectedUrls?.length > 0 && (
            <div style={{ marginBottom:8 }}>
              {check.affectedUrls.slice(0,3).map(u => (
                <div key={u} style={{ fontSize:11, color:C.textMute, fontFamily:"monospace", padding:"2px 0" }}>→ {u}</div>
              ))}
            </div>
          )}
          {check.fix && (
            <div style={{ padding:"8px 12px", borderRadius:T.rSm, background:"#dcfce7", fontSize:12, color:"#14532d" }}>
              <strong>Fix:</strong> {check.fix}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

async function aiAuditSeoCA(domain, pages) {
  const sample = pages.slice(0,8);
  const pageTexts = sample.map(p =>
    `URL: ${p.url}\nTitel: ${p.title || "(fehlt)"}\nDesc: ${p.desc || "(fehlt)"}\nText: ${p.text.slice(0,300)}`
  ).join("\n---\n");
  const raw = await researchAI(
    [{ role:"user", content:`SEO-Audit für ${domain}. Genau 8 Checks, jeder kurz und präzise. Nur JSON zurückgeben.\n\nSeiten (${sample.length}):\n${pageTexts}` }],
    `Du bist SEO-Experte. Antworte NUR mit diesem JSON (keine Erklärungen, kein Markdown):\n{"score":75,"summary":"2 Sätze","checks":[{"category":"Meta","title":"kurz","status":"warning","description":"kurz","affectedUrls":["url"],"fix":"kurz"}],"topIssues":["issue1","issue2","issue3"],"strengths":["s1","s2"]}`
  );
  let parsed = null;
  try { parsed = JSON.parse(raw.trim()); } catch {}
  if (!parsed) { const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/); try { parsed = JSON.parse(m?.[1] || m?.[0] || ""); } catch {} }
  if (!parsed && raw.includes('"score"')) {
    let attempt = raw.replace(/,?\s*$/, "");
    const opens = (attempt.match(/\[/g)||[]).length - (attempt.match(/\]/g)||[]).length;
    const objs  = (attempt.match(/\{/g)||[]).length - (attempt.match(/\}/g)||[]).length;
    attempt += "]".repeat(Math.max(0,opens)) + "}".repeat(Math.max(0,objs));
    try { parsed = JSON.parse(attempt); } catch {}
  }
  if (!parsed) throw new Error("SEO-Audit-Antwort konnte nicht verarbeitet werden.");
  return parsed;
}

function ContentAuditTab() {
  const [domain,     setDomain]     = useState("");
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [phase,      setPhase]      = useState("");
  const [activeTab,  setActiveTab]  = useState("content");
  const [seoResult,  setSeoResult]  = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoError,   setSeoError]   = useState("");
  const [serpMobile, setSerpMobile] = useState(false);

  async function fetchFeedCA(d) {
    try {
      const r = await fetch(`/rss?domain=${d}`);
      if (!r.ok) return { feedUrl:null, items:[] };
      const data = await r.json();
      return { feedUrl:data?.feedUrl||null, items:Array.isArray(data?.items)?data.items:[] };
    } catch { return { feedUrl:null, items:[] }; }
  }

  async function fetchWebContentCA(d) {
    try {
      const r = await fetch("/content", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({domain:d}), signal:AbortSignal.timeout(30000) });
      if (!r.ok) return [];
      const data = await r.json();
      return data?.pages?.length > 0 ? data.pages : [];
    } catch { return []; }
  }

  async function run() {
    const d = cleanDomainStr(domain);
    if (!d) return;
    setLoading(true); setError(""); setResult(null); setActiveTab("content"); setSeoResult(null); setSeoError("");
    try {
      setPhase("Seiteninhalte abrufen…");
      const [feed, webPages] = await Promise.all([fetchFeedCA(d), fetchWebContentCA(d)]);
      setPhase("Inhalte mit KI analysieren…");
      const hasFeed = feed.items.length > 0;
      const hasWebContent = webPages.length > 0;
      let contentBlock = "";
      if (hasFeed) {
        const s = feed.items.slice(0,25).map((a,i) =>
          `${i+1}. "${a.title}"${a.desc?` — ${a.desc.slice(0,180)}`:""}${a.link?` | URL: ${a.link}`:""}`
        ).join("\n");
        contentBlock = `RSS-FEED (${feed.items.length} Artikel):\n${s}`;
      }
      if (hasWebContent) {
        const pt = webPages.map(p => `[Seite: ${p.url}]\nTitel: ${p.title}\nInhalt: ${p.text.slice(0,1500)}`).join("\n\n---\n\n");
        contentBlock += (contentBlock?"\n\n":"") + `GESCRAPTE SEITENINHALTE (${webPages.length} Seiten):\n${pt}`;
      }
      if (!contentBlock) throw new Error(`Inhalte von ${d} konnten nicht abgerufen werden.`);

      const raw = await researchAI(
        [{ role:"user", content:`Analysiere die folgenden ECHTEN Inhalte der Website ${d}. Basiere deine Analyse AUSSCHLIESSLICH auf den bereitgestellten Texten.\n\n${contentBlock}\n\nGib eine vollständige Content-Analyse zurück.` }],
        `Du bist ein Content-Analyse-Experte. Antworte AUSSCHLIESSLICH mit validem JSON ohne Markdown.\nAntworte NUR mit diesem JSON-Schema:\n{"hasFeed":boolean,"articleCount":number,"pubFrequency":string,"contentTypes":string[],"primaryTone":string,"tones":string[],"sentiment":{"positiv":number,"neutral":number,"negativ":number},"topics":[{"label":string,"count":number,"color":string}],"consistencyScore":number,"consistencyNote":string,"readability":string,"readabilityNote":string,"targetAudience":string,"styleCharacteristics":string[],"articles":[{"url":string,"title":string,"tone":string,"sentiment":"positiv"|"neutral"|"negativ","isOutlier":boolean,"outlierReason":null}],"outliers":[{"title":string,"reason":string}],"strengths":string[],"weaknesses":string[],"recommendations":string[]}`
      );
      const parsed = parseJSONBlock(raw);
      if (!parsed) throw new Error("KI-Antwort konnte nicht verarbeitet werden.");
      setResult({ domain:d, feedUrl:feed.feedUrl, hasFeed, hasWebContent, webPageCount:webPages.length, feedItems:feed.items, webPages, articles:feed.items, ...parsed });
    } catch(e) { setError(e.message || "Analyse fehlgeschlagen."); }
    finally { setLoading(false); setPhase(""); }
  }

  async function triggerSeo() {
    if (!result?.webPages?.length) { setSeoError("Keine gescrapten Seiten — bitte erst analysieren."); return; }
    setSeoLoading(true); setSeoError("");
    try { const audit = await aiAuditSeoCA(result.domain, result.webPages); setSeoResult(audit); }
    catch(e) { setSeoError(e.message || "SEO-Audit fehlgeschlagen."); }
    finally { setSeoLoading(false); }
  }

  const r = result;
  return (
    <div style={{ maxWidth:960, margin:"0 auto", fontFamily:FONT }}>
      {/* Search bar */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input value={domain} onChange={e => { setDomain(e.target.value); setError(""); }}
          onKeyDown={e => e.key==="Enter" && !loading && run()}
          placeholder="z.B. spiegel.de"
          style={{ flex:1, padding:"9px 13px", borderRadius:8, border:`1px solid ${C.border}`,
            fontSize:13, fontFamily:FONT, outline:"none", background:C.bg }}/>
        <Btn onClick={run} disabled={loading}>{loading ? (phase || "Analysiere…") : "Analysieren"}</Btn>
      </div>
      {error && (
        <div style={{ padding:"12px 16px", borderRadius:T.rMd, background:"#fee2e2", border:"1px solid #fca5a5", color:"#991b1b", fontSize:13, marginBottom:16 }}>
          {error}
        </div>
      )}
      {/* Inner tab bar */}
      {r && (
        <div style={{ display:"flex", marginBottom:20, borderBottom:`2px solid ${C.border}` }}>
          {[{id:"content",label:"Content-Analyse"},{id:"seo",label:"SEO-Audit"}].map(({id,label}) => (
            <button key={id} onClick={() => { setActiveTab(id); if(id==="seo"&&!seoResult&&!seoLoading) triggerSeo(); }}
              style={{ padding:"10px 22px", background:"none", border:"none", cursor:"pointer",
                fontSize:13, fontWeight:activeTab===id?700:500,
                color:activeTab===id?C.accent:C.textMid, fontFamily:FONT,
                borderBottom:`2px solid ${activeTab===id?C.accent:"transparent"}`, marginBottom:-2 }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ─ Content tab ─ */}
      {r && activeTab==="content" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Scope banner */}
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderRadius:T.rMd, fontSize:12, flexWrap:"wrap",
            background:r.hasFeed?"#f0fdf4":"#fffbeb", border:`1px solid ${r.hasFeed?"#bbf7d0":"#fde68a"}`, color:r.hasFeed?"#166534":"#92400e" }}>
            {r.hasFeed ? <CheckCircle size={13} strokeWidth={IW}/> : <Info size={13} strokeWidth={IW}/>}
            <span style={{ fontWeight:600 }}>{r.hasFeed?"RSS-Feed":r.hasWebContent?"Web-Scraping":"Kein Feed"}</span>
            <span style={{ opacity:.5 }}>·</span>
            <span>{r.hasFeed?(r.feedItems?.length||r.articleCount||0)+" Artikel gescannt":(r.webPageCount||0)+" Seiten gescannt"}</span>
          </div>

          {/* Row 1 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
            <Card style={{ padding:20 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:12 }}>Tonalität & Stil</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>{r.tones?.map(t => <ToneBadgeCA key={t} tone={t}/>)}</div>
              <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, marginBottom:6 }}>Zielgruppe</div>
              <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>{r.targetAudience||"–"}</div>
              {r.styleCharacteristics?.length > 0 && (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, marginBottom:6, marginTop:12 }}>Stil-Merkmale</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {r.styleCharacteristics.map(s => (
                      <span key={s} style={{ fontSize:10, padding:"2px 8px", borderRadius:4, background:C.bg, border:`1px solid ${C.border}`, color:C.textMid }}>{s}</span>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Card style={{ padding:20, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:14 }}>Konsistenz-Score</div>
              {(() => {
                const score = r.consistencyScore ?? 0;
                const color = score>=75?C.success:score>=50?C.warning:"#ef4444";
                const label = score>=75?"Konsistent":score>=50?"Gemischt":"Inkonsistent";
                return (
                  <div style={{ width:80, height:80, borderRadius:"50%", border:`5px solid ${color}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:color+"12", marginBottom:8 }}>
                    <div style={{ fontSize:24, fontWeight:900, color, fontFamily:FONT_DISPLAY, lineHeight:1 }}>{score}</div>
                    <div style={{ fontSize:8, color:C.textSoft, textTransform:"uppercase", letterSpacing:".05em" }}>/ 100</div>
                  </div>
                );
              })()}
              {r.consistencyNote && <p style={{ fontSize:11, color:C.textSoft, lineHeight:1.6, marginTop:8, maxWidth:200 }}>{r.consistencyNote}</p>}
            </Card>

            <Card style={{ padding:20 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:12 }}>Lesbarkeit</div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:99, marginBottom:8,
                background:r.readability==="einfach"?"#f0fdf4":r.readability==="komplex"?"#fef2f2":"#fffbeb",
                border:`1px solid ${r.readability==="einfach"?"#bbf7d0":r.readability==="komplex"?"#fecaca":"#fde68a"}`,
                color:r.readability==="einfach"?"#166534":r.readability==="komplex"?"#dc2626":"#92400e",
                fontSize:13, fontWeight:700 }}>
                {r.readability==="einfach"?"✓":r.readability==="komplex"?"⚠":"◎"} {r.readability}
              </div>
              {r.readabilityNote && <p style={{ fontSize:11, color:C.textSoft, lineHeight:1.6 }}>{r.readabilityNote}</p>}
              {r.contentTypes?.length > 0 && (
                <>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:8, marginTop:14 }}>Content-Typen</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {r.contentTypes.map(t => (
                      <span key={t} style={{ fontSize:11, padding:"2px 9px", borderRadius:4, background:C.accentLight, color:C.accent, fontWeight:600 }}>{t}</span>
                    ))}
                  </div>
                </>
              )}
              {r.pubFrequency && (
                <div style={{ marginTop:14, display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.textSoft }}>
                  <Calendar size={12} strokeWidth={IW}/>{r.pubFrequency}
                </div>
              )}
            </Card>
          </div>

          {/* Row 2: Sentiment + Topics */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Card style={{ padding:20 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:14 }}>Sentiment-Verteilung</div>
              {r.sentiment && Object.entries(r.sentiment).map(([key,val]) => {
                const Icon = SENT_ICON_CA[key]||Meh;
                const col  = SENT_COLOR_CA[key]||C.textSoft;
                return (
                  <div key={key} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                    <Icon size={16} color={col} strokeWidth={IW} style={{ flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:12, color:C.textMid, textTransform:"capitalize" }}>{key}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:col }}>{val}%</span>
                      </div>
                      <div style={{ height:7, borderRadius:4, background:C.border }}>
                        <div style={{ height:7, borderRadius:4, background:col, width:`${val}%` }}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>
            <Card style={{ padding:20 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:14 }}>Themen-Cluster</div>
              {r.topics?.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {r.topics.slice(0,8).map(({label,count,color}) => {
                    const max = Math.max(...r.topics.map(t=>t.count||0),1);
                    return (
                      <div key={label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:color||C.accent, flexShrink:0 }}/>
                        <span style={{ fontSize:12, color:C.textMid, width:200, flexShrink:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</span>
                        <div style={{ flex:1, height:6, borderRadius:3, background:C.border }}>
                          <div style={{ height:6, borderRadius:3, background:color||C.accent, width:`${Math.round((count/max)*100)}%`, transition:"width .4s" }}/>
                        </div>
                        <span style={{ fontSize:11, color:C.textSoft, width:24, textAlign:"right", flexShrink:0 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p style={{ color:C.textSoft, fontSize:12 }}>Keine Themen-Daten verfügbar.</p>}
            </Card>
          </div>

          {/* Articles list */}
          {r.articles?.length > 0 && (
            <Card style={{ padding:20 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:14 }}>Artikel-Analyse ({r.articles.length})</div>
              <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                {r.articles.slice(0,20).map((a,i) => {
                  const sentCol = SENT_COLOR_CA[a.sentiment]||C.textSoft;
                  const SIcon   = SENT_ICON_CA[a.sentiment]||Meh;
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 4px", borderBottom:`1px solid ${C.border}`, cursor:"default" }}>
                      <span style={{ fontSize:11, color:C.textMute, minWidth:20, textAlign:"right" }}>{i+1}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, color:C.text, fontWeight:a.isOutlier?700:400, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {a.isOutlier && <AlertTriangle size={11} color="#f59e0b" strokeWidth={IW} style={{ marginRight:5 }}/>}
                          {a.title}
                        </div>
                        {a.isOutlier && a.outlierReason && <div style={{ fontSize:11, color:"#92400e", marginTop:2 }}>{a.outlierReason}</div>}
                      </div>
                      <ToneBadgeCA tone={a.tone}/>
                      <SIcon size={14} color={sentCol} strokeWidth={IW} style={{ flexShrink:0 }}/>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Outliers */}
          {r.outliers?.length > 0 && (
            <Card style={{ padding:20, borderLeft:`3px solid #f59e0b` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                <AlertTriangle size={16} color="#d97706" strokeWidth={IW}/>
                <div style={{ fontSize:10, fontWeight:700, color:"#92400e", textTransform:"uppercase", letterSpacing:".07em" }}>Ausreißer — {r.outliers.length} Artikel weichen vom Norm ab</div>
              </div>
              {r.outliers.map((o,i) => (
                <div key={i} style={{ padding:"12px 14px", borderRadius:T.rMd, background:"#fffbeb", border:"1px solid #fde68a", marginBottom:8 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>{o.title}</div>
                  <div style={{ fontSize:12, color:"#92400e" }}>{o.reason}</div>
                </div>
              ))}
            </Card>
          )}

          {/* Strengths / Weaknesses / Recommendations */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
            <Card style={{ padding:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.success, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <CheckCircle size={13} strokeWidth={IW}/> Content-Stärken
              </div>
              {r.strengths?.map((s,i) => (
                <div key={i} style={{ padding:"8px 0", borderBottom:`1px solid ${C.border}`, fontSize:12, color:C.textMid, lineHeight:1.5 }}>{s}</div>
              ))}
            </Card>
            <Card style={{ padding:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#dc2626", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <AlertCircle size={13} strokeWidth={IW}/> Schwächen
              </div>
              {r.weaknesses?.map((s,i) => (
                <div key={i} style={{ padding:"8px 0", borderBottom:`1px solid ${C.border}`, fontSize:12, color:C.textMid, lineHeight:1.5 }}>{s}</div>
              ))}
            </Card>
            <Card style={{ padding:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#d97706", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <Zap size={13} strokeWidth={IW}/> Empfehlungen
              </div>
              {r.recommendations?.map((s,i) => (
                <div key={i} style={{ display:"flex", gap:8, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:11, fontWeight:800, color:"#d97706", flexShrink:0 }}>{i+1}.</span>
                  <span style={{ fontSize:12, color:C.textMid, lineHeight:1.5 }}>{s}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ─ SEO tab ─ */}
      {r && activeTab==="seo" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {seoLoading && (
            <Card style={{ padding:40, textAlign:"center" }}>
              <RefreshCw size={28} color={C.accent} strokeWidth={IW} style={{ margin:"0 auto 12px", animation:"spin 1s linear infinite", display:"block" }}/>
              <div style={{ fontSize:14, color:C.textSoft }}>SEO-Audit läuft…</div>
            </Card>
          )}
          {seoError && (
            <div style={{ display:"flex", gap:8, padding:"12px 16px", borderRadius:T.rMd, background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", fontSize:13 }}>
              <AlertCircle size={16} strokeWidth={IW} style={{ flexShrink:0 }}/>{seoError}
            </div>
          )}
          {seoResult && (() => {
            const sr = seoResult;
            const errs  = sr.checks?.filter(c=>c.status==="error")||[];
            const warns = sr.checks?.filter(c=>c.status==="warning")||[];
            const oks   = sr.checks?.filter(c=>c.status==="ok")||[];
            const color = sr.score>=80?"#16a34a":sr.score>=60?"#d97706":"#dc2626";
            return (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:16 }}>
                  <Card style={{ padding:24, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                      <div style={{ width:88, height:88, borderRadius:"50%", border:`6px solid ${color}`, background:color+"12", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                        <div style={{ fontSize:28, fontWeight:900, color, fontFamily:FONT_DISPLAY, lineHeight:1 }}>{sr.score||0}</div>
                        <div style={{ fontSize:9, color:C.textSoft, textTransform:"uppercase", letterSpacing:".05em" }}>/ 100</div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color }}>{sr.score>=80?"Gut":sr.score>=60?"Verbesserbar":"Kritisch"}</div>
                    </div>
                  </Card>
                  <Card style={{ padding:20 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:8 }}>SEO-Score — {r.domain} · {r.webPages?.length||0} Seiten</div>
                    <div style={{ fontSize:13, color:C.textSoft, lineHeight:1.7, marginBottom:12 }}>{sr.summary}</div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {errs.length>0  && <span style={{ fontSize:12, fontWeight:700, color:"#dc2626", background:"#fee2e2", padding:"3px 12px", borderRadius:99 }}>{errs.length} Fehler</span>}
                      {warns.length>0 && <span style={{ fontSize:12, fontWeight:700, color:"#d97706", background:"#fef3c7", padding:"3px 12px", borderRadius:99 }}>{warns.length} Warnungen</span>}
                      {oks.length>0   && <span style={{ fontSize:12, fontWeight:700, color:"#16a34a", background:"#dcfce7", padding:"3px 12px", borderRadius:99 }}>{oks.length} OK</span>}
                    </div>
                  </Card>
                </div>
                {(sr.topIssues?.length>0||sr.strengths?.length>0) && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    {sr.topIssues?.length>0 && (
                      <Card style={{ padding:16 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:"#dc2626", textTransform:"uppercase", letterSpacing:".07em", marginBottom:10 }}>Wichtigste Probleme</div>
                        {sr.topIssues.map((issue,i) => (
                          <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:7 }}>
                            <AlertTriangle size={12} color="#dc2626" strokeWidth={IW} style={{ flexShrink:0, marginTop:2 }}/>
                            <div style={{ fontSize:12, color:C.text, lineHeight:1.5 }}>{issue}</div>
                          </div>
                        ))}
                      </Card>
                    )}
                    {sr.strengths?.length>0 && (
                      <Card style={{ padding:16 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:"#16a34a", textTransform:"uppercase", letterSpacing:".07em", marginBottom:10 }}>Stärken</div>
                        {sr.strengths.map((s,i) => (
                          <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:7 }}>
                            <CheckCircle size={12} color="#16a34a" strokeWidth={IW} style={{ flexShrink:0, marginTop:2 }}/>
                            <div style={{ fontSize:12, color:C.text, lineHeight:1.5 }}>{s}</div>
                          </div>
                        ))}
                      </Card>
                    )}
                  </div>
                )}
                <Card style={{ padding:20 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 }}>Alle Prüfungen ({sr.checks?.length||0})</div>
                  {sr.checks?.map((check,i) => <SeoCheckCardCA key={i} check={check} idx={i}/>)}
                </Card>
                {/* SERP preview */}
                {r.webPages?.length>0 && (
                  <Card style={{ padding:20 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:".07em" }}>SERP-Vorschau</div>
                      <div style={{ display:"flex", gap:4, background:C.bg, borderRadius:T.rSm, padding:3, border:`1px solid ${C.border}` }}>
                        {[{id:false,label:"Desktop"},{id:true,label:"Mobil"}].map(({id,label}) => (
                          <button key={String(id)} onClick={() => setSerpMobile(id)} style={{
                            display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:4, border:"none", cursor:"pointer",
                            background:serpMobile===id?C.surface:"transparent",
                            color:serpMobile===id?C.text:C.textSoft,
                            fontFamily:FONT, fontSize:11, fontWeight:serpMobile===id?700:400,
                          }}>{id ? <Smartphone size={11} strokeWidth={IW}/> : <Monitor size={11} strokeWidth={IW}/>}{label}</button>
                        ))}
                      </div>
                    </div>
                    {r.webPages.slice(0,6).map((p,i) => {
                      const titleMax = serpMobile?55:60, descMax = serpMobile?120:160;
                      const titleOver = (p.title||"").length>titleMax, descOver = (p.desc||"").length>descMax;
                      return (
                        <div key={i} style={{ borderBottom:`1px solid ${C.border}`, padding:"14px 0" }}>
                          <div style={{ fontSize:12, color:"#006621", marginBottom:2 }}>{p.url}</div>
                          <div style={{ fontSize:serpMobile?16:18, color:"#1a0dab", lineHeight:1.3, marginBottom:4, display:"flex", gap:6, flexWrap:"wrap", alignItems:"baseline" }}>
                            <span style={{ color:titleOver?"#dc2626":"#1a0dab" }}>{(p.title||"(kein Titel)").slice(0,titleMax+15)}</span>
                            <span style={{ fontSize:10, fontWeight:700, color:titleOver?"#dc2626":"#16a34a", background:titleOver?"#fee2e2":"#dcfce7", padding:"1px 6px", borderRadius:4 }}>{(p.title||"").length}/{titleMax}</span>
                          </div>
                          <div style={{ fontSize:13, color:"#545454", lineHeight:1.5, maxWidth:serpMobile?340:520 }}>
                            {p.desc ? (
                              <>
                                <span style={{ color:descOver?"#dc2626":"inherit" }}>{p.desc.slice(0,descMax+20)}</span>
                                <span style={{ fontSize:10, fontWeight:700, marginLeft:6, color:descOver?"#dc2626":"#16a34a", background:descOver?"#fee2e2":"#dcfce7", padding:"1px 6px", borderRadius:4 }}>{p.desc.length}/{descMax}</span>
                              </>
                            ) : (
                              <span style={{ color:"#dc2626", fontStyle:"italic" }}>⚠ Keine Meta-Description</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                )}
              </>
            );
          })()}
          {!seoLoading && !seoError && !seoResult && (
            <Card style={{ padding:40, textAlign:"center" }}>
              <Shield size={36} color={C.textSoft} strokeWidth={IW} style={{ margin:"0 auto 12px", display:"block" }}/>
              <div style={{ fontSize:14, color:C.textMid }}>SEO-Audit wird geladen…</div>
            </Card>
          )}
        </div>
      )}

      {/* Empty state */}
      {!r && !loading && !error && (
        <Card style={{ padding:52, textAlign:"center" }}>
          <BookOpen size={44} color={C.textSoft} strokeWidth={IW} style={{ margin:"0 auto 16px", display:"block" }}/>
          <div style={{ fontSize:16, fontWeight:700, color:C.textMid, marginBottom:8 }}>Content-Audit starten</div>
          <p style={{ fontSize:13, color:C.textSoft, maxWidth:420, margin:"0 auto", lineHeight:1.7 }}>
            Gib eine Domain ein und erhalte eine KI-Analyse der Tonalität, des Sentiments, Themen-Cluster und Konsistenz — inklusive SEO-Audit.
          </p>
        </Card>
      )}
    </div>
  );
}

// ── Tab 5: Structure-Audit (Schema Validator) ────────────────────────────────

const SA_ST = {
  valid:   { color:C.success, bg:"#dcfce7", border:"#bbf7d0", icon:CheckCircle,   label:"Gültig" },
  warning: { color:"#d97706", bg:"#fef3c7", border:"#fde68a", icon:AlertTriangle, label:"Warnung" },
  error:   { color:"#dc2626", bg:"#fee2e2", border:"#fca5a5", icon:XCircle,       label:"Fehler" },
};
const SA_PRIORITY_COLOR = { high:"#dc2626", medium:"#d97706", low:C.textMute };

function SchemaPageCard({ page, rawSchemas }) {
  const [open, setOpen] = useState(false);
  const st = SA_ST[page.status] || SA_ST.warning;
  const Ico = st.icon;
  return (
    <Card style={{ padding:0, overflow:"hidden", marginBottom:10 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:10,
        padding:"12px 16px", background:"none", border:"none", cursor:"pointer", fontFamily:FONT, textAlign:"left",
      }}>
        <div style={{ width:28, height:28, borderRadius:T.rSm, background:st.bg, border:`1px solid ${st.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Ico size={13} color={st.color} strokeWidth={IW}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{page.url}</div>
          <div style={{ display:"flex", gap:5, marginTop:4, flexWrap:"wrap" }}>
            {page.schemaTypes?.map(t => (
              <span key={t} style={{ fontSize:10, fontWeight:600, padding:"1px 7px", borderRadius:99, background:C.accentLight, color:C.accent, border:`1px solid ${C.accent}25` }}>{t}</span>
            ))}
            {(!page.schemaTypes||page.schemaTypes.length===0) && <span style={{ fontSize:10, color:C.textMute, fontStyle:"italic" }}>Kein Schema gefunden</span>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>{st.label}</span>
          {open ? <ChevronUp size={13} color={C.textMute} strokeWidth={IW}/> : <ChevronDown size={13} color={C.textMute} strokeWidth={IW}/>}
        </div>
      </button>
      {open && (
        <div style={{ padding:"0 16px 14px", borderTop:`1px solid ${C.border}` }}>
          {page.richSnippetPreview && (
            <div style={{ margin:"12px 0 10px", padding:"10px 14px", borderRadius:T.rSm, background:"#f8faff", border:"1px solid #dbeafe" }}>
              <div style={{ fontSize:9, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:".07em", marginBottom:5 }}>Rich-Snippet-Potenzial</div>
              <div style={{ fontSize:12, color:"#1a73e8", fontWeight:600, marginBottom:2 }}>{page.url}</div>
              <div style={{ fontSize:12, color:C.textSoft, lineHeight:1.5 }}>{page.richSnippetPreview}</div>
            </div>
          )}
          {page.issues?.length > 0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {page.issues.map((issue,j) => (
                <div key={j} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"7px 10px", borderRadius:T.rSm, background:st.bg, border:`1px solid ${st.border}` }}>
                  <span style={{ fontSize:10, fontWeight:800, color:st.color, flexShrink:0, marginTop:1, textTransform:"uppercase" }}>{issue.type?.replace(/_/g," ")}</span>
                  <span style={{ fontSize:12, color:C.textMid, flex:1, lineHeight:1.5 }}>{issue.message}</span>
                  {issue.field && <code style={{ fontSize:10, color:C.textMute, background:C.bg, padding:"2px 6px", borderRadius:4, flexShrink:0, fontFamily:"monospace" }}>{issue.field}</code>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize:12, color:C.success, padding:"8px 0" }}>✓ Keine Probleme gefunden</div>
          )}
          {rawSchemas?.length > 0 && (
            <details style={{ marginTop:10 }}>
              <summary style={{ fontSize:11, color:C.textMute, cursor:"pointer", userSelect:"none" }}>
                Gefundene JSON-LD Blöcke ({rawSchemas.length}) anzeigen
              </summary>
              {rawSchemas.map((s,k) => (
                <div key={k} style={{ marginTop:6 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:s.parseError?"#dc2626":C.accent, marginBottom:3 }}>Block {k+1}: {s.type} {s.parseError?"⚠ Syntaxfehler":""}</div>
                  <pre style={{ padding:"8px 12px", borderRadius:T.rSm, background:"#0f172a", color:"#e2e8f0", fontSize:10.5, lineHeight:1.6, overflow:"auto", maxHeight:260, fontFamily:"monospace", margin:0 }}>
                    {s.raw ? JSON.stringify(s.raw,null,2) : "(Syntaxfehler – kein gültiges JSON)"}
                  </pre>
                </div>
              ))}
            </details>
          )}
        </div>
      )}
    </Card>
  );
}

function StructureAuditTab() {
  const [domain,  setDomain]  = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function run() {
    const d = cleanDomainStr(domain);
    if (!d) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch("/schema-validate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({domain:d}), signal:AbortSignal.timeout(65000),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setResult(data);
    } catch(e) { setError(e.message || "Analyse fehlgeschlagen"); }
    finally { setLoading(false); }
  }

  const valid  = result?.pages?.filter(p=>p.status==="valid").length  ?? 0;
  const warn   = result?.pages?.filter(p=>p.status==="warning").length ?? 0;
  const errors = result?.pages?.filter(p=>p.status==="error").length  ?? 0;

  return (
    <div style={{ maxWidth:860, margin:"0 auto", fontFamily:FONT }}>
      {/* Search */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input value={domain} onChange={e => { setDomain(e.target.value); setError(""); }}
          onKeyDown={e => e.key==="Enter" && !loading && run()}
          placeholder="z.B. shopify.com"
          style={{ flex:1, padding:"9px 13px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:FONT, outline:"none", background:C.bg }}/>
        <Btn onClick={run} disabled={loading || !domain.trim()}>{loading ? "Validiere…" : "Validieren"}</Btn>
      </div>

      {/* Examples */}
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:11, color:C.textMute }}>Beispiele:</span>
        {["shopify.com","wikipedia.org","airbnb.com","github.com"].map(ex => (
          <button key={ex} onClick={() => { setDomain(ex); setError(""); }}
            style={{ fontSize:11, padding:"3px 10px", borderRadius:99, background:C.surface, border:`1px solid ${C.border}`, color:C.textMid, cursor:"pointer", fontFamily:FONT }}>
            {ex}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"16px 20px", borderRadius:T.rMd, background:C.bg, border:`1px solid ${C.border}`, marginBottom:16, fontSize:13, color:C.textSoft }}>
          <RefreshCw size={15} color={C.accent} strokeWidth={IW} style={{ animation:"spin 1s linear infinite", flexShrink:0 }}/>
          Homepage abrufen · JSON-LD extrahieren · Schema.org validieren…
        </div>
      )}

      {error && (
        <div style={{ padding:"12px 16px", borderRadius:T.rMd, background:"#fee2e2", border:"1px solid #fca5a5", color:"#991b1b", fontSize:13, marginBottom:16 }}>
          <strong>Fehler:</strong> {error}
        </div>
      )}

      {result && (
        <>
          {/* Score + summary */}
          <Card style={{ padding:20, marginBottom:20 }}>
            <div style={{ display:"flex", gap:20, alignItems:"center" }}>
              {/* Score ring */}
              {(() => {
                const score = result.overallScore ?? 0;
                const color = score>=75?C.success:score>=40?"#d97706":"#dc2626";
                const label = score>=75?"Gut":score>=40?"Ausbaufähig":"Kritisch";
                const rr=32, circ=2*Math.PI*rr, dash=(score/100)*circ;
                return (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <svg width={80} height={80}>
                      <circle cx={40} cy={40} r={rr} fill="none" stroke={C.border} strokeWidth={7}/>
                      <circle cx={40} cy={40} r={rr} fill="none" stroke={color} strokeWidth={7}
                        strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round" transform="rotate(-90 40 40)"/>
                      <text x={40} y={44} textAnchor="middle" fontSize={15} fontWeight={800} fill={color} fontFamily={FONT}>{score}</text>
                    </svg>
                    <span style={{ fontSize:10, fontWeight:700, color, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</span>
                  </div>
                );
              })()}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:4 }}>{result.domain}</div>
                <div style={{ fontSize:13, color:C.textSoft, lineHeight:1.6, marginBottom:12 }}>{result.summary}</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[{c:SA_ST.valid,n:valid,lab:"Gültig"},{c:SA_ST.warning,n:warn,lab:`Warnung${warn!==1?"en":""}`},{c:SA_ST.error,n:errors,lab:"Fehler"}].map(({c,n,lab}) => (
                    <div key={lab} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:T.rMd, background:c.bg, border:`1px solid ${c.border}`, fontSize:11, fontWeight:600, color:c.color }}>
                      <c.icon size={11} strokeWidth={IW}/> {n} {lab}
                    </div>
                  ))}
                  <div style={{ marginLeft:"auto", fontSize:11, color:C.textMute }}>{result.pagesAnalyzed??result.pages?.length??0} Seiten · {result.totalSchemasFound??0} Schemas</div>
                </div>
              </div>
            </div>
          </Card>

          {result.pages?.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textMute, textTransform:"uppercase", letterSpacing:".07em", marginBottom:10 }}>Analysierte Seiten</div>
              {result.pages.map((page,i) => {
                const rawPage = result._pages_raw?.find(p=>p.url===page.url)||result._pages_raw?.[i];
                return <SchemaPageCard key={i} page={page} rawSchemas={rawPage?.schemas}/>;
              })}
            </div>
          )}

          {result.missingOpportunities?.length > 0 && (
            <Card style={{ padding:16, marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <Zap size={13} color="#d97706" strokeWidth={IW}/> Ungenutzte Schema-Potenziale
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {result.missingOpportunities.map((opp,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 12px", borderRadius:T.rSm, background:C.bg, border:`1px solid ${C.border}` }}>
                    <code style={{ fontSize:11, fontWeight:700, color:C.accent, background:C.accentLight, padding:"2px 7px", borderRadius:4, flexShrink:0 }}>{opp.type}</code>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:C.textMid, lineHeight:1.5 }}>{opp.reason}</div>
                    </div>
                    {opp.priority && (
                      <span style={{ fontSize:10, fontWeight:700, color:SA_PRIORITY_COLOR[opp.priority]||C.textMute, flexShrink:0 }}>
                        {opp.priority==="high"?"Hoch":opp.priority==="medium"?"Mittel":"Niedrig"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.recommendations?.length > 0 && (
            <Card style={{ padding:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                <Shield size={13} color={C.accent} strokeWidth={IW}/> Empfehlungen
              </div>
              {result.recommendations.map((rec,i) => (
                <div key={i} style={{ display:"flex", gap:10, fontSize:12, color:C.textSoft, marginBottom:8, lineHeight:1.55 }}>
                  <span style={{ color:C.accent, fontWeight:800, flexShrink:0 }}>{i+1}.</span>
                  <span>{rec}</span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {!result && !loading && !error && (
        <Card style={{ padding:52, textAlign:"center" }}>
          <Code2 size={44} color={C.textSoft} strokeWidth={IW} style={{ margin:"0 auto 16px", display:"block" }}/>
          <div style={{ fontSize:16, fontWeight:700, color:C.textMid, marginBottom:8 }}>Structured Data validieren</div>
          <p style={{ fontSize:13, color:C.textSoft, maxWidth:420, margin:"0 auto", lineHeight:1.7 }}>
            Gib eine Domain ein um JSON-LD Blöcke zu extrahieren, Schema.org-Validierung durchzuführen und Rich-Snippet-Potenzial zu analysieren.
          </p>
        </Card>
      )}
    </div>
  );
}

// ── Tab 6: Social Intelligence ────────────────────────────────────────────────

const SI_PLATFORMS = [
  { key:"linkedin",  label:"LinkedIn",    Icon:Linkedin,  color:"#0A66C2" },
  { key:"twitter",   label:"X / Twitter", Icon:Twitter,   color:"#000000" },
  { key:"instagram", label:"Instagram",   Icon:Instagram, color:"#E1306C" },
  { key:"facebook",  label:"Facebook",    Icon:Facebook,  color:"#1877F2" },
  { key:"youtube",   label:"YouTube",     Icon:Youtube,   color:"#FF0000" },
  { key:"tiktok",    label:"TikTok",      Icon:Music2,    color:"#010101" },
];
const SI_MATURITY = {
  beginner:    { label:"Einsteiger",   color:"#ef4444" },
  developing:  { label:"Aufbauend",    color:"#f59e0b" },
  established: { label:"Etabliert",    color:"#3b82f6" },
  leader:      { label:"Marktführer",  color:"#22c55e" },
};
const SI_SOURCE_BADGES = {
  website_crawl:           { label:"Website",         color:"#0A66C2", bg:"#0A66C218" },
  youtube_rss:             { label:"YouTube RSS",      color:"#FF0000", bg:"#FF000018" },
  linkedin_public:         { label:"LinkedIn",         color:"#0A66C2", bg:"#0A66C218" },
  ai_estimate_real_handle: { label:"KI (echtes Handle)",color:"#7c3aed",bg:"#7c3aed18" },
  ai_estimate:             { label:"KI-Schätzung",    color:"#6b7280", bg:"#6b728018" },
};
function siFmt(n) {
  if (!n&&n!==0) return "–";
  if (n>=1_000_000) return (n/1_000_000).toFixed(1)+"M";
  if (n>=1_000)     return (n/1_000).toFixed(1)+"K";
  return String(n);
}
function siDaysSince(d) { if (!d) return null; return Math.floor((Date.now()-new Date(d).getTime())/86_400_000); }
function siActivity(days) {
  if (days===null) return { label:"Unbekannt",     color:C.textSoft };
  if (days<=3)   return { label:"Täglich aktiv", color:"#22c55e" };
  if (days<=7)   return { label:"Sehr aktiv",    color:"#22c55e" };
  if (days<=30)  return { label:"Aktiv",          color:"#84cc16" };
  if (days<=90)  return { label:"Wenig aktiv",   color:"#f59e0b" };
  return            { label:"Inaktiv",          color:"#ef4444" };
}

function SIPlatformCard({ platform, profile, metrics, onAddHandle }) {
  const { Icon, label, color } = SI_PLATFORMS.find(p=>p.key===platform);
  const has   = !!profile?.url;
  const days  = siDaysSince(metrics?.last_post);
  const act   = siActivity(days);
  const [inputVal,  setInputVal]  = useState("");
  const [inputOpen, setInputOpen] = useState(false);
  const sb = SI_SOURCE_BADGES[metrics?.source||profile?.source] || SI_SOURCE_BADGES.ai_estimate;

  return (
    <div style={{ background:C.surface, border:`1px solid ${has?color+"30":C.border}`, borderRadius:T.rLg, padding:16, display:"flex", flexDirection:"column", gap:10, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:has?color:C.border, borderRadius:`${T.rLg}px ${T.rLg}px 0 0` }}/>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:4 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:T.rMd, background:has?color+"18":C.border+"40", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon size={15} strokeWidth={IW} color={has?color:C.textSoft}/>
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:has?C.text:C.textSoft }}>{label}</span>
        </div>
        {has ? (
          <div style={{ fontSize:10, fontWeight:700, borderRadius:20, padding:"2px 8px", color:act.color, background:act.color+"18" }}>{act.label}</div>
        ) : (
          <div style={{ fontSize:10, fontWeight:600, borderRadius:20, padding:"2px 8px", color:"#b45309", background:"#fef3c7" }}>Nicht verlinkt</div>
        )}
      </div>

      {has ? (
        <>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <a href={profile.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color, textDecoration:"none", display:"flex", alignItems:"center", gap:4 }}>
              @{profile.handle}<ExternalLink size={10} strokeWidth={IW}/>
            </a>
            <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:20, color:sb.color, background:sb.bg }}>{sb.label}</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
            {[{ val:siFmt(metrics?.followers), lbl:"Follower" },{ val:metrics?.engagement_rate!=null?(metrics.engagement_rate*100).toFixed(1)+"%":"–", lbl:"Engagement" },{ val:metrics?.posts_per_month??"–", lbl:"Posts/Mo" }].map(({val,lbl}) => (
              <div key={lbl} style={{ textAlign:"center" }}>
                <div style={{ fontSize:15, fontWeight:800, fontFamily:FONT_DISPLAY, color:C.text }}>{val}</div>
                <div style={{ fontSize:9, color:C.textSoft, marginTop:2, textTransform:"uppercase", letterSpacing:"0.04em" }}>{lbl}</div>
              </div>
            ))}
          </div>
          {metrics?.posts_per_month!=null && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ flex:1, height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                <div style={{ width:`${Math.min((metrics.posts_per_month/30)*100,100)}%`, height:"100%",
                  background:metrics.posts_per_month>=8?"#22c55e":metrics.posts_per_month>=3?"#f59e0b":"#ef4444",
                  borderRadius:3, transition:"width 0.6s ease" }}/>
              </div>
              <span style={{ fontSize:11, color:C.textMid, fontWeight:600, whiteSpace:"nowrap" }}>{metrics.posts_per_month}/Mo</span>
            </div>
          )}
          {metrics?.last_post && (
            <div style={{ display:"flex", alignItems:"center", gap:5, borderTop:`1px solid ${C.border}`, paddingTop:8 }}>
              <Calendar size={11} strokeWidth={IW} color={C.textSoft}/>
              <span style={{ fontSize:11, color:C.textSoft }}>
                Letzter Post: {days===0?"Heute":days===1?"Gestern":days!==null?`vor ${days} Tagen`:"–"}
              </span>
            </div>
          )}
          {platform==="youtube" && metrics?.recentVideos?.length > 0 && (
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, display:"flex", flexDirection:"column", gap:6 }}>
              <span style={{ fontSize:10, fontWeight:700, color:C.textSoft, textTransform:"uppercase", letterSpacing:"0.04em" }}>Letzte Videos ({metrics.last30Days||0} in 30 Tagen)</span>
              {metrics.recentVideos.slice(0,3).map((v,i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                  <div style={{ width:28, height:20, borderRadius:4, background:"#FF000020", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Play size={10} strokeWidth={IW} color="#FF0000" fill="#FF0000"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    {v.url ? (
                      <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:C.text, textDecoration:"none", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{v.title}</a>
                    ) : <span style={{ fontSize:11, color:C.textMid }}>{v.title}</span>}
                    <div style={{ display:"flex", gap:8, marginTop:2 }}>
                      <span style={{ fontSize:10, color:C.textSoft }}>{v.published ? new Date(v.published).toLocaleDateString("de-DE",{day:"2-digit",month:"short",year:"numeric"}) : ""}</span>
                      {v.views && <span style={{ fontSize:10, color:C.textSoft }}>{v.views>=1_000_000?(v.views/1_000_000).toFixed(1)+"M Views":v.views>=1_000?(v.views/1_000).toFixed(1)+"K Views":v.views+" Views"}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ background:"#fef3c720", border:"1px solid #fcd34d40", borderRadius:T.rMd, padding:"10px 12px" }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#92400e", marginBottom:3 }}>Kein Link auf Website gefunden</div>
            <div style={{ fontSize:11, color:"#b45309", lineHeight:1.5 }}>Kein {label}-Link auf der Website verlinkt.</div>
          </div>
          {inputOpen ? (
            <div style={{ display:"flex", gap:6 }}>
              <div style={{ flex:1, display:"flex", alignItems:"center", gap:6, padding:"6px 10px", borderRadius:T.rMd, border:`1px solid ${color}50`, background:C.bg, fontSize:12 }}>
                <span style={{ color:C.textSoft, fontSize:13 }}>@</span>
                <input autoFocus value={inputVal} onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key==="Enter"&&inputVal.trim()) { onAddHandle(platform,inputVal.trim().replace(/^@/,"")); setInputOpen(false); setInputVal(""); }
                    if (e.key==="Escape") { setInputOpen(false); setInputVal(""); }
                  }}
                  placeholder={`${label}-Handle`}
                  style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:12, color:C.text, fontFamily:FONT }}/>
              </div>
              <button onClick={() => { if(inputVal.trim()) onAddHandle(platform,inputVal.trim().replace(/^@/,"")); setInputOpen(false); setInputVal(""); }}
                style={{ padding:"6px 12px", borderRadius:T.rMd, border:"none", background:color, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>OK</button>
              <button onClick={() => { setInputOpen(false); setInputVal(""); }}
                style={{ padding:"6px 10px", borderRadius:T.rMd, border:`1px solid ${C.border}`, background:C.surface, color:C.textSoft, fontSize:12, cursor:"pointer" }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setInputOpen(true)}
              style={{ padding:"7px 12px", borderRadius:T.rMd, border:`1px dashed ${color}50`, background:color+"08", color, fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
              <span style={{ fontSize:15, lineHeight:1 }}>+</span> Handle manuell eingeben
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SocialIntelligenceTab() {
  const [domain,          setDomain]          = useState("");
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);
  const [result,          setResult]          = useState(null);
  const [compDomain,      setCompDomain]      = useState("");
  const [compLoading,     setCompLoading]     = useState(false);
  const [compError,       setCompError]       = useState(null);
  const [compResult,      setCompResult]      = useState(null);
  const [insights,        setInsights]        = useState(null);
  const [insLoading,      setInsLoading]      = useState(false);
  const [manualHandles,   setManualHandles]   = useState({});
  const [manualLoading,   setManualLoading]   = useState({});

  async function fetchSocial(d) {
    const r = await fetch("/social-analyze", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({domain:d}), signal:AbortSignal.timeout(90000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  async function run() {
    const d = cleanDomainStr(domain);
    if (!d) return;
    setLoading(true); setError(null); setResult(null); setCompResult(null); setInsights(null);
    try {
      const data = await fetchSocial(d);
      setResult(data);
      setInsLoading(true);
      loadInsights(d, data, null, null).then(ins => { if(ins) setInsights(ins); }).finally(() => setInsLoading(false));
    } catch(e) {
      setError(e.name==="TimeoutError"?"Zeitüberschreitung (90s) – bitte nochmal versuchen":"Analyse fehlgeschlagen: "+e.message);
    } finally { setLoading(false); }
  }

  async function runCompare() {
    const cd = cleanDomainStr(compDomain);
    if (!cd||!result) return;
    setCompLoading(true); setCompError(null); setInsights(null);
    try {
      const data = await fetchSocial(cd);
      setCompResult(data);
      setInsLoading(true);
      loadInsights(domain, result, cd, data).then(ins => { if(ins) setInsights(ins); }).finally(() => setInsLoading(false));
    } catch(e) { setCompError("Wettbewerber-Analyse fehlgeschlagen: "+e.message); }
    finally { setCompLoading(false); }
  }

  async function loadInsights(d, res, cd, compRes) {
    const pText = Object.entries(res.profiles||{}).filter(([,p])=>p?.url).map(([p,dd])=>`${p}: @${dd.handle}`).join(", ")||"keine";
    const mText = Object.entries(res.metrics||{}).filter(([,m])=>m?.followers||m?.posts_per_month).map(([p,m])=>`${p}: ${m.followers?siFmt(m.followers)+" Follower":""} ${m.posts_per_month?m.posts_per_month+" Posts/Mo":""}`).join("; ");
    const compText = compRes ? `\nWettbewerber "${cd}": ${JSON.stringify(compRes.metrics)}` : "";
    const prompt = `Analysiere die Social-Media-Präsenz von "${d}" als Marketing-Strategieberater.\nProfile: ${pText}\nMetriken: ${mText}${compText}\n\nGib 3 konkrete Stärken, 3 Handlungslücken und 3 sofort umsetzbare Quick Wins.\nReturn ONLY valid JSON (no markdown):\n{"strengths":["...","...","..."],"gaps":["...","...","..."],"quick_wins":["...","...","..."]}`;
    try {
      const r = await fetch("/ai", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ messages:[{role:"user",content:prompt}], max_tokens:800 }), signal:AbortSignal.timeout(40000) });
      if (!r.ok) return null;
      const d2 = await r.json();
      const text = d2.content?.[0]?.text ?? "";
      const m = text.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    } catch { return null; }
  }

  async function handleAddHandle(platform, handle) {
    if (!handle||!result) return;
    const plat = SI_PLATFORMS.find(p=>p.key===platform);
    if (!plat) return;
    setManualHandles(prev => ({ ...prev, [platform]:{ url:`${plat.base||"https://"}${handle}`, handle, source:"manual" } }));
    setManualLoading(prev => ({ ...prev, [platform]:true }));
    try {
      const d = cleanDomainStr(domain);
      const prompt = `Estimate social media metrics for ${platform} handle "@${handle}" of the company "${d}". Return ONLY valid JSON: { "followers": <int|null>, "posts_per_month": <int|null>, "engagement_rate": <0.001-0.1|null>, "last_post": "<ISO|null>" }`;
      const r = await fetch("/ai", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ messages:[{role:"user",content:prompt}], max_tokens:200 }), signal:AbortSignal.timeout(20000) });
      if (r.ok) {
        const data = await r.json();
        const text = data.content?.[0]?.text??"";
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          const metrics = JSON.parse(m[0]);
          setResult(prev => ({ ...prev, metrics:{ ...prev.metrics, [platform]:{ ...metrics, source:"ai_estimate_real_handle" } } }));
        }
      }
    } catch {}
    setManualLoading(prev => ({ ...prev, [platform]:false }));
  }

  const displayProfiles = result ? { ...result.profiles, ...manualHandles } : null;
  const activePlatforms = displayProfiles ? SI_PLATFORMS.filter(p=>displayProfiles[p.key]?.url) : [];
  const maturityInfo    = result?.maturity ? SI_MATURITY[result.maturity] : null;

  return (
    <div style={{ maxWidth:1080, margin:"0 auto", fontFamily:FONT }}>
      {/* Search */}
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <input value={domain} onChange={e => setDomain(e.target.value)}
          onKeyDown={e => e.key==="Enter" && !loading && run()}
          placeholder="z.B. adidas.de"
          style={{ flex:1, padding:"9px 13px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:FONT, outline:"none", background:C.bg }}/>
        <Btn onClick={run} disabled={loading || !domain.trim()}>{loading ? "Analysiere…" : "Analysieren"}</Btn>
      </div>
      {loading && (
        <div style={{ marginBottom:12, fontSize:12, color:C.textSoft, display:"flex", alignItems:"center", gap:8 }}>
          <RefreshCw size={12} strokeWidth={IW} color={C.accent} style={{ animation:"spin 1s linear infinite" }}/>
          Website wird gecrawlt · YouTube RSS wird geladen · KI analysiert…
        </div>
      )}
      {error && (
        <div style={{ padding:"12px 16px", borderRadius:T.rMd, background:C.redLight, border:"1px solid #fca5a5", color:C.red, fontSize:13, marginBottom:16 }}>{error}</div>
      )}

      {result && (
        <>
          {/* Company header */}
          <Card style={{ padding:20, marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:20, flexWrap:"wrap" }}>
              {/* Score ring */}
              {(() => {
                const score = result.score ?? 0;
                const size  = 100;
                const radius = (size-14)/2;
                const circ   = 2*Math.PI*radius;
                const offset = circ-(score/100)*circ;
                const col    = score>=70?"#22c55e":score>=40?"#f59e0b":"#ef4444";
                return (
                  <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
                    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
                      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={C.border} strokeWidth={7}/>
                      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={col} strokeWidth={7}
                        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition:"stroke-dashoffset 0.8s ease" }}/>
                    </svg>
                    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:22, fontFamily:FONT_DISPLAY, fontWeight:800, color:col, lineHeight:1 }}>{score}</span>
                      <span style={{ fontSize:9, color:C.textSoft, marginTop:1 }}>/ 100</span>
                    </div>
                  </div>
                );
              })()}

              <div style={{ flex:1, minWidth:220 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:17, fontWeight:800, color:C.text, fontFamily:FONT_DISPLAY }}>{result.ogData?.title||domain.trim()}</span>
                  {maturityInfo && (
                    <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background:maturityInfo.color+"18", color:maturityInfo.color }}>{maturityInfo.label}</span>
                  )}
                </div>
                {result.ogData?.description && (
                  <p style={{ fontSize:12, color:C.textSoft, margin:"0 0 10px", lineHeight:1.5, maxWidth:600 }}>
                    {result.ogData.description.slice(0,180)}{result.ogData.description.length>180?"…":""}
                  </p>
                )}
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                  {result.company_type && <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:C.accentLight, color:C.accent }}>{result.company_type}</span>}
                  {result.industry     && <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:C.border, color:C.textMid }}>{result.industry}</span>}
                  {result.primary_platform && (() => { const p=SI_PLATFORMS.find(x=>x.key===result.primary_platform); return p?<span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:p.color+"18", color:p.color }}>Hauptkanal: {p.label}</span>:null; })()}
                  <span style={{ fontSize:11, color:C.textSoft, padding:"3px 6px" }}>{activePlatforms.length}/{SI_PLATFORMS.length} Plattformen aktiv</span>
                </div>
                {/* Data source legend */}
                {result.dataSource && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
                    <span style={{ fontSize:11, color:C.textSoft, marginRight:4 }}>Datenquellen:</span>
                    {result.dataSource.crawled?.length>0 && <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:"#0057D918", color:"#0057D9" }}>Website-Crawl: {result.dataSource.crawled.length} Profile</span>}
                    {result.dataSource.realData?.includes("youtube") && <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:"#FF000018", color:"#FF0000" }}>YouTube RSS</span>}
                    {result.dataSource.realData?.includes("linkedin") && <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:"#0A66C218", color:"#0A66C2" }}>LinkedIn Public</span>}
                    {result.dataSource.aiOnly?.length>0 && <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:C.border+"80", color:C.textSoft }}>KI-Schätzung für {result.dataSource.aiOnly.length}</span>}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Platform grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:14, marginBottom:16 }}>
            {SI_PLATFORMS.map(({key}) => (
              <SIPlatformCard key={key} platform={key}
                profile={displayProfiles?.[key]}
                metrics={manualLoading[key]?{_loading:true}:result.metrics?.[key]}
                onAddHandle={handleAddHandle}/>
            ))}
          </div>

          {/* Competitor compare */}
          <Card style={{ padding:16, marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>Wettbewerber vergleichen</div>
            <div style={{ display:"flex", gap:10 }}>
              <input value={compDomain} onChange={e => setCompDomain(e.target.value)}
                onKeyDown={e => e.key==="Enter" && !compLoading && runCompare()}
                placeholder="Wettbewerber-Domain"
                disabled={compLoading}
                style={{ flex:1, padding:"8px 12px", borderRadius:T.rMd, border:`1px solid ${C.border}`, background:C.bg, fontSize:13, fontFamily:FONT, outline:"none" }}/>
              <Btn onClick={runCompare} disabled={!compDomain.trim()||compLoading}>{compLoading?"Lädt…":"Vergleichen"}</Btn>
            </div>
            {compError && <div style={{ marginTop:8, fontSize:12, color:C.red }}>{compError}</div>}
          </Card>

          {/* Comparison bars */}
          {compResult && activePlatforms.length>0 && (
            <Card style={{ padding:20, marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:16 }}>
                Follower-Vergleich: {domain} vs. {compDomain}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))", gap:20 }}>
                {activePlatforms.slice(0,6).map(({key}) => {
                  const { Icon, label, color } = SI_PLATFORMS.find(p=>p.key===key);
                  const val1 = result.metrics?.[key]?.followers;
                  const val2 = compResult.metrics?.[key]?.followers;
                  const max  = Math.max(val1??0, val2??0, 1);
                  return (
                    <div key={key} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <Icon size={12} strokeWidth={IW} color={color}/>
                        <span style={{ fontSize:11, fontWeight:700, color:C.textSoft }}>{label}</span>
                      </div>
                      {[{d:domain,val:val1,c:color},{d:compDomain,val:val2,c:color+"70"}].map(({d,val,c}) => (
                        <div key={d} style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:11, color:C.textMid, width:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d}</span>
                          <div style={{ flex:1, height:8, background:C.border, borderRadius:4, overflow:"hidden" }}>
                            <div style={{ width:`${((val??0)/max)*100}%`, height:"100%", background:c, borderRadius:4, transition:"width 0.6s ease" }}/>
                          </div>
                          <span style={{ fontSize:11, color:C.textMid, fontWeight:700, width:44, textAlign:"right" }}>{siFmt(val)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* AI insights */}
          {insLoading && (
            <Card style={{ padding:20, display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{ width:32, height:32, borderRadius:T.rMd, background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Sparkles size={16} strokeWidth={IW} color={C.accent}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ height:11, background:C.border, borderRadius:6, width:"55%", marginBottom:7 }}/>
                <div style={{ height:10, background:C.border, borderRadius:5, width:"80%" }}/>
              </div>
            </Card>
          )}
          {!insLoading && (insights||result.ai_summary) && (
            <Card style={{ padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <div style={{ width:32, height:32, borderRadius:T.rMd, background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Sparkles size={16} strokeWidth={IW} color={C.accent}/>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:FONT_DISPLAY }}>KI-Empfehlungen</div>
                  <div style={{ fontSize:11, color:C.textSoft }}>Basierend auf Echtdaten + KI-Analyse</div>
                </div>
              </div>
              {result.ai_summary && <p style={{ fontSize:13, color:C.textMid, lineHeight:1.7, margin:"0 0 16px", fontFamily:FONT }}>{result.ai_summary}</p>}
              {insights && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(190px,1fr))", gap:10 }}>
                  {[
                    { key:"strengths",  label:"Stärken",    Icon:CheckCircle, color:"#22c55e", bg:"#22c55e0d", border:"#22c55e25", items:insights.strengths  },
                    { key:"gaps",       label:"Lücken",     Icon:AlertCircle, color:"#ef4444", bg:"#ef44440d", border:"#ef444425", items:insights.gaps       },
                    { key:"quick_wins", label:"Quick Wins", Icon:Zap,         color:"#f59e0b", bg:"#f59e0b0d", border:"#f59e0b25", items:insights.quick_wins },
                  ].filter(s=>s.items?.length).map(({key,label,Icon,color,bg,border,items}) => (
                    <div key={key} style={{ background:bg, border:`1px solid ${border}`, borderRadius:T.rMd, padding:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                        <Icon size={13} strokeWidth={IW} color={color}/>
                        <span style={{ fontSize:11, fontWeight:700, color }}>{label}</span>
                      </div>
                      <ul style={{ margin:0, padding:0, listStyle:"none" }}>
                        {items.slice(0,3).map((item,i) => (
                          <li key={i} style={{ fontSize:11, color:C.text, marginBottom:4, paddingLeft:12, position:"relative" }}>
                            <span style={{ position:"absolute", left:0, color }}>•</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <Card style={{ padding:56, textAlign:"center" }}>
          <Activity size={44} color={C.textSoft} strokeWidth={IW} style={{ margin:"0 auto 16px", display:"block" }}/>
          <div style={{ fontSize:15, fontWeight:700, color:C.textMid, marginBottom:8 }}>Social-Media-Präsenz analysieren</div>
          <p style={{ fontSize:13, color:C.textSoft, maxWidth:420, margin:"0 auto 20px" }}>
            Crawlt die Website für echte Social-Links · Lädt YouTube RSS-Daten · Analysiert LinkedIn · KI füllt Lücken
          </p>
          <div style={{ display:"flex", justifyContent:"center", gap:10, flexWrap:"wrap" }}>
            {[{label:"Website-Crawl",color:"#0057D9"},{label:"YouTube RSS",color:"#FF0000"},{label:"LinkedIn Public",color:"#0A66C2"},{label:"KI-Anreicherung",color:"#7c3aed"}].map(({label,color}) => (
              <span key={label} style={{ fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20, background:color+"18", color }}>{label}</span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ResearchPage() {
  const [mainTab,      setMainTab]      = useState("trends");
  const [activeSrc,    setActiveSrc]    = useState("all");
  const [articles,     setArticles]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [stale,        setStale]        = useState(false);
  const [fetchError,   setFetchError]   = useState(false);
  const [lastUpdate,   setLastUpdate]   = useState(null);
  const [socialTab,    setSocialTab]    = useState("instagram");
  const [viralTf,      setViralTf]      = useState("1h");
  const [selectedPost, setSelectedPost] = useState(null);
  const [seed,         setSeed]         = useState(0);
  const [autoRefresh,  setAutoRefresh]  = useState(true);
  const [nextIn,       setNextIn]       = useState(REFRESH_INTERVAL / 1000);
  const timerRef     = useRef();
  const countdownRef = useRef();
  const articlesRef  = useRef([]);
  articlesRef.current = articles;

  const instaTrends = buildInstaTrends(seed);
  const fbTrends    = buildFbTrends();

  const doFetch = useCallback(async (bg = false) => {
    setLoading(true); setFetchError(false);
    if (bg || articlesRef.current.length > 0) setStale(true);
    try {
      const src = NEWS_SOURCES.find(s => s.id === activeSrc);
      let items = [];
      if (src?.url) {
        items = await fetchFeed(src);
      } else {
        const sources = NEWS_SOURCES.filter(s => ALL_SOURCE_IDS.includes(s.id));
        const results = await Promise.allSettled(sources.map(fetchFeed));
        const flat = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
        flat.sort((a,b) => new Date(b.pubDate||0)-new Date(a.pubDate||0));
        const seen = new Set();
        items = flat.filter(a => {
          const k = a.title?.slice(0,50).toLowerCase();
          if (!k||seen.has(k)) return false; seen.add(k); return true;
        }).slice(0, 30);
      }
      if (items.length > 0) {
        setArticles(items); setLastUpdate(new Date()); setSeed(s => s+1); setFetchError(false);
      } else if (articlesRef.current.length === 0) setFetchError(true);
    } catch { if (articlesRef.current.length===0) setFetchError(true); }
    finally { setLoading(false); setStale(false); }
  }, [activeSrc]);

  useEffect(() => { doFetch(false); }, [doFetch]);

  useEffect(() => {
    if (!autoRefresh) { clearInterval(timerRef.current); clearInterval(countdownRef.current); return; }
    setNextIn(REFRESH_INTERVAL/1000);
    timerRef.current     = setInterval(() => { doFetch(true); setNextIn(REFRESH_INTERVAL/1000); }, REFRESH_INTERVAL);
    countdownRef.current = setInterval(() => setNextIn(n => Math.max(0,n-1)), 1000);
    return () => { clearInterval(timerRef.current); clearInterval(countdownRef.current); };
  }, [autoRefresh, doFetch]);

  const fmtCountdown = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  // ── Pressespiegel panel ────────────────────────────────────────────────────
  const pressPanel = (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Source tabs */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", paddingBottom:12, borderBottom:`1px solid ${C.borderLight}`, flexShrink:0 }}>
        {NEWS_SOURCES.map(s => {
          const on = activeSrc === s.id;
          return (
            <button key={s.id} onClick={() => setActiveSrc(s.id)} style={{
              padding:"5px 12px", borderRadius:20, cursor:"pointer", fontFamily:FONT,
              fontSize:11.5, fontWeight:on?700:500, transition:"all .12s",
              border:`1.5px solid ${on?s.color:C.border}`,
              background:on?s.color:"transparent", color:on?"#fff":C.textMid,
            }}>{s.label}</button>
          );
        })}
      </div>

      {/* Loading bar */}
      <div style={{ height:2, background:C.borderLight, flexShrink:0, overflow:"hidden", marginBottom:2 }}>
        {loading && (
          <div style={{
            height:"100%", width:"40%", background:C.accent,
            backgroundImage:`linear-gradient(90deg, transparent 0%, ${C.accent} 50%, transparent 100%)`,
            backgroundSize:"200% 100%", animation:"shimmer 1.2s ease-in-out infinite",
          }}/>
        )}
      </div>

      <div style={{ flex:1, overflowY:"auto", paddingTop:4 }}>
        {loading && articles.length === 0 && Array.from({length:7}).map((_,i) => (
          <div key={i} style={{ padding:"12px 0", borderBottom:`1px solid ${C.borderLight}` }}>
            <div style={{ height:11, width:"14%", borderRadius:4, marginBottom:8, background:"#E9EAEC" }}/>
            <div style={{ height:15, width:"88%", borderRadius:4, marginBottom:5, background:"#E9EAEC" }}/>
            <div style={{ height:11, width:"55%", borderRadius:4, background:"#F3F4F6" }}/>
          </div>
        ))}

        {fetchError && articles.length === 0 && (
          <div style={{ padding:"40px 0", textAlign:"center" }}>
            <AlertCircle size={28} strokeWidth={1} style={{ margin:"0 auto 10px", display:"block", opacity:.4 }}/>
            <div style={{ fontSize:13, fontWeight:600, color:C.textSoft, marginBottom:6 }}>Feed nicht verfügbar</div>
            <div style={{ fontSize:11.5, color:C.textMute, marginBottom:16 }}>Diese Quelle lässt sich momentan nicht laden.</div>
            <button onClick={() => doFetch(false)} style={{ padding:"7px 16px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, color:C.text, cursor:"pointer", fontFamily:FONT, fontSize:12, fontWeight:600 }}>
              Erneut versuchen
            </button>
          </div>
        )}

        {articles.length > 0 && (
          <div style={{ opacity: stale ? 0.55 : 1, transition:"opacity .2s" }}>
            {articles.map((art, i) => {
              const srcObj = NEWS_SOURCES.find(s => s.label === art.sourceLabel);
              return (
                <a key={art.id||i} href={art.link} target="_blank" rel="noopener noreferrer"
                  style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"11px 2px", borderBottom:i<articles.length-1?`1px solid ${C.borderLight}`:"none", textDecoration:"none", color:"inherit", borderRadius:6, transition:"background .1s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ minWidth:22, fontSize:12, fontWeight:800, color:i<3?C.accent:C.textMute, fontFamily:FONT, paddingTop:2, flexShrink:0, textAlign:"right" }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:srcObj?.color||C.textMute, background:(srcObj?.color||"#6B7280")+"18", borderRadius:4, padding:"1px 6px" }}>{art.sourceLabel}</span>
                      {art.pubDate && <span style={{ fontSize:10, color:C.textMute, display:"flex", alignItems:"center", gap:3 }}><Clock size={9} strokeWidth={2}/>vor {timeAgo(art.pubDate)}</span>}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, lineHeight:1.4, marginBottom:art.description?4:0 }}>{art.title}</div>
                    {art.description && <div style={{ fontSize:11.5, color:C.textSoft, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{art.description}</div>}
                  </div>
                  {art.thumbnail && <img src={art.thumbnail} alt="" loading="lazy" style={{ width:56, height:44, objectFit:"cover", borderRadius:7, flexShrink:0 }} onError={e=>e.currentTarget.style.display="none"}/>}
                  <div style={{ color:C.textMute, paddingTop:2, flexShrink:0 }}><ExternalLink size={12} strokeWidth={1.5}/></div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── Social Trends panel ────────────────────────────────────────────────────
  const socialTabs = [
    { id:"instagram", label:"Instagram", I:Instagram,     color:"#E1306C" },
    { id:"facebook",  label:"Facebook",  I:Facebook,      color:"#1877F2" },
    { id:"whatsapp",  label:"WhatsApp",  I:MessageCircle, color:"#25D366" },
  ];
  const activeSocialTab = socialTabs.find(t => t.id === socialTab);
  const viralPosts      = VIRAL_POSTS[socialTab]?.[viralTf] || [];

  const socialPanel = (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Platform tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.borderLight}`, flexShrink:0 }}>
        {socialTabs.map(t => {
          const on = socialTab === t.id;
          return (
            <button key={t.id} onClick={() => setSocialTab(t.id)} style={{
              flex:1, padding:"9px 4px", border:"none", background:"none", cursor:"pointer",
              fontFamily:FONT, fontSize:11, fontWeight:on?700:500,
              color:on?t.color:C.textMute,
              borderBottom:on?`2px solid ${t.color}`:"2px solid transparent",
              display:"flex", alignItems:"center", justifyContent:"center", gap:5, transition:"all .12s",
            }}>
              <t.I size={13} strokeWidth={IW}/>{t.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex:1, overflowY:"auto", paddingTop:12 }}>

        {/* ── Viral Posts ── */}
        <div style={{ marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Flame size={13} color="#EF4444" strokeWidth={2.5}/>
              <span style={{ fontFamily:FONT, fontSize:12.5, fontWeight:700, color:C.text }}>Viral Posts</span>
            </div>
            {/* Timeframe filter */}
            <div style={{ display:"flex", gap:3 }}>
              {["1h","6h","24h"].map(tf => (
                <button key={tf} onClick={() => setViralTf(tf)} style={{
                  padding:"3px 9px", borderRadius:6, cursor:"pointer",
                  fontFamily:FONT, fontSize:10.5, fontWeight:viralTf===tf?700:500,
                  border:`1px solid ${viralTf===tf ? activeSocialTab.color : C.border}`,
                  background:viralTf===tf ? activeSocialTab.color+"18" : "transparent",
                  color:viralTf===tf ? activeSocialTab.color : C.textMute,
                  transition:"all .12s",
                }}>{tf}</button>
              ))}
            </div>
          </div>

          {viralPosts.map((post, i) => (
            <ViralPostRow
              key={post.id}
              post={post}
              platform={socialTab}
              accent={activeSocialTab.color}
              rank={i + 1}
              onClick={() => setSelectedPost(post)}
            />
          ))}
        </div>

        {/* ── Compact Trending ── */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, paddingTop:4, borderTop:`1px solid ${C.borderLight}` }}>
            <TrendingUp size={12} strokeWidth={2} color={C.textMute}/>
            <span style={{ fontSize:11.5, fontWeight:700, color:C.textMid }}>
              {socialTab === "instagram" ? "Trending Hashtags" : socialTab === "facebook" ? "Trending Topics" : "Viral Topics"}
            </span>
          </div>

          {socialTab === "instagram" && (
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {instaTrends.map((item,i) => (
                <div key={item.tag} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:7, background:i<3?"#FFF0F6":C.surface, border:`1px solid ${i<3?"#FCB8D4":C.border}` }}>
                  <span style={{ fontSize:10, fontWeight:800, color:i<3?"#E1306C":C.textMute, minWidth:16, fontFamily:FONT }}>{i+1}</span>
                  <span style={{ flex:1, fontSize:12, fontWeight:700, color:"#E1306C" }}>{item.tag}</span>
                  <span style={{ fontSize:9.5, color:C.textMute }}>{item.posts}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:"#16A34A" }}>{item.d}</span>
                  {item.hot && <Flame size={9} color="#E1306C" strokeWidth={2.5}/>}
                </div>
              ))}
            </div>
          )}

          {socialTab === "facebook" && (
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {fbTrends.map((item,i) => (
                <div key={item.topic} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:7, background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${i<3?"#1877F2":C.border}` }}>
                  <span style={{ flex:1, fontSize:11.5, fontWeight:600, color:C.text }}>{item.topic}</span>
                  <span style={{ fontSize:9.5, fontWeight:700, color:ENG_CLR[item.engagement]||C.textMute, background:(ENG_CLR[item.engagement]||C.textMute)+"14", borderRadius:4, padding:"1px 6px" }}>{item.engagement}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:"#16A34A" }}>{item.change}</span>
                </div>
              ))}
            </div>
          )}

          {socialTab === "whatsapp" && (
            <div style={{ fontSize:10.5, color:C.textSoft, lineHeight:1.6, padding:"8px 10px", background:"#F0FDF4", borderRadius:8, border:"1px solid #A7F3D0" }}>
              WhatsApp-Daten basieren auf Korrelation öffentlicher Trend-Signale. Einzelne Nachrichten sind nicht einsehbar.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Layout ─────────────────────────────────────────────────────────────────
  const MAIN_TABS = [
    { id:"trends",         label:"Trends",           icon:<Flame size={13} strokeWidth={IW}/> },
    { id:"domain",         label:"Domain-Analyse",   icon:<Globe size={13} strokeWidth={IW}/> },
    { id:"wettbewerber",   label:"Wettbewerber",     icon:<Target size={13} strokeWidth={IW}/> },
    { id:"content-audit",  label:"Content-Audit",    icon:<FileText size={13} strokeWidth={IW}/> },
    { id:"structure-audit",label:"Structure-Audit",  icon:<Code2 size={13} strokeWidth={IW}/> },
    { id:"social-intel",   label:"Social Intelligence", icon:<Share2 size={13} strokeWidth={IW}/> },
  ];

  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", background:"#F9FAFB", fontFamily:FONT }}>
      {selectedPost && (
        <ViralPostModal
          post={selectedPost}
          platform={socialTab}
          accent={socialTabs.find(t => t.id === socialTab)?.color || C.accent}
          onClose={() => setSelectedPost(null)}
        />
      )}
      {/* Header */}
      <div style={{ padding:"14px 20px 0", flexShrink:0, borderBottom:`1px solid ${C.borderLight}`, background:"#fff" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div>
            <div style={{ fontFamily:FONT, fontSize:20, fontWeight:700, color:C.text, letterSpacing:"-.3px" }}>Research</div>
            {mainTab === "trends" && (
              <div style={{ fontSize:11.5, color:C.textMute, marginTop:2, display:"flex", alignItems:"center", gap:8 }}>
                {lastUpdate ? (
                  <>
                    <span style={{ display:"flex", alignItems:"center", gap:3 }}><Wifi size={10} strokeWidth={2} color="#16A34A"/>Zuletzt: {lastUpdate.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</span>
                    {autoRefresh && <span>· Refresh in {fmtCountdown(nextIn)}</span>}
                  </>
                ) : loading ? <span>Lade…</span> : null}
              </div>
            )}
          </div>
          {mainTab === "trends" && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={() => setAutoRefresh(s => !s)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", borderRadius:20, cursor:"pointer", fontFamily:FONT, fontSize:11, fontWeight:600, transition:"all .12s", border:`1.5px solid ${autoRefresh?"#16A34A":C.border}`, background:autoRefresh?"#F0FDF4":"transparent", color:autoRefresh?"#16A34A":C.textMute }}>
                {autoRefresh ? <Wifi size={11} strokeWidth={2}/> : <WifiOff size={11} strokeWidth={2}/>}
                Auto-Refresh {autoRefresh?"an":"aus"}
              </button>
              <button onClick={() => { doFetch(true); setNextIn(REFRESH_INTERVAL/1000); }} disabled={loading} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 13px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, color:loading?C.textMute:C.text, cursor:loading?"default":"pointer", fontSize:12, fontWeight:600, fontFamily:FONT }}>
                <RefreshCw size={13} strokeWidth={2} style={{ animation:loading?"spin .8s linear infinite":"none" }}/>
                Aktualisieren
              </button>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display:"flex", gap:4 }}>
          {MAIN_TABS.map(t => {
            const on = mainTab === t.id;
            return (
              <button key={t.id} onClick={() => setMainTab(t.id)} style={{
                display:"flex", alignItems:"center", gap:5,
                padding:"7px 16px", borderRadius:"8px 8px 0 0", cursor:"pointer", fontFamily:FONT,
                fontSize:12.5, fontWeight:on?700:500, transition:"all .12s",
                border:`1px solid ${on ? C.border : "transparent"}`,
                borderBottom: on ? "1px solid #fff" : "1px solid transparent",
                background: on ? "#fff" : "transparent",
                color: on ? C.accent : C.textMid,
                marginBottom: on ? -1 : 0,
              }}>
                {t.icon}{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trends tab: two columns */}
      {mainTab === "trends" && (
        <div style={{ flex:1, overflow:"hidden", display:"flex" }}>
          {/* LEFT: Pressespiegel */}
          <div style={{ flex:"0 0 58%", display:"flex", flexDirection:"column", overflow:"hidden", borderRight:`1px solid ${C.borderLight}`, padding:"16px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, flexShrink:0 }}>
              <Newspaper size={16} strokeWidth={IW} color={C.textMid}/>
              <span style={{ fontFamily:FONT, fontWeight:700, fontSize:14, color:C.text }}>Pressespiegel</span>
              {articles.length > 0 && <span style={{ fontSize:10, fontWeight:700, color:C.textMute, background:C.borderLight, borderRadius:10, padding:"1px 7px" }}>{articles.length} Artikel</span>}
              {loading && articles.length > 0 && <div style={{ width:14, height:14, border:`2px solid ${C.accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite", marginLeft:"auto" }}/>}
            </div>
            <div style={{ flex:1, overflow:"hidden" }}>{pressPanel}</div>
          </div>

          {/* RIGHT: Social Trends */}
          <div style={{ flex:"0 0 42%", display:"flex", flexDirection:"column", overflow:"hidden", padding:"16px 20px", background:"#fff" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, flexShrink:0 }}>
              <TrendingUp size={16} strokeWidth={IW} color={C.textMid}/>
              <span style={{ fontFamily:FONT, fontWeight:700, fontSize:14, color:C.text }}>Social Trends</span>
            </div>
            <div style={{ flex:1, overflow:"hidden" }}>{socialPanel}</div>
          </div>
        </div>
      )}

      {/* Domain-Analyse tab */}
      {mainTab === "domain" && (
        <div style={{ flex:1, overflowY:"auto", padding:"24px 24px" }}>
          <DomainAnalyseTab/>
        </div>
      )}

      {/* Wettbewerber tab */}
      {mainTab === "wettbewerber" && (
        <div style={{ flex:1, overflowY:"auto", padding:"24px 24px" }}>
          <WettbewerberTab/>
        </div>
      )}

      {/* Content-Audit tab */}
      {mainTab === "content-audit" && (
        <div style={{ flex:1, overflow:"auto", padding:"20px 24px" }}>
          <ContentAuditTab/>
        </div>
      )}

      {/* Structure-Audit tab */}
      {mainTab === "structure-audit" && (
        <div style={{ flex:1, overflow:"auto", padding:"20px 24px" }}>
          <StructureAuditTab/>
        </div>
      )}

      {/* Social Intelligence tab */}
      {mainTab === "social-intel" && (
        <div style={{ flex:1, overflow:"auto", padding:"20px 24px" }}>
          <SocialIntelligenceTab/>
        </div>
      )}
    </div>
  );
}
