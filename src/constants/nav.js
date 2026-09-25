import {
  LayoutDashboard, Send, Image, Calendar, BarChart2, Settings,
  Flag, Trash2, CalendarRange, Eye, Inbox,
  Flame, Globe, Target, FileText, Code2, Share2, Wand2, Package, Layers, Printer,
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
  {
    label: "WORKSPACE",
    items: [
      { id:"dashboard",   label:"Dashboard",        I:LayoutDashboard },
    ],
  },
  {
    label: "ERSTELLEN",
    items: [
      { id:"content",     label:"Inhalte",           I:Layers       },
      { id:"produkte",    label:"Produkte",          I:Package      },
      { id:"ugc",         label:"UGC Portal",        I:Inbox        },
    ],
  },
  {
    label: "PUBLISHING",
    items: [
      { id:"publisher",   label:"Publisher",         I:Send         },
      { id:"campaigns",   label:"Kampagnen",         I:Flag         },
      { id:"calendar",    label:"Kalender",          I:Calendar     },
      { id:"planner",     label:"Planner",           I:CalendarRange },
      { id:"druck",       label:"Liquid Layout",      I:Printer      },
    ],
  },
  {
    label: "ASSETS",
    items: [
      { id:"media",       label:"Medienbibliothek",  I:Image        },
    ],
  },
  {
    label: "CREATION VOODOO",
    items: [
      { id:"voodoo", label:"Creation Voodoo", I:Wand2 },
    ],
  },
  {
    label: "ANALYSE",
    items: [
      { id:"performance",       label:"Performance",       I:BarChart2    },
      { id:"monitoring",        label:"Monitoring",        I:Eye          },
      { id:"trends",            label:"Trends",            I:Flame        },
      { id:"domain-analyse",    label:"Domain-Analyse",    I:Globe        },
      { id:"wettbewerber",      label:"Wettbewerber",      I:Target       },
      { id:"content-audit",     label:"Content-Audit",     I:FileText     },
      { id:"structure-audit",   label:"Structure-Audit",   I:Code2        },
      { id:"social-intel",      label:"Social Intelligence", I:Share2     },
    ],
  },
];

export const NAV_UTILITY = [
  { id:"trash", label:"Papierkorb", I:Trash2 },
];

export const NAV = [
  ...NAV_GROUPS.flatMap(g => g.items),
  ...NAV_UTILITY,
  { id:"admin", label:"Admin", I:Settings, adm:true },
];

export const TITLE = {
  dashboard:          "Dashboard",
  content:            "Inhalte",
  publisher:          "Publisher",
  trash:              "Papierkorb",
  stories:            "Storys",
  produkte:           "Produkte",
  ugc:                "UGC Portal",
  campaigns:          "Kampagnen",
  media:              "Medienbibliothek",
  calendar:           "Kalender",
  planner:            "Planner",
  performance:        "Performance",
  monitoring:         "Instagram Monitoring",
  admin:              "Admin",
  trends:             "Trends",
  "domain-analyse":   "Domain-Analyse",
  wettbewerber:       "Wettbewerber",
  "content-audit":    "Content-Audit",
  "structure-audit":  "Structure-Audit",
  "social-intel":     "Social Intelligence",
  voodoo:             "Creation Voodoo",
  druck:              "Liquid Layout",
};
