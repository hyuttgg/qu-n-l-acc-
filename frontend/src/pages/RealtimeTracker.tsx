import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../store';
import { Compass, Zap, Target, ShieldAlert, Swords, Shield, Sparkles, Activity, CheckCircle2, History, ChevronRight } from 'lucide-react';

// Image resolver helper for item assets
const resolveItemImage = (category: string, name: string) => {
  if (!name || name === 'None') return '';
  const firstName = name.split(',')[0].trim();
  let normalizedName = firstName.replace(/\s+/g, '_');
  let folder = '';
  
  if (category === 'swords' || category === 'weapons') folder = 'kiếm';
  else if (category === 'guns') folder = 'súng';
  else if (category === 'styles' || category === 'melee') folder = 'võ';
  else if (category === 'accessories') folder = 'phụ kiên';
  else if (category === 'fruits') {
    folder = 'trái acc quỷ';
    let cleanName = firstName.split('-')[0].replace(/Physical\s+/i, '').replace(/\s*Fruit/i, '').trim();
    normalizedName = `${cleanName.replace(/\s+/g, '_')}_Fruit`;
  }

  if (!folder) return '';
  return `/ảnh/${folder}/${normalizedName}.webp`;
};

interface EquipmentCardProps {
  title: string;
  category: 'melee' | 'swords' | 'guns' | 'accessories';
  value: string | string[];
  icon: React.ReactNode;
  accentColor: string;
  borderColor: string;
  isUpdated?: boolean;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({
  title,
  category,
  value,
  icon,
  accentColor,
  borderColor,
  isUpdated = false
}) => {
  const items = Array.isArray(value) ? value : [value];
  const primaryItem = items[0] || 'None';

  return (
    <div
      className={`rounded-2xl bg-slate-900/90 border p-5 relative overflow-hidden transition-all duration-500 ${
        isUpdated
          ? 'border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.4)] scale-[1.02]'
          : `${borderColor} hover:border-slate-700`
      }`}
    >
      {/* Background Accent Glow */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl opacity-20 ${accentColor}`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</h3>
        </div>
        {isUpdated && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30 animate-pulse">
            <Sparkles className="w-3 h-3" /> Changed
          </span>
        )}
      </div>

      {/* Item Display Grid */}
      <div className="flex items-start gap-4">
        {/* Item Image Thumbnail */}
        <div className="w-14 h-14 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-center p-1.5 shrink-0">
          {primaryItem !== 'None' && resolveItemImage(category, primaryItem) ? (
            <img
              src={resolveItemImage(category, primaryItem)}
              alt={primaryItem}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-slate-600 text-xs font-semibold">N/A</span>
          )}
        </div>

        {/* Item Names List */}
        <div className="space-y-1 min-w-0 flex-1">
          {Array.isArray(value) && value.length > 0 ? (
            value.map((v, i) => (
              <p key={i} className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                {v || 'None'}
              </p>
            ))
          ) : (
            <p className="text-base font-extrabold text-white truncate">
              {typeof value === 'string' && value ? value : 'None'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const RealtimeTracker: React.FC = () => {
  const { accounts, fetchAccounts } = useApp();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [equipmentHistory, setEquipmentHistory] = useState<Array<{ timestamp: string; username: string; message: string }>>([]);
  const [changedFields, setChangedFields] = useState<{ [key: string]: boolean }>({});
  const prevAccountsRef = useRef<{ [id: string]: any }>({});

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Set default selected account
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0]._id);
    }
  }, [accounts, selectedAccountId]);

  // Detect Equipment Changes & Highlight
  useEffect(() => {
    accounts.forEach((acc) => {
      const prev = prevAccountsRef.current[acc._id];
      if (prev) {
        const changes: string[] = [];
        const newChangedFields: { [key: string]: boolean } = {};

        if (prev.equipped?.fightingStyle !== acc.equipped?.fightingStyle) {
          changes.push(`Melee: ${prev.equipped?.fightingStyle || 'None'} ➔ ${acc.equipped?.fightingStyle}`);
          newChangedFields.melee = true;
        }
        if (prev.equipped?.sword !== acc.equipped?.sword) {
          changes.push(`Sword: ${prev.equipped?.sword || 'None'} ➔ ${acc.equipped?.sword}`);
          newChangedFields.sword = true;
        }
        if (prev.equipped?.gun !== acc.equipped?.gun) {
          changes.push(`Gun: ${prev.equipped?.gun || 'None'} ➔ ${acc.equipped?.gun}`);
          newChangedFields.gun = true;
        }
        if (prev.equipped?.accessory !== acc.equipped?.accessory) {
          changes.push(`Accessory: ${prev.equipped?.accessory || 'None'} ➔ ${acc.equipped?.accessory}`);
          newChangedFields.accessory = true;
        }

        if (changes.length > 0) {
          const time = new Date().toLocaleTimeString();
          changes.forEach((msg) => {
            setEquipmentHistory((h) => [
              { timestamp: time, username: acc.robloxUsername, message: msg },
              ...h.slice(0, 49)
            ]);
          });

          if (acc._id === selectedAccountId) {
            setChangedFields(newChangedFields);
            setTimeout(() => setChangedFields({}), 3000);
          }
        }
      }
      prevAccountsRef.current[acc._id] = acc;
    });
  }, [accounts, selectedAccountId]);

  const selectedAccount = accounts.find((a) => a._id === selectedAccountId) || accounts[0];

  const formatPlaytime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white glow-text-cyan flex items-center gap-2.5">
            <Compass className="w-8 h-8 text-gold animate-spin" /> REALTIME EQUIPMENT MONITOR
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Socket.IO Real-Time Weapon, Melee & Accessory Tracking Engine
          </p>
        </div>

        {/* Status Counter */}
        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2 flex items-center gap-2 text-xs font-bold text-emerald-400 border border-emerald-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>{accounts.filter(a => a.status !== 'offline').length} Online Bots</span>
          </div>
          <div className="glass-panel px-4 py-2 flex items-center gap-2 text-xs font-bold text-slate-300 border border-slate-800">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>WebSocket Live Sync</span>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      {accounts.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Account Selector (4 Cols) */}
          <div className="lg:col-span-4 glass-panel p-5 space-y-4 border border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-gold" /> Active Fleet Characters ({accounts.length})
            </h2>

            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {accounts.map((acc) => {
                const isSelected = acc._id === selectedAccountId;
                const isOnline = acc.status !== 'offline';
                return (
                  <button
                    key={acc._id}
                    onClick={() => setSelectedAccountId(acc._id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-900 border-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                        : 'bg-slate-950/60 border-slate-900 hover:border-slate-800 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-700'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{acc.robloxUsername}</p>
                        <p className="text-xs text-slate-400 font-medium">Lv. {acc.level} • Sea {acc.sea}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        46ms
                      </span>
                      <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isSelected ? 'rotate-90 text-gold' : ''}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Equipment Dashboard Display (8 Cols) */}
          {selectedAccount && (
            <div className="lg:col-span-8 space-y-6">
              
              {/* Character Header Banner */}
              <div className="glass-panel p-6 border-l-4 border-l-gold relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-black text-white">{selectedAccount.robloxUsername}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold capitalize ${
                        selectedAccount.status === 'offline' ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {selectedAccount.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                      <span><strong className="text-white">Level:</strong> {selectedAccount.level} / 2800</span>
                      <span>•</span>
                      <span><strong className="text-white">Sea:</strong> Sea {selectedAccount.sea}</span>
                      <span>•</span>
                      <span><strong className="text-white">Location:</strong> {selectedAccount.location}</span>
                      <span>•</span>
                      <span><strong className="text-white">Runtime:</strong> {formatPlaytime(selectedAccount.playtime)}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ping & Connection</p>
                    <p className="text-lg font-black text-emerald-400 font-mono">46 ms <span className="text-xs text-slate-400 font-normal">Just now</span></p>
                  </div>
                </div>
              </div>

              {/* 4-Card Equipment Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 🟥 Melee */}
                <EquipmentCard
                  title="Melee (Võ)"
                  category="melee"
                  value={selectedAccount.equipped?.fightingStyle || 'Combat'}
                  icon={<Zap className="w-4 h-4 text-red-400" />}
                  accentColor="bg-red-500"
                  borderColor="border-red-500/30"
                  isUpdated={changedFields.melee}
                />

                {/* 🟦 Sword */}
                <EquipmentCard
                  title="Sword (Kiếm)"
                  category="swords"
                  value={selectedAccount.equipped?.sword || 'None'}
                  icon={<Swords className="w-4 h-4 text-sky-400" />}
                  accentColor="bg-sky-500"
                  borderColor="border-sky-500/30"
                  isUpdated={changedFields.sword}
                />

                {/* 🟨 Gun */}
                <EquipmentCard
                  title="Gun (Súng)"
                  category="guns"
                  value={selectedAccount.equipped?.gun || 'None'}
                  icon={<Target className="w-4 h-4 text-amber-400" />}
                  accentColor="bg-amber-500"
                  borderColor="border-amber-500/30"
                  isUpdated={changedFields.gun}
                />

                {/* 🟪 Accessory */}
                <EquipmentCard
                  title="Accessory (Phụ Kiện)"
                  category="accessories"
                  value={
                    selectedAccount.equipped?.accessory && selectedAccount.equipped.accessory !== 'None'
                      ? selectedAccount.equipped.accessory
                      : 'None'
                  }
                  icon={<Sparkles className="w-4 h-4 text-purple-400" />}
                  accentColor="bg-purple-500"
                  borderColor="border-purple-500/30"
                  isUpdated={changedFields.accessory}
                />
              </div>

              {/* Inventory Equipped Status Checklist */}
              <div className="glass-panel p-6 space-y-4 border border-slate-800">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Inventory Equipped Checklist
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-900 space-y-1">
                    <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                      ✓ Melee
                    </p>
                    <p className="text-white font-extrabold text-sm pl-4 truncate">
                      {selectedAccount.equipped?.fightingStyle || 'Combat'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-900 space-y-1">
                    <p className="text-sky-400 font-bold flex items-center gap-1.5">
                      ✓ Sword
                    </p>
                    <p className="text-white font-extrabold text-sm pl-4 truncate">
                      {selectedAccount.equipped?.sword || 'None'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-900 space-y-1">
                    <p className="text-amber-400 font-bold flex items-center gap-1.5">
                      ✓ Gun
                    </p>
                    <p className="text-white font-extrabold text-sm pl-4 truncate">
                      {selectedAccount.equipped?.gun || 'None'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-900 space-y-1">
                    <p className="text-purple-400 font-bold flex items-center gap-1.5">
                      ✓ Accessories
                    </p>
                    <div className="pl-4 space-y-0.5">
                      <p className="text-white font-bold">{selectedAccount.equipped?.accessory || 'None'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipment Change History Timeline */}
              <div className="glass-panel p-6 space-y-4 border border-slate-800">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <History className="w-4 h-4 text-gold" /> Equipment Change History
                </h3>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-xs text-slate-300 space-y-2 max-h-[200px] overflow-y-auto">
                  {equipmentHistory.length > 0 ? (
                    equipmentHistory.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-1 border-b border-slate-900/60 last:border-0">
                        <span className="text-slate-500 font-semibold">{item.timestamp}</span>
                        <span className="text-gold font-bold">{item.username}:</span>
                        <span className="text-cyan-300">{item.message}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-600 italic">No equipment changes recorded in this session yet.</p>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      ) : (
        <div className="py-20 px-6 glass-panel border border-slate-800 text-center flex flex-col items-center justify-center gap-3">
          <ShieldAlert className="w-12 h-12 text-slate-600" />
          <p className="text-slate-400 font-bold">No Active Characters Detected</p>
          <p className="text-slate-500 text-xs max-w-md">
            Execute the Blox Fruits sender.lua client script to stream live character equipment to the dashboard.
          </p>
        </div>
      )}
    </div>
  );
};
