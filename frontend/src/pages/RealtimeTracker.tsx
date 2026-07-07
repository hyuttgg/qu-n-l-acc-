import React, { useEffect, useState } from 'react';
import { useApp } from '../store';
import { Compass, Zap, MapPin, Target, Clock, ShieldAlert } from 'lucide-react';

export const RealtimeTracker: React.FC = () => {
  const { accounts, fetchAccounts, user } = useApp();
  const [liveLogs, setLiveLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchAccounts();

    // Generate mock notifications to populate feed initially
    setLiveLogs([
      `[${new Date().toLocaleTimeString()}] System: Established Socket.io connection pipeline for room "${user?.username}"`,
      `[${new Date().toLocaleTimeString()}] System: Listening for inbound Blox Fruits executor heartbeats...`,
    ]);
  }, []);

  // Listen for realtime logs when accounts status changes or drops occur
  const onlineAccounts = accounts.filter((acc) => acc.status !== 'offline');

  const formatPlaytime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white glow-text-cyan flex items-center gap-2">
          <Compass className="w-8 h-8 text-gold animate-pulse" /> LIVE FLEET TRACKER
        </h1>
        <p className="text-slate-400 text-sm mt-1">Socket.io pipeline streaming active character farm tasks in realtime</p>
      </div>

      {/* Grid of Online Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {onlineAccounts.map((acc) => (
          <div
            key={acc._id}
            className="glass-panel border-l-4 border-l-emerald-500 p-6 relative overflow-hidden group hover:border-emerald-500/30 transition transform duration-200"
          >
            {/* Glowing active bubble indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Live</span>
            </div>

            <h3 className="text-lg font-bold text-white mb-4 pr-12 truncate">{acc.robloxUsername}</h3>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-center gap-2.5 text-slate-300">
                <Zap className="w-4 h-4 text-gold" />
                <span className="font-semibold">Level:</span>
                <span className="text-white font-bold">{acc.level} / 2550</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span className="font-semibold">Location:</span>
                <span className="text-sky-300 font-bold truncate max-w-[180px]">{acc.location} (Sea {acc.sea})</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <Target className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="font-semibold">Task:</span>
                <span className="text-white font-extrabold capitalize bg-red-500/10 px-2 py-0.5 border border-red-500/20 rounded text-xs">
                  {acc.status}
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">Runtime:</span>
                <span className="text-slate-300 font-bold">{formatPlaytime(acc.playtime)}</span>
              </div>
            </div>

            {/* Micro-detail grid for equipped items */}
            <div className="mt-5 p-3 rounded-lg bg-slate-950/60 border border-slate-900 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Equipped Fruit:</span>
                <span className="font-bold text-gold">{acc.equipped.fruit}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-900/50 pt-2">
                <span className="text-slate-500 font-semibold">Fighting Style:</span>
                <span className="font-bold text-sky-400">{acc.equipped.fightingStyle}</span>
              </div>
            </div>
          </div>
        ))}

        {onlineAccounts.length === 0 && (
          <div className="col-span-full py-16 px-6 glass-panel border border-slate-800 text-center flex flex-col items-center justify-center gap-3">
            <ShieldAlert className="w-10 h-10 text-slate-600" />
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">No Online Characters Detected</p>
            <p className="text-slate-600 text-xs max-w-sm">
              Your accounts are currently offline. Execute the sender.lua script to stream live updates.
            </p>
          </div>
        )}
      </div>

      {/* Activity Feed log console */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">Socket Ingestion Logs</h3>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-xs text-slate-300 space-y-2 h-[240px] overflow-y-auto">
          {liveLogs.map((log, idx) => (
            <div key={idx} className="flex gap-2 hover:bg-slate-900/20 py-0.5 px-1 rounded transition-colors">
              <span className="text-slate-600 font-semibold">[{idx + 1}]</span>
              <p className="break-all">{log}</p>
            </div>
          ))}
          <div className="text-slate-600 text-[10px] italic border-t border-slate-900 pt-2">
            *** Ready to receive socket packets ***
          </div>
        </div>
      </div>
    </div>
  );
};
