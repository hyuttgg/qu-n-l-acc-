import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Activity, Sparkles, Compass, Trophy } from 'lucide-react';
export const LandingPage: React.FC = () => {

  return (
    <div className="deepsea-bg min-h-screen relative flex flex-col justify-between overflow-hidden">
      {/* Wave overlays */}
      <div className="wave-container">
        <div className="wave wave1"></div>
        <div className="wave wave2"></div>
        <div className="wave wave3"></div>
      </div>

      {/* Bubbles particle animation */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-sky-400 rounded-full animate-bounce"
            style={{
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              left: `${Math.random() * 100}%`,
              bottom: `${Math.random() * 40}%`,
              animationDuration: `${Math.random() * 4 + 3}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Compass className="w-10 h-10 text-gold animate-spin-slow" style={{ animationDuration: '10s' }} />
          <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-gold via-gold-light to-white bg-clip-text text-transparent glow-text-gold">
            OCEANFORGE
          </span>
        </div>
        <div className="flex gap-4">
          <Link to="/login" className="px-5 py-2 rounded-xl text-slate-300 hover:text-white transition bg-ocean-dark/40 hover:bg-ocean-dark/80 border border-slate-700/50">
            Login
          </Link>
          <Link to="/register" className="px-5 py-2 rounded-xl text-ocean-abyss font-bold bg-gradient-to-r from-gold via-gold-light to-gold shadow-gold-glow hover:opacity-90 transition">
            Register
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-6 py-12 flex flex-col lg:flex-row items-center gap-12 flex-1 justify-center">
        {/* Left Intro Panel */}
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ocean-cyan/10 border border-ocean-cyan/30 text-ocean-cyan text-sm font-semibold">
            <Sparkles className="w-4 h-4" /> The Ultimate Blox Fruits SaaS Panel
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none text-white">
            Forge Your <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent glow-text-gold">Grand Line</span> Fleet
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto lg:mx-0">
            Monitor, track, and manage your Roblox characters in realtime. Auto-compile game logs, inventory structures, drop notifications, and level growth.
          </p>
          <div className="flex justify-center lg:justify-start gap-4 pt-2">
            <Link to="/register" className="px-8 py-4 rounded-2xl text-ocean-abyss font-extrabold bg-gradient-to-r from-gold via-gold-light to-gold shadow-gold-glow hover:scale-105 transition transform duration-200">
              Set Sail Now
            </Link>
            <Link to="/login" className="px-8 py-4 rounded-2xl text-white font-bold bg-ocean-dark/60 border border-ocean-cyan/20 shadow-neon-border hover:bg-ocean-dark/80 transition">
              View Dashboard
            </Link>
          </div>
        </div>

        {/* Right 3D Pirate Card Panel */}
        <div className="flex-1 w-full max-w-md lg:max-w-none flex justify-center">
          <div className="glass-panel neon-border p-6 w-full max-w-md relative overflow-hidden group">
            {/* Gloss shine reflection */}
            <div className="absolute -inset-y-12 -inset-x-0 w-1/2 bg-gradient-to-r from-transparent via-white/5 to-transparent transform skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out" />
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-700/50 mb-6">
              <span className="text-xs uppercase font-extrabold tracking-widest text-ocean-cyan">Live Fleet Metrics</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-ocean-abyss/60 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-xs block mb-1">Active Accounts</span>
                <span className="text-2xl font-extrabold text-white">42 Online</span>
              </div>
              <div className="bg-ocean-abyss/60 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-xs block mb-1">Devil Fruits Logged</span>
                <span className="text-2xl font-extrabold text-gold glow-text-gold">184 Stored</span>
              </div>
              <div className="bg-ocean-abyss/60 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-xs block mb-1">Total Beli</span>
                <span className="text-xl font-extrabold text-emerald-400">120,400,000</span>
              </div>
              <div className="bg-ocean-abyss/60 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-xs block mb-1">Average Level</span>
                <span className="text-2xl font-extrabold text-cyan-300">2,550 Max</span>
              </div>
            </div>

            {/* Treasure Chest Decorative visual */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-gold/10 to-transparent border border-gold/20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center text-gold animate-pulse">
                👑
              </div>
              <div>
                <span className="text-xs font-semibold text-gold block">RARE ITEMS FOUND TODAY</span>
                <span className="text-sm font-bold text-white">Cursed Dual Katana, Dark Coat</span>
              </div>
            </div>
          </div>
        </div>
      </main>



      {/* Footer Features Info */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-12 border-t border-slate-850">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex gap-4 items-start">
            <div className="p-3 rounded-xl bg-ocean-cyan/10 border border-ocean-cyan/20 text-ocean-cyan">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Robust Security</h3>
              <p className="text-slate-400 text-sm mt-1">
                Your Roblox accounts are completely safe. Data is transmitted securely via AES-encrypted keys.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-3 rounded-xl bg-gold/10 border border-gold/20 text-gold">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Realtime WebSockets</h3>
              <p className="text-slate-400 text-sm mt-1">
                Zero delay updates. Live farming statuses, boss spawns, and location changes stream directly to your web browser.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Detailed Analytics</h3>
              <p className="text-slate-400 text-sm mt-1">
                Compare grinding efficiency across multiple accounts. Track levels/hour and drops/day dynamically.
              </p>
            </div>
          </div>
        </div>
        <div className="text-center text-slate-500 text-xs mt-12">
          &copy; {new Date().getFullYear()} OceanForge Manager. Styled for the Grand Line.
        </div>
      </footer>
    </div>
  );
};
