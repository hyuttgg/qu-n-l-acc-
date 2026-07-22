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
  Copy,
  Check,
  Key,
  Activity,
  Globe,
  FileText
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyKey = () => {
    if (user?.apiKey) {
      navigator.clipboard.writeText(user.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
    <div className="min-h-screen bg-ocean-abyss flex overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-ocean-deep border-r border-slate-800 transform lg:transform-none lg:opacity-100 transition-all duration-300 flex flex-col justify-between ${
        sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Sidebar Brand header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-850">
          <div className="flex items-center gap-3">
            <Compass className="w-8 h-8 text-gold animate-spin-slow" style={{ animationDuration: '25s' }} />
            <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-gold via-gold-light to-white bg-clip-text text-transparent glow-text-gold">
              OCEANFORGE
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <span className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                {group.title}
              </span>
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                if (item.disabled) {
                  return (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 px-4 py-2 text-slate-600 cursor-not-allowed text-xs font-semibold"
                    >
                      <Icon className="w-4.5 h-4.5 text-slate-750" />
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
                      className="flex items-center gap-3 px-4 py-2 rounded-xl font-semibold text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-all duration-200"
                    >
                      <Icon className="w-4.5 h-4.5 text-slate-400" />
                      <span>{item.name}</span>
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-xl font-semibold text-xs transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-gold/20 to-gold/5 text-gold border-l-2 border-gold shadow-gold-border'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-gold' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center text-gold border border-gold/30 overflow-hidden flex-shrink-0">
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
                <UserIcon className="w-5 h-5" />
              )}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-bold text-sm text-white truncate">{user?.username}</h4>
              <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">{user?.role}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-400 hover:text-white hover:bg-red-500/10 border border-red-500/20 text-xs font-bold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>LOG OUT</span>
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar Header */}
        <header className="h-20 bg-ocean-deep/60 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white mr-4">
            <Menu className="w-6 h-6" />
          </button>

          {/* Topbar Left: API Key Quick copy */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 text-xs max-w-sm">
              <Key className="w-4 h-4 text-gold flex-shrink-0" />
              <span className="text-slate-400 font-medium">API Key:</span>
              <span className="text-white font-mono truncate max-w-[150px]">{user?.apiKey}</span>
              <button
                onClick={handleCopyKey}
                className="text-slate-400 hover:text-gold ml-2 flex-shrink-0 transition-colors"
                title="Copy API Key"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400 animate-pulse" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copied && <span className="text-emerald-400 text-xs font-bold animate-fade-in">Copied!</span>}
          </div>

          <div className="sm:hidden text-lg font-black tracking-wide text-gold glow-text-gold">
            OCEANFORGE
          </div>

          {/* Topbar Right: Status info or dynamic stats */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-slate-400 text-xs block font-bold uppercase tracking-wider">Server Status</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Realtime Active
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-ocean-abyss relative">
          {/* Subtle ocean ambient lighting glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-ocean-cyan/5 to-transparent rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-t from-gold/2 to-transparent rounded-full blur-[80px] pointer-events-none" />

          {/* React router nested child components */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};
