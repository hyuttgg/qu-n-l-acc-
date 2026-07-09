import React, { useEffect } from 'react';
import { useApp } from '../store';
import { Compass, Gem, Coins, Clock, Sparkles, Copy, Check } from 'lucide-react';
import { api } from '../utils/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const DashboardOverview: React.FC = () => {
  const { analytics, fetchAnalytics, accounts, fetchAccounts, user } = useApp();
  const [scriptCopied, setScriptCopied] = React.useState(false);
  const [isCopying, setIsCopying] = React.useState(false);

  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const displayLoaderScript = `loadstring(game:HttpGet("${BACKEND_URL}/api/lua/load?token=..."))()`;

  useEffect(() => {
    fetchAnalytics();
    fetchAccounts();
  }, []);

  const formatBeli = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPlaytime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  };

  const COLORS = ['#d4af37', '#5bc0be', '#3a506b', '#ff4757', '#ffa502', '#2ed573', '#1e90ff'];

  // Safe destructuring of analytics
  const summary = analytics?.summary || {
    totalAccounts: 0,
    onlineAccounts: 0,
    totalBeli: 0,
    totalFragments: 0,
    totalPlaytime: 0,
    totalFruitsCount: 0,
  };

  const fruitsData = analytics?.fruitsDistribution || [];
  const hourlyActivity = analytics?.hourlyActivity || [];

  return (
    <div className="space-y-8">
      {/* Header Title */}
      <div>
        <h1 className="text-3xl font-black text-white glow-text-cyan flex items-center gap-2">
          <Compass className="w-8 h-8 text-gold" /> FLEET OVERVIEW
        </h1>
        <p className="text-slate-400 text-sm mt-1">Realtime aggregation across all active Roblox client endpoints</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Card 1: Total Accounts */}
        <div className="glass-panel p-5 border-l-4 border-l-ocean-cyan flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Accounts</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-white">{summary.totalAccounts}</span>
            <span className="text-slate-500 text-xs font-bold">accs</span>
          </div>
        </div>

        {/* Card 2: Online Accounts */}
        <div className="glass-panel p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Online Status</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-emerald-400 glow-text-cyan">{summary.onlineAccounts}</span>
            <span className="text-slate-500 text-xs font-bold">online</span>
          </div>
        </div>

        {/* Card 3: Total Beli */}
        <div className="glass-panel p-5 border-l-4 border-l-emerald-400 flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Beli</span>
          <div className="mt-2 flex items-center gap-1.5">
            <Coins className="w-5 h-5 text-emerald-400" />
            <span className="text-2xl font-black text-emerald-400">{formatBeli(summary.totalBeli)}</span>
          </div>
        </div>

        {/* Card 4: Total Fragments */}
        <div className="glass-panel p-5 border-l-4 border-l-purple-500 flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Fragments</span>
          <div className="mt-2 flex items-center gap-1.5">
            <Gem className="w-5 h-5 text-purple-400" />
            <span className="text-2xl font-black text-purple-400">{formatBeli(summary.totalFragments)}</span>
          </div>
        </div>

        {/* Card 5: Total Fruits */}
        <div className="gold-panel p-5 border-l-4 border-l-gold flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Stored Fruits</span>
          <div className="mt-2 flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-2xl font-black text-gold glow-text-gold">{summary.totalFruitsCount}</span>
          </div>
        </div>

        {/* Card 6: Total Playtime */}
        <div className="glass-panel p-5 border-l-4 border-l-blue-500 flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Playtime</span>
          <div className="mt-2 flex items-center gap-1.5">
            <Clock className="w-5 h-5 text-sky-400" />
            <span className="text-2xl font-black text-sky-400">{formatPlaytime(summary.totalPlaytime)}</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Feed Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly activity line/area chart */}
        <div className="glass-panel p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-white mb-4">Fleet Ingestion Activity</h3>
          <div className="h-[280px]">
            {hourlyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyActivity}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5bc0be" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#5bc0be" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0b1329', border: '1px solid #1e2541' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#5bc0be" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">No activity recorded. Deferring to updates.</div>
            )}
          </div>
        </div>

        {/* Stored fruits distribution pie chart */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <h3 className="text-lg font-bold text-white mb-4">Top Stored Fruits</h3>
          <div className="h-[200px] flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fruitsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {fruitsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1329', border: '1px solid #1e2541' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-xs text-slate-500 font-bold uppercase">Total</span>
              <span className="text-2xl font-black text-white">{summary.totalFruitsCount}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            {fruitsData.slice(0, 4).map((fruit, idx) => (
              <div key={fruit.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-400 font-medium truncate">{fruit.name} ({fruit.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Accounts list & webhook setup help */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Accounts quick status */}
        <div className="glass-panel p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Active Accounts Status</h3>
            <span className="text-xs text-slate-500 font-bold">Updates realtime</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="pb-3">Username</th>
                  <th className="pb-3">Level</th>
                  <th className="pb-3 text-emerald-400">Beli</th>
                  <th className="pb-3 text-purple-400">Fragments</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {accounts.slice(0, 5).map((acc) => (
                  <tr key={acc._id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3 font-bold text-white">{acc.robloxUsername}</td>
                    <td className="py-3 text-slate-300 font-semibold">{acc.level} / 2550</td>
                    <td className="py-3 text-emerald-400 font-mono">{formatBeli(acc.beli)}</td>
                    <td className="py-3 text-purple-400 font-mono">{formatBeli(acc.fragments)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold capitalize ${
                        acc.status === 'offline' ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 text-xs font-medium">
                      {new Date(acc.lastSeen).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                      No accounts registered. Deploy your Lua script to connect accounts!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lua Instructions Quick Panel */}
        <div className="glass-panel p-6 border border-gold/10">
          <h3 className="text-lg font-bold text-white mb-3 text-gold glow-text-gold">Quick Start Guide</h3>
          <p className="text-slate-400 text-xs leading-relaxed mb-4">
            Connect your Roblox executor to your CrimsonForge dashboard. Execute our Lua script to synchronize your stats in real-time.
          </p>
          <div className="space-y-4">
            {/* Copy box */}
            <div className="space-y-2">
              <label className="block text-slate-400 text-[10px] uppercase font-extrabold tracking-wider">Roblox Loader Script</label>
              <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="font-mono text-white text-[10px] select-all break-all flex-1">
                  {displayLoaderScript}
                </span>
                <button
                  onClick={async () => {
                    if (isCopying) return;
                    setIsCopying(true);
                    try {
                      const res = await api.post('/auth/loader-token', {});
                      if (res.success && res.token) {
                        const copyText = `loadstring(game:HttpGet("${BACKEND_URL}/api/lua/load?token=${res.token}"))()`;
                        await navigator.clipboard.writeText(copyText);
                        setScriptCopied(true);
                        setTimeout(() => setScriptCopied(false), 2000);
                      } else {
                        alert('Failed to generate loader token.');
                      }
                    } catch (err) {
                      console.error('Error generating token:', err);
                      const fallbackUrl = `${BACKEND_URL}/api/lua/load?key=${user?.apiKey || 'YOUR_API_KEY'}`;
                      const fallbackScript = `loadstring(game:HttpGet("${fallbackUrl}"))()`;
                      await navigator.clipboard.writeText(fallbackScript);
                      setScriptCopied(true);
                      setTimeout(() => setScriptCopied(false), 2000);
                    } finally {
                      setIsCopying(false);
                    }
                  }}
                  disabled={isCopying}
                  className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-450 hover:text-white transition disabled:opacity-50"
                  title="Copy Script (Generates dynamic token)"
                >
                  {scriptCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-gold/15 border border-gold/30 text-gold flex items-center justify-center font-bold flex-shrink-0">1</span>
                <p className="text-slate-300">Copy your API Key from the top-bar header.</p>
              </div>
              <div className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-gold/15 border border-gold/30 text-gold flex items-center justify-center font-bold flex-shrink-0">2</span>
                <p className="text-slate-300">Execute the **Roblox Loader Script** copied above in your executor.</p>
              </div>
              <div className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-gold/15 border border-gold/30 text-gold flex items-center justify-center font-bold flex-shrink-0">3</span>
                <p className="text-slate-300">Paste your API Key in the in-game CrimsonForge GUI to connect.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
