import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useApp } from '../store';
import { Layers, Search, Trash2, Eye, X, Coins, Gem, Clock, Compass, Activity, FileText, Copy, Check, Cpu, Zap, Filter, Sparkles, Trophy, Flame, AlertTriangle, Scissors, ChevronLeft, ChevronRight } from 'lucide-react';
import { csharpWasm } from '../services/csharpWasmService';

import { ItemImage } from '../components/ItemImage';

interface AccountRowProps {
  acc: any;
  copiedAccountId: string | null;
  onOpenDetails: (acc: any) => void;
  onCopyUsername: (e: React.MouseEvent, username: string, id: string) => void;
  onPromptDelete: (id: string, e: React.MouseEvent) => void;
}

const AccountRow: React.FC<AccountRowProps> = React.memo(({
  acc,
  copiedAccountId,
  onOpenDetails,
  onCopyUsername,
  onPromptDelete,
}) => {
  const smart = csharpWasm.smartClassifyAccount(acc);
  const isGodTier = smart.tier.includes('God Tier');
  const isPvpReady = smart.tier.includes('PvP Ready');

  const formatBeli = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <tr
      onClick={() => onOpenDetails(acc)}
      className="hover:bg-slate-900/30 transition-colors cursor-pointer group virtual-table-row"
    >
      <td className="py-3.5 font-bold text-white group-hover:text-gold transition-colors">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span>{acc.robloxUsername}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
              isGodTier
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : isPvpReady
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700/60'
            }`}>
              {isGodTier && <Trophy className="w-2.5 h-2.5 text-amber-400" />}
              {smart.tier.split(' ')[0]} {smart.tier.split(' ')[1]}
            </span>
            <button
              onClick={(e) => onCopyUsername(e, acc.robloxUsername, acc._id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Copy Username"
            >
              {copiedAccountId === acc._id ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
            {acc.notes && (
              <span title={acc.notes} className="inline-flex items-center text-ocean-cyan hover:text-white cursor-help" onClick={(e) => e.stopPropagation()}>
                <FileText className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            {acc.activeHub && acc.activeHub !== 'None' && acc.activeHub !== 'None / Custom Script' && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                acc.activeHub.includes('Banana')
                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                  : acc.activeHub.includes('Maru')
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {acc.activeHub.includes('Banana') ? '🍌' : acc.activeHub.includes('Maru') ? '⚡' : '🚀'} {acc.activeHub}
              </span>
            )}

            {acc.sameHwid && (
              <span
                title={`Thiết bị HWID trùng với: ${(acc.sameHwidAccounts || []).join(', ')}`}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 cursor-help"
              >
                📱 Same HWID {acc.sameHwidCount && acc.sameHwidCount > 1 ? `(${acc.sameHwidCount})` : ''}
              </span>
            )}

            {smart.tags.filter((t: string) => t !== 'Same HWID' && t !== acc.activeHub).slice(0, 2).map((tag: string) => (
              <span key={tag} className="text-[9px] font-semibold text-slate-400 bg-slate-950/60 border border-slate-800/80 px-1.5 py-0.2 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </td>
      <td className="py-3.5 text-slate-300 font-semibold">{acc.level}</td>
      <td className="py-3.5 text-emerald-400 font-mono">{formatBeli(acc.beli)}</td>
      <td className="py-3.5 text-purple-400 font-mono">{formatBeli(acc.fragments)}</td>
      <td className="py-3.5 text-slate-400">{acc.race}</td>
      <td className="py-3.5 text-cyan-300">Sea {acc.sea}</td>
      <td className="py-3.5 text-slate-300">
        <span className="font-semibold text-sky-400">{acc.equipped?.fruit || 'None'}</span>
      </td>
      <td className="py-3.5">
        <div className="flex flex-col gap-1">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold capitalize ${
            acc.status === 'offline'
              ? 'bg-slate-800 text-slate-500'
              : acc.status === 'grinding'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-gold/10 text-gold shadow-gold-border'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              acc.status === 'offline' ? 'bg-slate-500' : 'bg-emerald-500 animate-pulse'
            }`} />
            {acc.status}
          </span>
        </div>
      </td>
      <td className="py-3.5 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(acc);
            }}
            className="p-2 rounded-lg bg-ocean-cyan/10 hover:bg-ocean-cyan/20 border border-ocean-cyan/30 text-ocean-cyan hover:text-white transition cursor-pointer"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => onPromptDelete(acc._id, e)}
            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-white transition cursor-pointer"
            title="Delete Record"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});
