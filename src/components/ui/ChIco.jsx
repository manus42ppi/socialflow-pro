import { Globe } from "lucide-react";
import { C, IW } from "../../constants/colors.js";
import { CHCLR } from "../../constants/nav.js";

// ── CHANNEL ICONS (custom SVG – brand color or monochrome via color prop) ──
export default function ChIco({id,size=14,color}){
  const col=color||CHCLR[id]||C.textSoft;
  if(id==="instagram") return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke={col} strokeWidth="2"/>
      <circle cx="12" cy="12" r="4" stroke={col} strokeWidth="2"/>
      <circle cx="17.5" cy="6.5" r="1.3" fill={col}/>
    </svg>
  );
  if(id==="twitter") return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill={col}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.838L2.016 2.25H8.48l4.26 5.632 5.504-5.632z"/>
    </svg>
  );
  if(id==="linkedin") return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="3" stroke={col} strokeWidth="2"/>
      <path d="M7 10v7M7 7.5v.01M11 10v7M11 13a3 3 0 016 0v4" stroke={col} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
  if(id==="facebook") return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" stroke={col} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
  if(id==="whatsapp") return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.954 9.954 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke={col} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8.5 8.5s.5 1 1.5 2 2 1.5 2 1.5l1.5-1 2 3.5s-2 1.5-3.5.5C10 14 8 12 7 10c-1-2 1.5-1.5 1.5-1.5z" stroke={col} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if(id==="website") return <Globe size={size} color={col||"#0EA5E9"} strokeWidth={IW}/>;
  if(id==="print") return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="2" width="14" height="10" rx="1" stroke={col||"#64748B"} strokeWidth="1.8"/>
      <path d="M5 14H3a1 1 0 00-1 1v4a1 1 0 001 1h18a1 1 0 001-1v-4a1 1 0 00-1-1h-2" stroke={col||"#64748B"} strokeWidth="1.8" strokeLinejoin="round"/>
      <rect x="5" y="16" width="14" height="6" rx="1" stroke={col||"#64748B"} strokeWidth="1.8"/>
      <path d="M8 6h8M8 9h5" stroke={col||"#64748B"} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
  return <Globe size={size} color={col} strokeWidth={IW}/>;
}
