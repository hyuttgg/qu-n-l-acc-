import React, { useEffect } from 'react';
import { useApp } from '../store';
import { BarChart2, TrendingUp, DollarSign, Box, Clock, Activity } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export const AnalyticsDashboard: React.FC = () => {
  const { analytics, fetchAnalytics } = useApp();

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const formatBeli = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  const COLORS = ['#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#8b5cf6', '#3b82f6', '#ef4444', '#eab308'];

  // Default values
  const levelProgress = analytics?.levelProgress || [];
  const fruitsData = analytics?.fruitsDistribution || [];
  const materialsData = analytics?.materialsDistribution || [];
  const metrics = analytics?.sessionMetrics || {
    totalSessionsCount: 0,
    avgSessionDuration: 0,
    longestSessionDuration: 0,
  };

  const totalFruits = fruitsData.reduce((acc, curr) => acc + (curr.value || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white glow-text-cyan flex items-center gap-2">
          <BarChart2 className="w-8 h-8 text-gold" /> ANALYTICS CENTER
        </h1>
        <p className="text-slate-400 text-sm mt-1">Efficiency reviews, level growth curves, and aggregate gold growth statistics</p>
      </div>

      {/* Session Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 border-l-4 border-l-gold flex items-center gap-4">
          <div className="p-3 bg-gold/10 border border-gold/20 rounded-xl text-gold">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs block font-bold uppercase tracking-wider">Total Sessions</span>
            <span className="text-2xl font-black text-white mt-1">{metrics.totalSessionsCount}</span>
          </div>
        </div>

        <div className="glass-panel p-6 border-l-4 border-l-ocean-cyan flex items-center gap-4">
          <div className="p-3 bg-ocean-cyan/10 border border-ocean-cyan/20 rounded-xl text-ocean-cyan">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs block font-bold uppercase tracking-wider">Avg Session Time</span>
            <span className="text-2xl font-black text-white mt-1">{formatDuration(metrics.avgSessionDuration)}</span>
          </div>
        </div>

        <div className="glass-panel p-6 border-l-4 border-l-purple-500 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs block font-bold uppercase tracking-wider">Longest session</span>
            <span className="text-2xl font-black text-white mt-1">{formatDuration(metrics.longestSessionDuration)}</span>
          </div>
        </div>
      </div>

      {/* Grid of detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Level Progression */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold" /> Level Progression Curve
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={levelProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis domain={[0, 2800]} stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0b1329', border: '1px solid #1e2541' }} labelStyle={{ color: '#fff' }} />
                <Line type="monotone" dataKey="level" stroke="#d4af37" strokeWidth={3} dot={{ fill: '#d4af37', strokeWidth: 2 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Beli & Fragment Earned */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" /> Beli & Fragments Earned
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1329', border: '1px solid #1e2541' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(val: any) => formatBeli(Number(val))}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value: string) => <span className="text-slate-300 font-semibold ml-1">{value}</span>}
                />
                <Bar dataKey="beli" name="Beli" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fragments" name="Fragments" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 3: Materials Collected */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Box className="w-5 h-5 text-sky-400" /> Materials Collected Breakdown
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={materialsData}>
                <defs>
                  <linearGradient id="colorMat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0b1329', border: '1px solid #1e2541' }} labelStyle={{ color: '#fff' }} />
                <Area type="monotone" dataKey="quantity" name="Quantity" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMat)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 4: Devil Fruits Collected */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <h3 className="text-lg font-bold text-white mb-4">Devil Fruits Inventory Share</h3>
          <div className="h-[240px] flex justify-center items-center relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
              <span className="text-2xl font-black text-white">{totalFruits}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Fruits</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fruitsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {fruitsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1329', border: '1px solid #1e2541', borderRadius: '0.75rem' }}
                  itemStyle={{ color: '#fff', fontWeight: 600 }}
                  formatter={(value: any, name: any) => [`${value} quả`, name]}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value: string) => <span className="text-slate-300 font-semibold ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
