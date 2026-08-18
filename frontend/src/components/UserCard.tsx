import React, { useState } from 'react';
import { Shield, Calendar, Clock, LogIn, Key, Copy, Check, Edit2, Save, X } from 'lucide-react';

export interface UserIdentityData {
  id?: string;
  username: string;
  email?: string;
  avatar?: string | null;
  discriminator?: string;
  nickname?: string;
  userCode?: string;
  role?: string;
  joinDate?: string | Date;
  lastLogin?: string | Date;
  loginCount?: number;
  discordId?: string;
}

interface UserCardProps {
  user: UserIdentityData;
  onUpdateNickname?: (newNickname: string) => Promise<boolean>;
  compact?: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onUpdateNickname }) => {
  const [copied, setCopied] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(user.nickname || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const copyCode = () => {
    if (user.userCode) {
      navigator.clipboard.writeText(user.userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveNickname = async () => {
    if (!newNickname.trim() || newNickname.trim() === user.nickname) {
      setIsEditingNickname(false);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      if (onUpdateNickname) {
        const success = await onUpdateNickname(newNickname.trim());
        if (success) {
          setIsEditingNickname(false);
        } else {
          setErrorMsg('Cập nhật thất bại. Vui lòng thử lại.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi cập nhật biệt danh');
    } finally {
      setLoading(false);
    }
  };

  // Role style mapping
  const getRoleBadge = (roleName?: string) => {
    const r = (roleName || 'Member').toLowerCase();
    switch (r) {
      case 'owner':
        return { label: '👑 Owner', color: 'from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10' };
      case 'admin':
        return { label: '🟣 Admin', color: 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/10' };
      case 'moderator':
        return { label: '🛡️ Moderator', color: 'from-blue-500/20 to-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/10' };
      case 'developer':
        return { label: '🚀 Developer', color: 'from-pink-500/20 to-rose-500/20 text-pink-300 border-pink-500/40 shadow-pink-500/10' };
      case 'premium':
        return { label: '💎 Premium', color: 'from-sky-500/20 to-emerald-500/20 text-sky-300 border-sky-500/40 shadow-sky-500/10' };
      case 'vip':
        return { label: '⚡ VIP', color: 'from-orange-500/20 to-amber-500/20 text-orange-300 border-orange-500/40 shadow-orange-500/10' };
      case 'member':
      default:
        return { label: '🟢 Member', color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10' };
    }
  };

  const roleInfo = getRoleBadge(user.role);

  const formatDate = (dateVal?: string | Date, includeTime = false) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    if (!includeTime) return `${day}/${month}/${year}`;
    
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  return (
    <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 border border-slate-800/80 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-cyan-500/30 hover:shadow-cyan-500/10">
      {/* Decorative ambient background glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-500 pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500 pointer-events-none" />

      <div className="relative p-6 flex flex-col items-center text-center">
        {/* Avatar Section */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 shadow-lg shadow-cyan-500/20">
            <img
              src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
              alt={user.username}
              className="w-full h-full rounded-full object-cover bg-slate-950"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
              }}
            />
          </div>
          <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-md animate-pulse" title="Online" />
        </div>

        {/* Username & Discriminator */}
        <h3 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
          {user.username}
          {user.discriminator && user.discriminator !== '0' && (
            <span className="text-xs font-normal text-slate-400">#{user.discriminator}</span>
          )}
        </h3>

        {/* Nickname Section */}
        <div className="mt-1 mb-4 flex items-center justify-center gap-2">
          {isEditingNickname ? (
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-cyan-500/40">
              <input
                type="text"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                className="bg-transparent text-sm text-cyan-300 focus:outline-none w-32 text-center"
                maxLength={20}
                placeholder="Biệt danh"
                autoFocus
              />
              <button
                onClick={handleSaveNickname}
                disabled={loading}
                className="text-emerald-400 hover:text-emerald-300 p-0.5"
                title="Lưu"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setIsEditingNickname(false); setNewNickname(user.nickname || ''); }}
                className="text-rose-400 hover:text-rose-300 p-0.5"
                title="Hủy"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="group/nick flex items-center gap-1.5">
              <span className="text-sm font-medium text-cyan-400/90 bg-cyan-950/40 px-3 py-0.5 rounded-full border border-cyan-800/40">
                {user.nickname || 'Chưa đặt biệt danh'}
              </span>
              {onUpdateNickname && (
                <button
                  onClick={() => setIsEditingNickname(true)}
                  className="opacity-0 group-hover/nick:opacity-100 transition-opacity text-slate-400 hover:text-cyan-300"
                  title="Đổi biệt danh"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
        {errorMsg && <p className="text-xs text-rose-400 mb-2">{errorMsg}</p>}

        {/* User Identity Details Card Container */}
        <div className="w-full bg-slate-950/60 rounded-xl p-4 border border-slate-800/60 divide-y divide-slate-800/60 text-left space-y-3">
          
          {/* User Code */}
          <div className="pt-1 pb-1 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>User Code</span>
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 font-mono text-xs font-semibold text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/50 px-2.5 py-1 rounded-lg transition-colors"
              title="Click để sao chép"
            >
              <span>{user.userCode || 'USR-0000-0000'}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
            </button>
          </div>

          {/* Role */}
          <div className="pt-2.5 pb-1 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Role</span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-gradient-to-r ${roleInfo.color} shadow-sm`}>
              {roleInfo.label}
            </span>
          </div>

          {/* Join Date */}
          <div className="pt-2.5 pb-1 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Join Date</span>
            </div>
            <span className="text-xs font-medium text-slate-300">
              {formatDate(user.joinDate)}
            </span>
          </div>

          {/* Last Login */}
          <div className="pt-2.5 pb-1 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Last Login</span>
            </div>
            <span className="text-xs font-medium text-slate-300">
              {formatDate(user.lastLogin, true)}
            </span>
          </div>

          {/* Login Count */}
          <div className="pt-2.5 pb-1 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Login Count</span>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md">
              {user.loginCount || 1}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
