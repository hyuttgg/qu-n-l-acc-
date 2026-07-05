import React, { useEffect, useState } from 'react';
import { useApp } from '../store';
import { 
  Anchor, 
  Compass,
  Users, 
  MapPin, 
  Sparkles, 
  History,
  Skull,
  Clock
} from 'lucide-react';

export const LeviathanManager: React.FC = () => {
  const { 
    activeLeviathan, 
    leviathanHistory, 
    fetchActiveLeviathan, 
    fetchLeviathanHistory, 
    fetchLeviathanAnalytics 
  } = useApp();

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Sea Event Timeline configuration
  const STAGES = [
    'Preparing',
    'Spy Checked',
    'Crew Ready',
    'Danger 6',
    'Frozen Watcher',
    'Leviathan Spawn',
    'Battle',
    'Heart Retrieved',
    'Finished'
  ];

  // Dynamic stage calculation based on state
  const getCurrentStageIndex = () => {
    if (!activeLeviathan) return 0;
    if (activeLeviathan.status === 'Finished') return 8;
    if (activeLeviathan.progress?.heartStatus === 'Obtained' || activeLeviathan.progress?.heartStatus === 'Transporting') return 7;
    if (activeLeviathan.status === 'Fighting') return 6;
    if (activeLeviathan.status === 'Activated') return 5;
    if (activeLeviathan.progress?.frozenDetected) return 4;
    if (activeLeviathan.progress?.dangerLevel === 6) return 3;
    if (activeLeviathan.team && activeLeviathan.team.length >= 5) return 2;
    if (activeLeviathan.progress?.spyMessage && activeLeviathan.progress.spyMessage !== "I don't know anything yet." && activeLeviathan.progress.spyMessage !== "") return 1;
    return 0;
  };

  const currentStageIndex = getCurrentStageIndex();

  useEffect(() => {
    const initData = async () => {
      await Promise.all([
        fetchActiveLeviathan(),
        fetchLeviathanHistory()
      ]);
      const analyticData = await fetchLeviathanAnalytics();
      setAnalytics(analyticData);
      setLoading(false);
    };
    initData();
  }, []);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started': return 'border-l-slate-500 text-slate-400';
      case 'Searching': return 'border-l-blue-500 text-blue-400';
      case 'Activated': return 'border-l-yellow-500 text-yellow-400';
      case 'Fighting': return 'border-l-red-500 text-red-500 font-bold animate-pulse';
      case 'Heart Obtained': return 'border-l-emerald-500 text-emerald-400';
      case 'Finished': return 'border-l-purple-500 text-purple-400';
      default: return 'border-l-slate-500 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 text-sm mt-4 font-semibold uppercase tracking-wider">Loading Sea Events Panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white glow-text-cyan flex items-center gap-2">
            <Anchor className="w-8 h-8 text-gold" /> LEVIATHAN MANAGER
          </h1>
          <p className="text-slate-400 text-sm mt-1">Realtime hunt coordinator, party casualty tracker, and event diagnostics</p>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-panel p-4 border-l-4 border-l-gold">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Hunts</span>
            <span className="text-xl font-black text-white block mt-1">{analytics.totalHunts} runs</span>
          </div>
          <div className="glass-panel p-4 border-l-4 border-l-emerald-500">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Success Rate</span>
            <span className="text-xl font-black text-emerald-400 block mt-1">{analytics.successRate}%</span>
          </div>
          <div className="glass-panel p-4 border-l-4 border-l-purple-500">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Avg Duration</span>
            <span className="text-xl font-black text-slate-300 block mt-1">{formatDuration(analytics.avgDuration)}</span>
          </div>
          <div className="glass-panel p-4 border-l-4 border-l-cyan-500">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Scales</span>
            <span className="text-xl font-black text-cyan-400 block mt-1">{analytics.totalScales} scales</span>
          </div>
          <div className="glass-panel p-4 border-l-4 border-l-red-500">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Hearts</span>
            <span className="text-xl font-black text-red-400 block mt-1">{analytics.totalHearts} hearts</span>
          </div>
        </div>
      )}

      {/* Realtime Dashboard */}
      {activeLeviathan ? (
        <div className="space-y-6">
          {/* Sea Event Timeline Widget */}
          <div className="glass-panel p-6">
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-ocean-cyan border-b border-slate-800 pb-3 mb-6 flex items-center gap-2">
              <Compass className="w-5 h-5 text-gold animate-spin-slow" /> Sea Event Timeline
            </h3>
            
            {/* Horizontal Timeline Steps */}
            <div className="relative flex flex-col md:flex-row justify-between items-center gap-6 md:gap-2">
              {/* Connector line for desktop */}
              <div className="absolute top-4 left-0 right-0 h-1 bg-slate-800 hidden md:block z-0" />
              <div 
                className="absolute top-4 left-0 h-1 bg-gradient-to-r from-gold to-gold-light hidden md:block z-0 transition-all duration-500" 
                style={{ width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }}
              />

              {STAGES.map((stage, idx) => {
                const isCompleted = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                
                return (
                  <div key={idx} className="flex md:flex-col items-center gap-3 md:gap-2 z-10 w-full md:w-auto relative">
                    {/* Glowing Bubble */}
                    <div 
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-gradient-to-r from-gold to-gold-light border-gold text-ocean-abyss shadow-gold-glow' 
                          : isCurrent 
                            ? 'bg-ocean-cyan border-ocean-cyan text-ocean-abyss shadow-cyan-glow animate-pulseScale' 
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    {/* Stage Title */}
                    <span 
                      className={`text-[10px] font-bold uppercase tracking-wider text-center block ${
                        isCurrent 
                          ? 'text-ocean-cyan font-black' 
                          : isCompleted 
                            ? 'text-gold' 
                            : 'text-slate-500'
                      }`}
                    >
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left/Middle: Live Telemetry */}
            <div className="md:col-span-2 space-y-6">
              {/* Telemetry Panel */}
              <div className="glass-panel p-6 space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-ocean-cyan">Live Fleet Stream</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Server: {activeLeviathan.serverId.substring(0, 10)}...
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status */}
                  <div className={`p-4 rounded-xl border border-slate-800 bg-ocean-abyss/40 border-l-4 ${getStatusColor(activeLeviathan.status)}`}>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Leviathan Status</span>
                    <span className="text-lg font-black block mt-1">{activeLeviathan.status}</span>
                  </div>

                  {/* Danger Level */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-ocean-abyss/40">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Sea Danger Level</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-black text-red-400">Danger {activeLeviathan.progress?.dangerLevel || 1}</span>
                      <div className="flex gap-1 flex-1 max-w-[120px] ml-2">
                        {[...Array(6)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`h-2 flex-1 rounded-sm ${
                              i < (activeLeviathan.progress?.dangerLevel || 1) 
                                ? 'bg-red-500 shadow-neon-border' 
                                : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spy Monitor */}
                <div className="p-5 rounded-xl border border-slate-850 bg-ocean-abyss/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Spy Dialogue Monitor</span>
                    <span className="text-[9px] font-extrabold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      Classification: {activeLeviathan.progress?.spyMessage?.includes('out there') ? 'Leviathan Available' : 'Unknown/Other'}
                    </span>
                  </div>
                  <p className="text-sm italic font-medium text-slate-200">
                    "{activeLeviathan.progress?.spyMessage || 'No spy conversation logs recorded.'}"
                  </p>
                </div>

                {/* Region & Frozen Watcher */}
                <div className="p-5 rounded-xl border border-slate-850 bg-ocean-abyss/20 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Current Region</span>
                    <span className="text-base font-black text-white block mt-1">
                      {activeLeviathan.progress?.frozenDetected ? 'Frozen Watcher' : 'Rough Seas'}
                    </span>
                  </div>
                  {activeLeviathan.progress?.frozenDetected && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Watcher Coordinates</span>
                      <span className="text-xs font-mono text-cyan-400 block mt-1">
                        {activeLeviathan.progress?.frozenCoordinates || 'Scanning...'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Crew Members (Party) */}
              <div className="glass-panel p-6">
                <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-850 pb-3 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold" /> CREW DETAILS ({activeLeviathan.team?.length || 0} / 6)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeLeviathan.team?.map((member, idx) => (
                    <div 
                      key={idx} 
                      className="bg-ocean-abyss/40 p-4 rounded-xl border border-slate-850 flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-gold">
                          {idx === 0 ? '👑' : idx}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{member.username}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                            {idx === 0 ? 'Captain' : 'Crew Member'}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 ${
                        member.alive 
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                          : 'bg-red-500/10 border border-red-500/30 text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${member.alive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {member.alive ? 'Alive' : 'Dead'}
                      </span>
                    </div>
                  ))}
                  {(!activeLeviathan.team || activeLeviathan.team.length === 0) && (
                    <span className="text-xs text-slate-650 italic col-span-2 py-4 text-center block">No crew details available.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel: Inventory, Battle Stats, Casualty Tracker */}
            <div className="space-y-6">
              {/* Inventory (Scales & Fins) */}
              <div className="glass-panel p-6 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-850 pb-3 mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gold" /> HUNT INVENTORY
                </h3>
                
                {/* Scales Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>Leviathan Scales</span>
                    <span>{activeLeviathan.rewards?.scale || 0}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="bg-gradient-to-r from-cyan-400 to-cyan-200 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((activeLeviathan.rewards?.scale || 0) / 100) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Fins Bar */}
                <div className="space-y-1 mt-4">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>Leviathan Fins</span>
                    <span>{activeLeviathan.rewards?.fins || 0}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="bg-gradient-to-r from-gold to-gold-light h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((activeLeviathan.rewards?.fins || 0) / 10) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Heart */}
                <div className="flex justify-between items-center bg-ocean-abyss/40 p-3 rounded-lg border border-slate-850 mt-4">
                  <span className="text-xs font-bold text-slate-300">Leviathan Heart</span>
                  <span className={`text-sm font-black ${activeLeviathan.rewards?.heart ? 'text-red-400' : 'text-slate-500'}`}>
                    {activeLeviathan.rewards?.heart || 0}
                  </span>
                </div>
              </div>

              {/* Casualty Tracker Widget */}
              <div className="glass-panel p-6 space-y-4 border-t-4 border-t-red-500">
                <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-850 pb-3 mb-2 flex items-center gap-2">
                  <Skull className="w-5 h-5 text-red-500" /> CASUALTY TRACKER
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Deaths</span>
                    <span className="text-2xl font-black text-red-400 block mt-1">
                      {activeLeviathan.battleStats?.membersDead || 0}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Respawn Time</span>
                    <span className="text-2xl font-black text-slate-300 block mt-1 flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4 text-slate-500" /> 15s
                    </span>
                  </div>
                </div>
                
                {/* List of dead players */}
                <div className="space-y-1.5 mt-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Downed Hunters</span>
                  {activeLeviathan.team?.filter(m => !m.alive).map((member, idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center text-xs font-bold text-red-400 bg-red-950/20 border border-red-950/30 p-2 rounded-lg"
                    >
                      <span>{member.username}</span>
                      <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded">DEAD</span>
                    </div>
                  ))}
                  {(!activeLeviathan.team || activeLeviathan.team.filter(m => !m.alive).length === 0) && (
                    <span className="text-xs text-slate-650 italic block text-center py-2">No casualties reported. Clean run!</span>
                  )}
                </div>
              </div>

              {/* Heart Shipment details */}
              <div className="glass-panel p-6 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-850 pb-3 mb-2 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400 animate-bounce" /> HEART SHIPMENT
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold">Status</span>
                    <span className={`font-mono font-bold ${
                      activeLeviathan.progress?.heartStatus === 'Obtained' || activeLeviathan.progress?.heartStatus === 'Transporting'
                        ? 'text-emerald-400' 
                        : 'text-slate-500'
                    }`}>
                      {activeLeviathan.progress?.heartStatus || 'Not Obtained'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold">Destination</span>
                    <span className="text-white font-mono">{activeLeviathan.progress?.destination || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold">Distance Remaining</span>
                    <span className="text-cyan-400 font-mono">{activeLeviathan.progress?.remainingDistance || 0} meters</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 text-center max-w-2xl mx-auto border border-slate-800">
          <Anchor className="w-12 h-12 text-slate-700 mx-auto animate-pulse" />
          <h3 className="text-white font-bold text-lg mt-4">No Active Sea Events</h3>
          <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
            Leviathan hunting telemetry activates dynamically when a Roblox client interacts with the Spy NPC or triggers danger zones.
          </p>
        </div>
      )}

      {/* History Log */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-850 pb-3 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-purple-400" /> HUNTING LOGS & SESSION ARCHIVE
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="pb-3">Roblox Account</th>
                <th className="pb-3">Hunted At</th>
                <th className="pb-3">Final Status</th>
                <th className="pb-3 text-center">Scales</th>
                <th className="pb-3 text-center">Fins</th>
                <th className="pb-3 text-center">Hearts</th>
                <th className="pb-3 text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {leviathanHistory?.map((session) => (
                <tr key={session._id} className="border-b border-slate-850 hover:bg-slate-800/10">
                  <td className="py-3 font-bold text-white">{session.robloxUsername}</td>
                  <td className="py-3 text-slate-400">
                    {new Date(session.startedAt).toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-850 border border-slate-800 text-slate-300">
                      {session.status}
                    </span>
                  </td>
                  <td className="py-3 text-center text-cyan-400 font-bold">{session.rewards?.scale || 0}</td>
                  <td className="py-3 text-center text-gold font-bold">{session.rewards?.fins || 0}</td>
                  <td className="py-3 text-center text-red-400 font-bold">{session.rewards?.heart || 0}</td>
                  <td className="py-3 text-right text-slate-500 font-mono">
                    {formatDuration(session.duration)}
                  </td>
                </tr>
              ))}
              {(!leviathanHistory || leviathanHistory.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-650 italic">No historical hunt records available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeviathanManager;
