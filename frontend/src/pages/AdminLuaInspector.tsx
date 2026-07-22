import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useApp } from '../store';
import { io, Socket } from 'socket.io-client';
import {
  Terminal,
  Activity,
  Code,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  Package,
  Shield,
  Zap,
  Sword,
  Crosshair,
  Sparkles,
  X,
  Search
} from 'lucide-react';

interface LuaLogEntry {
  id: string;
  timestamp: string;
  userEmail: string;
  username: string;
  robloxUsername: string;
  ip: string;
  executorHeader: string;
  payloadSizeBytes: number;
  rawPayload: any;
  parsedSummary: {
    level: number;
    beli: number;
    fragments: number;
    sea: number;
    race: string;
    status: string;
    location: string;
    equipped: any;
    fruitsCount: number;
    materialsCount: number;
    swordsCount: number;
    gunsCount: number;
    stylesCount: number;
    accessoriesCount: number;
  };
}

export const AdminLuaInspector: React.FC = () => {
  const { user, token } = useApp();
  const [logs, setLogs] = useState<LuaLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<LuaLogEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'raw' | 'inventory' | 'equipped'>('raw');
  const [copied, setCopied] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Fetch initial logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/lua-logs');
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching admin lua logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Listen to realtime socket updates
  useEffect(() => {
    if (!token || !user || !isLive) return;

    const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim().replace(/\/+$/, '');
    const socket: Socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('Admin socket connected for Lua telemetry');
    });

    socket.on('admin_lua_payload', (newLog: LuaLogEntry) => {
      setLogs((prev) => [newLog, ...prev].slice(0, 100));
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user, isLive]);

  // Clear logs
  const handleClearLogs = async () => {
    try {
      const res = await api.delete('/admin/lua-logs');
      if (res.success) {
        setLogs([]);
        setSelectedLog(null);
      }
    } catch (err) {
      console.error('Error clearing logs', err);
    }
  };

  // Simulate test payload
  const handleSimulatePayload = async () => {
    try {
      setSimulating(true);
      await api.post('/admin/simulate-lua-payload', {});
      await fetchLogs();
    } catch (err) {
      console.error('Error simulating payload', err);
    } finally {
      setSimulating(false);
    }
  };

  // Copy raw JSON to clipboard
  const handleCopyJson = async (data: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Filter logs by search query
  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    return (
      log.robloxUsername?.toLowerCase().includes(q) ||
      log.userEmail?.toLowerCase().includes(q) ||
      log.parsedSummary?.status?.toLowerCase().includes(q) ||
      log.parsedSummary?.location?.toLowerCase().includes(q) ||
      JSON.stringify(log.rawPayload).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 border-l-4 border-l-cyan-400 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white glow-text-cyan flex items-center gap-2">
              <Terminal className="w-7 h-7 text-cyan-400" /> RAW LUA TRAFFIC INSPECTOR
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 animate-pulse">
              <Activity className="w-3 h-3 text-cyan-400" /> 100% RAW ACCURACY
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Realtime HTTP Telemetry stream received from Roblox Executor scripts. Inspect 100% exact JSON payloads.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              isLive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
            }`}
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isLive ? 'Stream: LIVE' : 'Stream: PAUSED'}
          </button>

          <button
            onClick={handleSimulatePayload}
            disabled={simulating}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            {simulating ? 'Simulating...' : 'Test Payload'}
          </button>

          <button
            onClick={fetchLogs}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>

          <button
            onClick={handleClearLogs}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Clear Logs
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Logged</span>
            <span className="text-xl font-black text-white">{logs.length} requests</span>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Avg Payload Size</span>
            <span className="text-xl font-black text-white">
              {logs.length > 0
                ? (
                    logs.reduce((sum, l) => sum + (l.payloadSizeBytes || 0), 0) /
                    logs.length /
                    1024
                  ).toFixed(2)
                : '0.00'}{' '}
              KB
            </span>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Executor Security</span>
            <span className="text-xl font-black text-white">100% Encrypted</span>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Inspection Mode</span>
            <span className="text-xl font-black text-white">Full JSON Raw</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by Roblox username, status, location, or raw JSON content..."
          className="bg-transparent text-sm text-white placeholder-slate-500 w-full focus:outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white text-xs">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Content Layout: Table & Inspector Modal */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Incoming HTTP Payloads Stream</span>
          <span className="text-xs text-cyan-400 font-normal">Click any entry to inspect 100% raw JSON</span>
        </h3>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-3">
            <Terminal className="w-12 h-12 mx-auto text-slate-600 animate-pulse" />
            <p className="text-sm">No raw Lua payload logs received yet.</p>
            <p className="text-xs text-slate-600">
              Run the Roblox Loader script or click <strong>Test Payload</strong> above to simulate a live request.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => {
                  setSelectedLog(log);
                  setActiveTab('raw');
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  selectedLog?.id === log.id
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-cyan-400 font-mono text-xs">
                    POST
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white">{log.robloxUsername}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {log.parsedSummary.status}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">({(log.payloadSizeBytes / 1024).toFixed(1)} KB)</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>Owner: <strong className="text-slate-300">{log.userEmail}</strong></span>
                      <span>•</span>
                      <span>Location: <strong className="text-slate-300">{log.parsedSummary.location}</strong></span>
                      <span>•</span>
                      <span>Lvl: <strong className="text-gold">{log.parsedSummary.level}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right hidden md:block">
                    <span className="block text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="block text-[10px] text-slate-500">{log.ip}</span>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 text-xs font-bold flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5" /> Inspect JSON
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw Payload Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col border border-cyan-500/40 shadow-2xl shadow-cyan-950/80 rounded-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Terminal className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    Raw Telemetry: <span className="text-cyan-400">{selectedLog.robloxUsername}</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Received at {new Date(selectedLog.timestamp).toLocaleString()} ({selectedLog.ip})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 pt-4 bg-slate-950/50 border-b border-slate-800 flex items-center gap-2">
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 ${
                  activeTab === 'raw'
                    ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-400 border-x border-slate-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" /> 100% Raw JSON Code
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 ${
                  activeTab === 'inventory'
                    ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-400 border-x border-slate-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" /> Inventory Breakdown
              </button>

              <button
                onClick={() => setActiveTab('equipped')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 ${
                  activeTab === 'equipped'
                    ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-400 border-x border-slate-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sword className="w-3.5 h-3.5" /> Equipped Loadout
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950/90 font-mono text-xs">
              {activeTab === 'raw' && (
                <div className="relative">
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                    <button
                      onClick={() => handleCopyJson(selectedLog.rawPayload)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied Raw JSON!' : 'Copy Raw JSON'}
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-900/90 text-emerald-400 overflow-x-auto border border-slate-800 leading-relaxed font-mono text-xs select-all">
                    {JSON.stringify(selectedLog.rawPayload, null, 2)}
                  </pre>
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  {/* Fruits */}
                  <div>
                    <h4 className="text-sm font-bold text-gold mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-gold" /> Devil Fruits ({selectedLog.parsedSummary.fruitsCount})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedLog.rawPayload?.inventory?.fruits || []).map((f: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-gold/10 text-gold border border-gold/30 font-semibold text-xs">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Swords */}
                  <div>
                    <h4 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
                      <Sword className="w-4 h-4 text-cyan-400" /> Swords ({selectedLog.parsedSummary.swordsCount})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedLog.rawPayload?.inventory?.swords || []).map((s: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Guns */}
                  <div>
                    <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-emerald-400" /> Guns ({selectedLog.parsedSummary.gunsCount})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedLog.rawPayload?.inventory?.guns || []).map((g: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold text-xs">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Fighting Styles */}
                  <div>
                    <h4 className="text-sm font-bold text-purple-400 mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" /> Fighting Styles ({selectedLog.parsedSummary.stylesCount})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedLog.rawPayload?.inventory?.styles || []).map((st: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30 font-semibold text-xs">
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'equipped' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-xs font-bold uppercase block">Fruit Equipped</span>
                    <span className="text-lg font-black text-gold mt-1 block">
                      {selectedLog.parsedSummary.equipped?.fruit || selectedLog.rawPayload?.fruit_equipped || 'None'}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">
                      Mastery: {selectedLog.parsedSummary.equipped?.fruitMastery || selectedLog.rawPayload?.fruit_mastery || 0}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-xs font-bold uppercase block">Sword Equipped</span>
                    <span className="text-lg font-black text-cyan-400 mt-1 block">
                      {selectedLog.parsedSummary.equipped?.sword || selectedLog.rawPayload?.sword || 'None'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-xs font-bold uppercase block">Gun Equipped</span>
                    <span className="text-lg font-black text-emerald-400 mt-1 block">
                      {selectedLog.parsedSummary.equipped?.gun || selectedLog.rawPayload?.gun || 'None'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-xs font-bold uppercase block">Fighting Style</span>
                    <span className="text-lg font-black text-purple-400 mt-1 block">
                      {selectedLog.parsedSummary.equipped?.fightingStyle || selectedLog.rawPayload?.fighting_style || 'Combat'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
