import { useState, useRef, useCallback } from "react";
import {
  LayoutDashboard, Send, Image, Calendar, BarChart2, Settings, Flag,
  Users, Bell, LogOut, Plus, Search, Clock, Check, X, Edit2, Trash2,
  Upload, Star, TrendingUp, ArrowUp, ArrowDown, Activity, Globe,
  Lock, Mail, Shield, AlertCircle, CheckCircle, Instagram,
  Twitter, Linkedin, Facebook, Music, Hash, Layers, Inbox, Sparkles,
  Tag, MapPin, Zap, FileText, Eye
} from "lucide-react";

const FONT = "'DM Sans', system-ui, sans-serif";
const C = {
  bg:"#F7F8FA", sidebar:"#0D0F12", surface:"#FFFFFF", border:"#E4E7EC",
  text:"#101828", textSoft:"#667085", textMute:"#98A2B3", textMid:"#344054",
  accent:"#E53E3E", accentLight:"#FEF2F2", success:"#027A48", successBg:"#ECFDF3",
  warning:"#B54708", warningBg:"#FFFAEB", info:"#175CD3", infoBg:"#EFF8FF",
  purple:"#6941C6", purpleBg:"#F9F5FF", borderLight:"#F2F4F7",
};

export default function App() {
  return (
    <div style={{padding:40,fontFamily:FONT,background:C.sidebar,minHeight:'100vh',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:60,height:60,borderRadius:15,background:C.accent,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
          <Layers size={28} color="#fff" strokeWidth={1.5}/>
        </div>
        <h1 style={{fontSize:32,fontWeight:900,marginBottom:8,letterSpacing:'-.5px'}}>SocialFlow Pro</h1>
        <p style={{color:'#9ca3af',fontSize:16,marginBottom:24}}>Deployment erfolgreich! ✅</p>
        <p style={{color:'#6B7280',fontSize:13}}>Die vollständige App wird gleich geladen...</p>
      </div>
    </div>
  );
}
