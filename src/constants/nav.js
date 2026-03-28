import {
  LayoutDashboard, Send, Image, Calendar, BarChart2, Settings, Flag,
  FileText, Trash2, BookOpen, CalendarRange,
} from "lucide-react";

// ── CHANNEL COLORS ──────────────────────────────────────────────────────────
export const CHCLR = {
  instagram:"#E1306C",
  twitter:"#000000",
  linkedin:"#0077B5",
  facebook:"#1877F2",
  whatsapp:"#25D366",
};

// ── NAV GROUPS ──────────────────────────────────────────────────────────────
export const NAV_GROUPS = [
  {label:"WORKSPACE",items:[
    {id:"dashboard",  label:"Dashboard",        I:LayoutDashboard},
    {id:"publisher",  label:"Publisher",         I:Send},
    {id:"media",      label:"Medienbibliothek",  I:Image},
    {id:"calendar",   label:"Kalender",          I:Calendar},
    {id:"planner",    label:"Planner",           I:CalendarRange},
    {id:"drafts",     label:"Entwürfe",          I:FileText},
    {id:"trash",      label:"Papierkorb",        I:Trash2},
  ]},
  {label:"STORYS",items:[
    {id:"stories",    label:"Alle Storys",       I:BookOpen},
  ]},
  {label:"ANALYSE",items:[
    {id:"performance",label:"Performance",       I:BarChart2},
    {id:"campaigns",  label:"Kampagnen",         I:Flag},
  ]},
];

// flat list kept for any legacy references
export const NAV = NAV_GROUPS.flatMap(g=>g.items).concat([{id:"admin",label:"Admin",I:Settings,adm:true}]);

export const TITLE = {
  dashboard:"Dashboard",
  publisher:"Publisher",
  drafts:"Entwürfe",
  trash:"Papierkorb",
  stories:"Storys",
  campaigns:"Kampagnen",
  media:"Medienbibliothek",
  calendar:"Kalender",
  planner:"Planner",
  performance:"Performance",
  admin:"Admin",
};
