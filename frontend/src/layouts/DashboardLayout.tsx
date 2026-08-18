import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useApp } from '../store';
import {
  Compass,
  Layers,
  ShoppingBag,
  Sparkles,
  Swords,
  Zap,
  Crown,
  BarChart2,
  Clock,
  Settings,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Activity,
  Globe,
  FileText,
  Terminal
} from 'lucide-react';
import { WasmStatusBadge } from '../components/WasmStatusBadge';

export const DashboardLayout: React.FC = () => {
  const { user, logout, accounts, analytics } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuGroups: {
    title: string;
    items: {
      name: string;
      path: string;
      icon: React.ComponentType<any>;
      disabled?: boolean;
      external?: boolean;
    }[];
  }[] = [
    {
      title: 'Core Fleet',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: Compass },
        { name: 'Accounts', path: '/dashboard/accounts', icon: Layers },
        { name: 'Live Fleet', path: '/dashboard/live', icon: Activity },
        { name: 'Geo Monitor', path: '/dashboard/geo', icon: Globe },
      ]
    },
    {
      title: 'Inventory',
      items: [
        { name: 'Inventory', path: '/dashboard/inventory', icon: ShoppingBag },
        { name: 'Fruits', path: '/dashboard/fruits', icon: Sparkles },
        { name: 'Weapons', path: '/dashboard/weapons', icon: Swords },
        { name: 'Fighting Styles', path: '/dashboard/styles', icon: Zap },
        { name: 'Accessories', path: '/dashboard/accessories', icon: Crown },
      ]
    },
    {
      title: 'System',
      items: [
        { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart2 },
        { name: 'Lua Inspector', path: '/dashboard/admin-lua', icon: Terminal },
        { name: 'Sessions', path: '/dashboard/sessions', icon: Clock },
        { name: 'Settings', path: '/dashboard/settings', icon: Settings },
        { name: 'API Docs', path: '/dashboard/docs', icon: FileText }
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen liquid-ambient-bg flex overflow-hidden">
      {/* Floating Glass Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 p-4 transform lg:transform-none lg:opacity-100 transition-all duration-300 flex flex-col justify-between ${
        sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="h-full liquid-glass flex flex-col justify-between overflow-hidden">
          {/* Sidebar Brand header */}
          <div className="p-5 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <Compass className="w-7 h-7 text-cyan-400 animate-spin-slow" style={{ animationDuration: '25s' }} />
              <span className="text-lg font-black tracking-wider text-gradient-cyan">
                OCEANFORGE
              </span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <span className="px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">
                  {group.title}
                </span>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  if (item.disabled) {
                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-slate-600 cursor-not-allowed text-xs font-medium"
                      >
                        <Icon className="w-4 h-4 text-slate-700" />
                        <span>{item.name}</span>
                      </div>
                    );
                  }
                  if (item.external) {
                    return (
                      <a
                        key={item.name}
                        href={item.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl font-semibold text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                      >
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span>{item.name}</span>
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl font-semibold text-xs transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/15 text-cyan-300 border border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Sidebar User Footer */}
          <div className="p-4 border-t border-white/10 bg-black/20 space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 border border-cyan-400/30 overflow-hidden flex-shrink-0">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-xs text-white truncate">{user?.username}</h4>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-cyan-400/80">{user?.role || 'Member'}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-2xl text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold transition-all duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>LOG OUT</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar Header */}
        <header className="h-16 px-6 sticky top-0 z-30 flex items-center justify-between">
          <div className="w-full h-full my-2 liquid-glass px-4 flex items-center justify-between rounded-2xl">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>

            <div className="sm:hidden text-base font-black tracking-wide text-gradient-cyan">
              OCEANFORGE
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>OceanForge Vision OS v2.0</span>
            </div>

            {/* Topbar Right: Status Pill & C# Wasm Badge */}
            <div className="flex items-center gap-3">
              <WasmStatusBadge />
              {((accounts && accounts.some(a => a.status !== 'offline')) || (analytics?.summary?.onlineAccounts || 0) > 0) ? (
                <span className="liquid-pill border-emerald-500/40 text-emerald-300 bg-emerald-950/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Realtime Active
                </span>
              ) : (
                <span className="liquid-pill border-slate-700 text-slate-400 bg-slate-900/60">
                  <span className="w-2 h-2 rounded-full bg-slate-500" /> Fleet Idle
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
