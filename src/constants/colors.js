// ── FONT & COLORS ──────────────────────────────────────────────────────────
export const FONT = "'Inter', 'DM Sans', system-ui, sans-serif";
export const FONT_DISPLAY = "'Syne', 'Inter', system-ui, sans-serif";
export const IW = 1.7;
export const C = {
  bg:"#F7F7F5", sidebar:"#111110",
  sidebarMid:"#1A1A18",
  surface:"#FFFFFF", border:"#E8E8E4", borderLight:"#F0F0EC",
  text:"#111110", textMid:"#3D3D3A", textSoft:"#787873", textMute:"#AEAEA8",
  accent:"#5B5BD6", accentLight:"#EDEDFF", accentGlow:"rgba(91,91,214,0.12)",
  success:"#30A46C", successBg:"#E5F7EF",
  warning:"#C4511E", warningBg:"#FFF0E6",
  info:"#5B5BD6", infoBg:"#EDEDFF",
  purple:"#5B5BD6", purpleBg:"#EDEDFF",
  purpleGlow:"rgba(91,91,214,0.15)",
  ai1:"#5B5BD6", ai2:"#7C7CE8",
  red:"#E5484D", redLight:"#FFECEC",
  glass:"rgba(255,255,255,0.7)",
  glassStroke:"rgba(255,255,255,0.9)",
};
export const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@200;300;400;500;600;700;800;900&display=swap');
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes glow { 0%,100%{box-shadow:0 0 8px rgba(94,53,177,0.3)} 50%{box-shadow:0 0 18px rgba(94,53,177,0.6)} }
  * { box-sizing:border-box; }  body { margin:0; }
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:99px}
  ::-webkit-scrollbar-thumb:hover{background:#94A3B8}
`;
