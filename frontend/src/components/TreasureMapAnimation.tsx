import React from 'react';

export const TreasureMapAnimation: React.FC = () => {
  const pathD = "M 40 140 C 90 60, 120 160, 180 100 C 240 40, 280 160, 340 60";

  return (
    <div className="relative w-full h-48 bg-slate-950/40 rounded-2xl border border-slate-800/30 overflow-hidden flex items-center justify-center p-4 shadow-inner group">
      {/* Grid Overlay background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
      
      {/* Compass rose in the background */}
      <div className="absolute right-4 top-4 w-16 h-16 border border-gold/10 rounded-full flex items-center justify-center opacity-25 group-hover:opacity-40 transition-opacity duration-500">
        <div className="w-12 h-12 border border-dashed border-gold/20 rounded-full animate-spin-slow" style={{ animationDuration: '60s' }} />
        <div className="absolute w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[20px] border-b-gold/40 -top-1" />
        <div className="absolute w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[20px] border-t-gold/20 -bottom-1" />
      </div>

      <svg className="w-full h-full relative z-10 overflow-visible" viewBox="0 0 380 200">
        {/* Style definitions for path and animations */}
        <defs>
          {/* Gold Glow filter */}
          <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Cyan Glow filter */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Sea wave details */}
        <path d="M 60 40 Q 70 35, 80 40" fill="none" stroke="#1e293b" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <path d="M 280 150 Q 290 145, 300 150" fill="none" stroke="#1e293b" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <path d="M 150 50 Q 160 45, 170 50" fill="none" stroke="#1e293b" strokeWidth="1" strokeLinecap="round" opacity="0.5" />

        {/* Islands representing the Seas */}
        {/* Island 1: Starter Island (Sea 1) */}
        <g transform="translate(40, 140)" className="cursor-pointer group/island">
          <circle r="16" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
          <circle r="12" fill="#1e293b" opacity="0.2" />
          <path d="M -8 2 Q -4 -12, 8 -4 Q 12 10, -8 2" fill="#334155" opacity="0.4" />
          <text y="24" textAnchor="middle" className="text-[9px] fill-slate-400 font-extrabold uppercase tracking-wider select-none">Sea 1</text>
        </g>

        {/* Island 2: Kingdom of Rose (Sea 2) */}
        <g transform="translate(180, 100)">
          <circle r="18" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
          <circle r="14" fill="#1e293b" opacity="0.2" />
          <path d="M -10 -5 Q 0 -15, 12 -5 Q 8 12, -10 -5" fill="#334155" opacity="0.4" />
          <text y="26" textAnchor="middle" className="text-[9px] fill-slate-400 font-extrabold uppercase tracking-wider select-none">Sea 2</text>
        </g>

        {/* Island 3: Castle on the Sea (Sea 3 / Treasure destination) */}
        <g transform="translate(340, 60)">
          <circle r="22" fill="#0f172a" stroke="#334155" strokeWidth="1.5" filter="url(#glow-cyan)" className="animate-pulse" style={{ animationDuration: '3s' }} />
          <circle r="16" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="3 3" />
          <text y="30" textAnchor="middle" className="text-[9px] fill-cyan-400 font-extrabold uppercase tracking-wider select-none">Sea 3</text>
        </g>

        {/* The Sailing Route Dotted Path */}
        <path
          d={pathD}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="2"
          strokeDasharray="4 6"
          strokeLinecap="round"
          className="opacity-20"
        />
        
        {/* Active glowing animated route segment */}
        <path
          d={pathD}
          fill="none"
          stroke="#eab308"
          strokeWidth="2"
          strokeDasharray="6 8"
          strokeLinecap="round"
          className="opacity-70"
          style={{
            strokeDashoffset: 100,
            animation: 'route-flow 12s linear infinite'
          }}
        />

        {/* The Animated Ship */}
        <g
          style={{
            offsetPath: `path("${pathD}")`,
            offsetRotate: 'auto', // Align ship's nose along path
            animation: 'sail 14s linear infinite'
          }}
        >
          {/* Glowing ship trail */}
          <circle r="6" fill="#eab308" opacity="0.3" filter="url(#glow-gold)" className="animate-ping" style={{ animationDuration: '1.5s' }} />
          
          {/* Stylized Pirate/Sailing Ship SVG */}
          <g transform="translate(-10, -14) scale(0.8)">
            {/* Hull */}
            <path d="M 4 16 C 6 20, 18 20, 20 16 C 22 13, 23 11, 23 11 L 1 11 C 1 11, 2 13, 4 16 Z" fill="#eab308" />
            {/* Sails */}
            <path d="M 6 10 C 6 10, 10 7, 10 3 C 8 7, 6 10, 6 10 Z" fill="#ffffff" />
            <path d="M 12 10 C 12 10, 16 6, 16 1 C 14 6, 12 10, 12 10 Z" fill="#ffffff" opacity="0.9" />
            <path d="M 18 10 C 18 10, 20 8, 20 4 C 19 8, 18 10, 18 10 Z" fill="#ffffff" opacity="0.8" />
            {/* Mast flags */}
            <path d="M 10 2 L 12 3 L 10 4 Z" fill="#ef4444" />
          </g>
        </g>

        {/* The Treasure Chest (at the end) */}
        <g transform="translate(340, 60) scale(0.9)" className="cursor-pointer">
          {/* Pulsing glow ring */}
          <circle r="14" fill="none" stroke="#eab308" strokeWidth="1" className="animate-ping" style={{ animationDuration: '2s' }} />
          
          {/* Golden Chest SVG */}
          <g transform="translate(-12, -12)">
            {/* Chest base */}
            <rect x="2" y="10" width="20" height="12" rx="2" fill="#b45309" stroke="#eab308" strokeWidth="1.5" />
            {/* Chest lid */}
            <path d="M 2 10 C 2 4, 22 4, 22 10 Z" fill="#d97706" stroke="#eab308" strokeWidth="1.5" />
            {/* Gold bindings */}
            <rect x="6" y="6" width="2" height="16" fill="#eab308" />
            <rect x="16" y="6" width="2" height="16" fill="#eab308" />
            {/* Key lock */}
            <circle cx="12" cy="12" r="2.5" fill="#1e293b" stroke="#eab308" strokeWidth="1" />
            {/* Glowing magic particle sparkles */}
            <circle cx="2" cy="4" r="1.5" fill="#facc15" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
            <circle cx="22" cy="3" r="1" fill="#facc15" className="animate-pulse" style={{ animationDelay: '0.6s' }} />
            <circle cx="12" cy="1" r="1.5" fill="#facc15" className="animate-pulse" />
          </g>
        </g>
      </svg>

      {/* Tailwind animation keyframe inject style tag */}
      <style>{`
        @keyframes sail {
          0% {
            offset-distance: 0%;
          }
          100% {
            offset-distance: 100%;
          }
        }
        @keyframes route-flow {
          0% {
            stroke-dashoffset: 200;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
};