AccountRow.displayName = 'AccountRow';

export const AccountList: React.FC = () => {
  const { accounts, fetchAccounts, selectedAccountDetails, fetchAccountDetails, deleteAccount, updateAccountNotes } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSea, setSelectedSea] = useState<number>(0);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [minLevelFilter, setMinLevelFilter] = useState<number>(0);
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedSmartTag, setSelectedSmartTag] = useState<string>('all');
  const [godItemOnly, setGodItemOnly] = useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'equipped' | 'inventory' | 'sessions' | 'logs'>('equipped');

  // Notes state
  const [notesInput, setNotesInput] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);

  // Modal fast-render state
  const [modalTargetAccount, setModalTargetAccount] = useState<Account | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  // Toast & Modal States for UI Feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalTargetAccount(null);
    setActiveAccountId(null);
  };

  const handleOpenDetails = (accOrId: Account | string) => {
    let target: Account | undefined;
    let accountId: string;
    if (typeof accOrId === 'string') {
      accountId = accOrId;
      target = accounts.find((a) => (a._id || (a as any).id) === accountId);
    } else {
      target = accOrId;
      accountId = accOrId._id || (accOrId as any).id;
    }

    if (target) {
      setModalTargetAccount(target);
    }
    setActiveTab('equipped');
    setShowModal(true);

    if (accountId) {
      setModalLoading(true);
      fetchAccountDetails(accountId)
        .catch((err) => console.error('fetchAccountDetails error:', err))
        .finally(() => setModalLoading(false));
    }
  };

  const modalAccount = (selectedAccountDetails?.account &&
    (selectedAccountDetails.account._id === (modalTargetAccount?._id || (modalTargetAccount as any)?.id) ||
     selectedAccountDetails.account.robloxUsername === modalTargetAccount?.robloxUsername))
    ? selectedAccountDetails.account
    : modalTargetAccount;

  const modalInventory = selectedAccountDetails?.inventory || {
    fruits: [],
    weapons: [],
    guns: [],
    styles: [],
    materials: [],
    accessories: []
  };

  const modalLogs = selectedAccountDetails?.logs || [];

  const handleSaveNotes = async () => {
    if (!modalAccount) return;
    setSavingNotes(true);
    const accountId = modalAccount._id || (modalAccount as any).id;
    const success = await updateAccountNotes(accountId, notesInput);
    if (success) {
      showToast('Đã lưu ghi chú thành công!', 'success');
      if (modalTargetAccount) {
        setModalTargetAccount({ ...modalTargetAccount, notes: notesInput });
      }
    } else {
      showToast('Không thể lưu ghi chú. Vui lòng thử lại!', 'error');
    }
    setSavingNotes(false);
  };

  const promptDeleteAccount = (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingAccountId(accountId);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Sync notes input only when opening details for a different account
  useEffect(() => {
    if (modalAccount) {
      const accId = modalAccount._id || (modalAccount as any).id;
      if (accId !== activeAccountId) {
        setNotesInput(modalAccount.notes || '');
        setActiveAccountId(accId);
      }
    } else {
      setNotesInput('');
      setActiveAccountId(null);
    }
  }, [modalAccount, activeAccountId]);

  // Prevent background scroll and allow Escape key to close modals
  useEffect(() => {
    if (showModal || deletingAccountId) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleCloseModal();
          setDeletingAccountId(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showModal, deletingAccountId]);

  const confirmDeleteAccount = async () => {
    if (deletingAccountId) {
      await deleteAccount(deletingAccountId);
      setDeletingAccountId(null);
      showToast('Đã xóa tài khoản thành công!', 'success');
    }
  };

  const [filterDuration, setFilterDuration] = useState<string>('< 0.05');

  const filteredAccounts = useMemo(() => {
    const t0 = performance.now();
    const result = csharpWasm.fastFilterAccounts(accounts, {
      query: searchTerm,
      sea: selectedSea,
      status: selectedStatus === 'all' ? '' : selectedStatus,
      minLevel: minLevelFilter,
      tier: selectedTier === 'all' ? '' : selectedTier,
      tag: selectedSmartTag === 'all' ? '' : selectedSmartTag,
      hasGodItem: godItemOnly,
    });
    const t1 = performance.now();
    setFilterDuration((t1 - t0).toFixed(2));
    return result;
  }, [accounts, searchTerm, selectedSea, selectedStatus, minLevelFilter, selectedTier, selectedSmartTag, godItemOnly]);

  // ── High-Performance Client Pagination ──
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSea, selectedStatus, minLevelFilter, selectedTier, selectedSmartTag, godItemOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedAccounts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, safeCurrentPage, pageSize]);

  const handleCopyUsername = useCallback(async (e: React.MouseEvent, username: string, id: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(username);
    setCopiedAccountId(id);
    showToast('Đã copy tên tài khoản!');
    setTimeout(() => setCopiedAccountId(null), 1500);
  }, []);

  const formatBeli = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPlaytime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header, Search & C# Wasm Filter Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white glow-text-cyan flex items-center gap-2">
              <Layers className="w-8 h-8 text-gold" /> ACCOUNT MANAGEMENT
            </h1>
            <p className="text-slate-400 text-sm mt-1">Quản lý và giám sát thời gian thực danh sách tài khoản (C# LINQ Smart Filtering)</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              to="/dashboard/cookie-splitter"
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-all shrink-0 shadow-lg shadow-cyan-500/10"
            >
              <Scissors className="w-4 h-4 text-cyan-400" />
              <span>Tách Cookie</span>
            </Link>

            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm: tên, trái, võ, kiếm..."
                className="w-full bg-ocean-deep/60 border border-slate-800 focus:border-ocean-cyan focus:ring-1 focus:ring-ocean-cyan rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* C# Wasm Smart Multi-Filter Bar */}
        <div className="flex flex-col gap-3 p-3.5 bg-slate-900/70 border border-slate-800/80 rounded-2xl backdrop-blur-md">
          {/* Row 1: Basic Filters & Performance */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mr-1">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span>Lọc C# LINQ:</span>
              </span>

              {/* Sea Filters */}
              <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                {[
                  { label: 'Tất cả Sea', val: 0 },
                  { label: 'Sea 1', val: 1 },
                  { label: 'Sea 2', val: 2 },
                  { label: 'Sea 3', val: 3 },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setSelectedSea(item.val)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      selectedSea === item.val
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                {[
                  { label: 'Tất cả', val: 'all' },
                  { label: 'Online 🟢', val: 'online' },
                  { label: 'Grinding ⚔️', val: 'grinding' },
                  { label: 'Offline ⚪', val: 'offline' },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setSelectedStatus(item.val)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      selectedStatus === item.val
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Max Level Filter */}
              <button
                onClick={() => setMinLevelFilter(minLevelFilter === 2550 ? 0 : 2550)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  minLevelFilter === 2550
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Max Lv (2550+)</span>
              </button>
            </div>

            {/* Performance Badge */}
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 bg-cyan-950/40 px-3 py-1.5 rounded-xl border border-cyan-500/30">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>C# Wasm: <b>{filterDuration}ms</b> ({filteredAccounts.length}/{accounts.length} accs)</span>
            </div>
          </div>

          {/* Row 2: AI Smart Classifier & Tier Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Phân loại thông minh:</span>
            </span>

            {/* Tier Filters */}
            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              {[
                { label: 'Tất cả Tier', val: 'all' },
                { label: 'Tier S+ (God)', val: 'Tier S+' },
                { label: 'Tier A (PvP)', val: 'Tier A' },
                { label: 'Tier B (Mid)', val: 'Tier B' },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => setSelectedTier(item.val)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedTier === item.val
                      ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Smart Behavior Tags */}
            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              {[
                { label: 'Tất cả Tag', val: 'all', icon: null },
                { label: 'Banana Hub 🍌', val: 'Banana Hub', icon: null },
                { label: 'Maru Hub ⚡', val: 'Maru Hub', icon: null },
                { label: 'Same HWID 📱', val: 'Same HWID', icon: null },
                { label: 'Boss Hunter', val: 'Boss Hunting', icon: Flame },
                { label: 'AFK Alert', val: 'AFK', icon: AlertTriangle },
                { label: 'Mythical Fruit', val: 'Mythical Fruit', icon: Sparkles },
              ].map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.val}
                    onClick={() => setSelectedSmartTag(item.val)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      selectedSmartTag === item.val
                        ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {IconComponent && <IconComponent className="w-3 h-3" />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* God Items (CDK/TTK/Godhuman) Toggle */}
            <button
              onClick={() => setGodItemOnly(!godItemOnly)}
              className={`px-3 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                godItemOnly
                  ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border-amber-400/50 shadow-md'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>God Items (CDK/Godhuman)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Cards for Mobile & Table for Desktop */}
      <div className="glass-panel p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-4">Roblox User</th>
                <th className="pb-4">Level</th>
                <th className="pb-4 text-emerald-400">Beli</th>
                <th className="pb-4 text-purple-400">Fragments</th>
                <th className="pb-4">Race</th>
                <th className="pb-4">Current Sea</th>
                <th className="pb-4">Equipped Fruit</th>
                <th className="pb-4">Status</th>
                <th className="pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {paginatedAccounts.map((acc) => (
                <AccountRow
                  key={acc._id || (acc as any).id}
                  acc={acc}
                  copiedAccountId={copiedAccountId}
                  onOpenDetails={handleOpenDetails}
                  onCopyUsername={handleCopyUsername}
                  onPromptDelete={promptDeleteAccount}
                />
              ))}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-sm">
                    Không tìm thấy tài khoản nào khớp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* High-Performance Pagination Toolbar */}
        {filteredAccounts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>
                Hiển thị <b className="text-white">{(safeCurrentPage - 1) * pageSize + 1}</b> -{' '}
                <b className="text-white">{Math.min(safeCurrentPage * pageSize, filteredAccounts.length)}</b> trên{' '}
                <b className="text-cyan-400">{filteredAccounts.length}</b> tài khoản
              </span>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span>Mỗi trang:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Page Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                  .reduce((acc: (number | string)[], p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`dots-${idx}`} className="px-1.5 text-xs text-slate-600 select-none">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = p === safeCurrentPage;
                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(Number(p))}
                        className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isCurrent
                            ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                            : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account Details Modal */}
      {showModal && modalAccount && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative rounded-2xl border border-cyan-500/30 bg-[#0b1329] shadow-2xl shadow-black/80 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
              <div className="flex items-center gap-3">
                <Compass className="w-6 h-6 text-gold animate-pulse flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {modalAccount.robloxUsername}
                    </h3>
                    {modalLoading && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        Đang đồng bộ...
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Level {modalAccount.level} &bull; {modalAccount.race} &bull; Sea {modalAccount.sea}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-850 bg-slate-950/40 px-6">
              {(['equipped', 'inventory', 'logs'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-gold text-gold font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'equipped' ? 'Equipped Gear' : tab === 'inventory' ? `Inventory (${(modalInventory.fruits?.length || 0) + (modalInventory.weapons?.length || 0) + (modalInventory.guns?.length || 0)})` : tab}
                </button>
              ))}
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: EQUIPPED GEAR */}
              {activeTab === 'equipped' && (
                <div className="space-y-6">
                  {/* Basic Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-ocean-abyss p-4 rounded-xl border border-slate-900">
                      <span className="text-slate-500 text-xs block font-semibold">Beli</span>
                      <span className="text-lg font-bold text-emerald-400 flex items-center gap-1 mt-1">
                        <Coins className="w-4 h-4" /> {formatBeli(modalAccount.beli || 0)}
                      </span>
                    </div>
                    <div className="bg-ocean-abyss p-4 rounded-xl border border-slate-900">
                      <span className="text-slate-500 text-xs block font-semibold">Fragments</span>
                      <span className="text-lg font-bold text-purple-400 flex items-center gap-1 mt-1">
                        <Gem className="w-4 h-4" /> {formatBeli(modalAccount.fragments || 0)}
                      </span>
                    </div>
                    <div className="bg-ocean-abyss p-4 rounded-xl border border-slate-900">
                      <span className="text-slate-500 text-xs block font-semibold">Farming Map</span>
                      <span className="text-sm font-bold text-sky-400 truncate block mt-1">{modalAccount.location || 'Unknown'}</span>
                    </div>
                    <div className="bg-ocean-abyss p-4 rounded-xl border border-slate-900">
                      <span className="text-slate-500 text-xs block font-semibold">Farming Time</span>
                      <span className="text-sm font-bold text-slate-300 flex items-center gap-1 mt-1">
                        <Clock className="w-4 h-4" /> {formatPlaytime(modalAccount.playtime || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Device, HWID & Script Hub Information Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider block">Auto-Farm Script Hub</span>
                      <span className="text-sm font-bold text-yellow-400 flex items-center gap-1.5 mt-1">
                        {modalAccount.activeHub?.includes('Banana') ? '🍌' : modalAccount.activeHub?.includes('Maru') ? '⚡' : '🚀'} {modalAccount.activeHub || 'None / Custom Script'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider block">Thiết Bị / HWID / Android ID</span>
                      <span className="text-xs font-mono text-cyan-300 block truncate mt-1" title={modalAccount.hwid || modalAccount.deviceId || modalAccount.device || 'N/A'}>
                        {modalAccount.hwid || modalAccount.deviceId || modalAccount.device || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider block">Trạng Thái Same HWID</span>
                      {modalAccount.sameHwid ? (
                        <div className="mt-1">
                          <span className="text-xs font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/40 inline-block">
                            📱 Trùng HWID ({modalAccount.sameHwidCount || 1} tài khoản)
                          </span>
                          {Array.isArray(modalAccount.sameHwidAccounts) && modalAccount.sameHwidAccounts.length > 0 && (
                            <p className="text-[11px] text-slate-400 mt-1 truncate">
                              Chung máy: {modalAccount.sameHwidAccounts.filter((u: string) => u !== modalAccount.robloxUsername).join(', ') || 'Chính nó'}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500 block mt-1">
                          Thiết bị độc lập (Unique Device)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Account Notes */}
                  <div className="bg-ocean-deep/60 p-4 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-slate-400 text-xs uppercase font-extrabold tracking-wider block">
                      Ghi chú tài khoản / Account Notes
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        value={notesInput}
                        onChange={(e) => setNotesInput(e.target.value)}
                        placeholder="Thêm ghi chú cho tài khoản này... / Add a note for this account..."
                        className="flex-1 bg-ocean-abyss border border-slate-850 focus:border-ocean-cyan focus:ring-1 focus:ring-ocean-cyan rounded-lg p-2 text-white text-xs outline-none transition resize-none h-16"
                      />
                      <button
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="px-4 py-2 bg-ocean-cyan/25 border border-ocean-cyan/40 hover:bg-ocean-cyan/40 text-ocean-cyan hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center self-end disabled:opacity-50 h-10 cursor-pointer"
                      >
                        {savingNotes ? 'Saving...' : 'Lưu / Save'}
                      </button>
                    </div>
                  </div>

                  {/* Equipped Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* Equipped Fruit */}
                    <div className="bg-ocean-deep p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center">
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Equipped Fruit</span>
                      <div className="w-20 h-20 bg-ocean-abyss rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden font-bold text-2xl text-gold relative">
                        <ItemImage
                          category="fruits"
                          name={modalAccount.equipped?.fruit || 'None'}
                          fallbackEmoji="🍇"
                          emojiClass="text-2xl"
                          imgClass="w-16 h-16 object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold text-white mt-3 block truncate max-w-full">
                        {modalAccount.equipped?.fruit || 'None'}
                      </span>
                      <span className="text-slate-500 text-xs mt-1 block">Mastery: {modalAccount.equipped?.fruitMastery ?? 0}</span>
                    </div>

                    {/* Equipped Sword */}
                    <div className="bg-ocean-deep p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center">
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Equipped Sword</span>
                      <div className="w-20 h-20 bg-ocean-abyss rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
                        <ItemImage
                          category="swords"
                          name={modalAccount.equipped?.sword || 'None'}
                          fallbackEmoji="⚔️"
                          emojiClass="text-2xl text-slate-600"
                          imgClass="w-16 h-16 object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold text-white mt-3 block truncate max-w-full">
                        {modalAccount.equipped?.sword || 'None'}
                      </span>
                    </div>

                    {/* Equipped Gun */}
                    <div className="bg-ocean-deep p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center">
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Equipped Gun</span>
                      <div className="w-20 h-20 bg-ocean-abyss rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
                        <ItemImage
                          category="guns"
                          name={modalAccount.equipped?.gun || 'None'}
                          fallbackEmoji="🔫"
                          emojiClass="text-2xl text-slate-600"
                          imgClass="w-16 h-16 object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold text-white mt-3 block truncate max-w-full">
                        {modalAccount.equipped?.gun || 'None'}
                      </span>
                    </div>

                    {/* Equipped Fighting Style */}
                    <div className="bg-ocean-deep p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center">
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Fighting Style</span>
                      <div className="w-20 h-20 bg-ocean-abyss rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
                        <ItemImage
                          category="styles"
                          name={modalAccount.equipped?.fightingStyle || 'Combat'}
                          fallbackEmoji="👊"
                          emojiClass="text-2xl text-slate-600"
                          imgClass="w-16 h-16 object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold text-white mt-3 block truncate max-w-full">
                        {modalAccount.equipped?.fightingStyle || 'Combat'}
                      </span>
                    </div>

                    {/* Equipped Accessory */}
                    <div className="bg-ocean-deep p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center">
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Equipped Accessory</span>
                      <div className="w-20 h-20 bg-ocean-abyss rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
                        <ItemImage
                          category="accessories"
                          name={modalAccount.equipped?.accessory || 'None'}
                          fallbackEmoji="👑"
                          emojiClass="text-2xl text-slate-600"
                          imgClass="w-16 h-16 object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold text-white mt-3 block truncate max-w-full">
                        {modalAccount.equipped?.accessory || 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Farming Map Section (For Sea 3) */}
                  {(modalAccount.sea === 3 || 
                    (modalAccount.location && modalAccount.location.toLowerCase().includes('sea 3'))) && (
                    <div className="bg-ocean-deep/60 p-4 rounded-xl border border-slate-800 mt-6">
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider block mb-3">Sea 3 Farming Map</span>
                      <div className="relative rounded-lg overflow-hidden border border-slate-700/50">
                        <img 
                          src="/map_sea_3.jpg" 
                          alt="Sea 3 Map" 
                          className="w-full h-auto max-h-[320px] object-cover"
                        />
                        <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800 text-[10px] text-white font-bold">
                          Current Location: {modalAccount.location || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INVENTORY */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  {modalLoading && (modalInventory.fruits || []).length === 0 && (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <div className="w-6 h-6 border-2 border-ocean-cyan border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Đang đồng bộ chi tiết kho đồ từ máy chủ...</span>
                    </div>
                  )}

                  {/* Category lists inside inventory */}
                  <div className="space-y-4">
                    {/* 1. Stored Fruits */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                        Devil Fruits ({modalInventory.fruits?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(modalInventory.fruits || []).map((fruit, idx) => (
                          <div key={idx} className="bg-ocean-deep p-3 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className="w-10 h-10 bg-ocean-abyss rounded flex items-center justify-center overflow-hidden">
                              <ItemImage
                                category="fruits"
                                name={fruit}
                                fallbackEmoji="🍓"
                                emojiClass="text-base text-slate-500"
                                imgClass="w-8 h-8 object-contain"
                              />
                            </div>
                            <span className="text-xs font-bold text-white mt-2 block truncate max-w-full">{fruit}</span>
                          </div>
                        ))}
                        {(modalInventory.fruits || []).length === 0 && !modalLoading && (
                          <span className="text-xs text-slate-600 italic">No fruits stored in inventory.</span>
                        )}
                      </div>
                    </div>

                    {/* 2. Swords */}
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                        Swords ({modalInventory.weapons?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(modalInventory.weapons || []).map((sword, idx) => (
                          <div key={idx} className="bg-ocean-deep p-3 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 bg-ocean-abyss rounded flex items-center justify-center overflow-hidden">
                              <ItemImage
                                category="swords"
                                name={sword}
                                fallbackEmoji="⚔️"
                                emojiClass="text-base text-slate-500"
                                imgClass="w-8 h-8 object-contain"
                              />
                            </div>
                            <span className="text-xs font-bold text-white mt-2 block truncate max-w-full">{sword}</span>
                          </div>
                        ))}
                        {(modalInventory.weapons || []).length === 0 && !modalLoading && (
                          <span className="text-xs text-slate-600 italic">No swords stored.</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Guns */}
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                        Guns ({modalInventory.guns?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(modalInventory.guns || []).map((gun, idx) => (
                          <div key={idx} className="bg-ocean-deep p-3 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 bg-ocean-abyss rounded flex items-center justify-center overflow-hidden">
                              <ItemImage
                                category="guns"
                                name={gun}
                                fallbackEmoji="🔫"
                                emojiClass="text-base text-slate-500"
                                imgClass="w-8 h-8 object-contain"
                              />
                            </div>
                            <span className="text-xs font-bold text-white mt-2 block truncate max-w-full">{gun}</span>
                          </div>
                        ))}
                        {(modalInventory.guns || []).length === 0 && !modalLoading && (
                          <span className="text-xs text-slate-600 italic">No guns stored.</span>
                        )}
                      </div>
                    </div>

                    {/* 4. Fighting Styles */}
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                        Fighting Styles ({modalInventory.styles?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(modalInventory.styles || []).map((style, idx) => (
                          <div key={idx} className="bg-ocean-deep p-3 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 bg-ocean-abyss rounded flex items-center justify-center overflow-hidden">
                              <ItemImage
                                category="styles"
                                name={style}
                                fallbackEmoji="👊"
                                emojiClass="text-base text-slate-500"
                                imgClass="w-8 h-8 object-contain"
                              />
                            </div>
                            <span className="text-xs font-bold text-white mt-2 block truncate max-w-full">{style}</span>
                          </div>
                        ))}
                        {(modalInventory.styles || []).length === 0 && !modalLoading && (
                          <span className="text-xs text-slate-600 italic">No fighting styles stored.</span>
                        )}
                      </div>
                    </div>

                    {/* 5. Accessories */}
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                        Accessories ({modalInventory.accessories?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(modalInventory.accessories || []).map((accItem, idx) => (
                          <div key={idx} className="bg-ocean-deep p-3 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 bg-ocean-abyss rounded flex items-center justify-center overflow-hidden">
                              <ItemImage
                                category="accessories"
                                name={accItem}
                                fallbackEmoji="👑"
                                emojiClass="text-base text-slate-500"
                                imgClass="w-8 h-8 object-contain"
                              />
                            </div>
                            <span className="text-xs font-bold text-white mt-2 block truncate max-w-full">{accItem}</span>
                          </div>
                        ))}
                        {(modalInventory.accessories || []).length === 0 && !modalLoading && (
                          <span className="text-xs text-slate-600 italic">No accessories.</span>
                        )}
                      </div>
                    </div>

                    {/* 6. Materials */}
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                        Materials ({modalInventory.materials?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(modalInventory.materials || []).map((mat, idx) => (
                          <div key={idx} className="bg-ocean-deep p-3 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className="w-10 h-10 bg-ocean-abyss rounded flex items-center justify-center overflow-hidden">
                              <ItemImage
                                category="materials"
                                name={mat.name}
                                fallbackEmoji="📦"
                                emojiClass="text-base text-slate-500"
                                imgClass="w-8 h-8 object-contain"
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-300 mt-2 block truncate max-w-full">{mat.name}</span>
                            <span className="absolute top-1 right-1 text-[10px] font-extrabold bg-gold/10 border border-gold/30 text-gold px-1.5 py-0.5 rounded">
                              x{mat.quantity}
                            </span>
                          </div>
                        ))}
                        {(modalInventory.materials || []).length === 0 && !modalLoading && (
                          <span className="text-xs text-slate-600 italic">No materials stored.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LOGS */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                    Farming Logs
                  </h4>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {(modalLogs || []).map((log) => (
                      <div key={log._id || Math.random()} className="p-3 bg-slate-900 border border-slate-850 rounded-xl flex items-start gap-3">
                        <Activity className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-slate-200">{log.description}</p>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase mt-1 block">
                            {log.type} &bull; {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(modalLogs || []).length === 0 && !modalLoading && (
                      <div className="py-12 text-center text-slate-500 text-sm">
                        No activity logs registered yet. Keep bot farming.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-850 bg-slate-950/40 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Last Ingestion: {modalAccount.lastSeen ? new Date(modalAccount.lastSeen).toLocaleString() : 'Just now'}
              </span>
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 rounded-xl text-xs font-extrabold uppercase bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:text-white transition cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Glassmorphic Modal */}
      {deletingAccountId && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setDeletingAccountId(null)}
        >
          <div
            className="bg-ocean-deep border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Xác Nhận Xóa Tài Khoản</h3>
                <p className="text-xs text-slate-400">Hành động này không thể hoàn tác!</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản này và tất cả nhật ký dữ liệu liên quan khỏi hệ thống không?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingAccountId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={confirmDeleteAccount}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition"
              >
                Xóa Vĩnh Viễn
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Glassmorphic Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <div className={`px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 text-xs font-bold ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/80 border-red-500/30 text-red-300'
          }`}>
            <span className="w-2 h-2 rounded-full animate-ping bg-current" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};
