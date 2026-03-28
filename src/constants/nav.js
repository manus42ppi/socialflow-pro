import {
  LayoutDashboard, Send, Image, Calendar, BarChart2, Settings,
  Flag, Trash2, BookOpen, CalendarRange, PenLine,
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
// Structure inspired by best-in-class tools (Buffer, Planable, CoSchedule):
// – WORKSPACE         = home/overview (like Hootsuite Home)
// – CONTENT CREATION  = create, write, draft (verb-oriented like Buffer)
// – CONTENT PLANNING  = campaigns, calendar, timeline (Planable/CoSchedule pattern)
// – MEDIENBIBLIOTHEK  = assets & stock search (Later/Sprout Social pattern)
// – ANALYSE           = performance reports
// Utility items (Trash, Admin) live at the sidebar bottom – not in a group
export const NAV_GROUPS = [
  {
    label: "WORKSPACE",
    items: [
      { id:"dashboard",   label:"Dashboard",        I:LayoutDashboard },
    ],
  },
  {
    label: "CONTENT CREATION",
    items: [
      { id:"publisher",   label:"Publisher",         I:Send         },
      { id:"drafts",      label:"Entwürfe",          I:PenLine      },
      { id:"stories",     label:"Storys",            I:BookOpen     },
    ],
  },
  {
    label: "CONTENT PLANNING",
    items: [
      { id:"campaigns",   label:"Kampagnen",         I:Flag         },
      { id:"calendar",    label:"Kalender",          I:Calendar     },
      { id:"planner",     label:"Planner",           I:CalendarRange },
    ],
  },
  {
    label: "MEDIENBIBLIOTHEK",
    items: [
      { id:"media",       label:"Medienbibliothek",  I:Image        },
    ],
  },
  {
    label: "ANALYSE",
    items: [
      { id:"performance", label:"Performance",       I:BarChart2    },
    ],
  },
];

// Utility items shown at the sidebar bottom (trash icon + badge, like Hootsuite)
export const NAV_UTILITY = [
  { id:"trash", label:"Papierkorb", I:Trash2 },
];

// Flat list kept for any legacy/TopBar references
export const NAV = [
  ...NAV_GROUPS.flatMap(g => g.items),
  ...NAV_UTILITY,
  { id:"admin", label:"Admin", I:Settings, adm:true },
];

export const TITLE = {
  dashboard:    "Dashboard",
  publisher:    "Publisher",
  drafts:       "Entwürfe",
  trash:        "Papierkorb",
  stories:      "Storys",
  campaigns:    "Kampagnen",
  media:        "Medienbibliothek",
  calendar:     "Kalender",
  planner:      "Planner",
  performance:  "Performance",
  admin:        "Admin",
};
