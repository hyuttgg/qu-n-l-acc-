import React, { useEffect, useState } from 'react';
import { useApp } from '../store';
import { Layers, Search, Trash2, Eye, X, Coins, Gem, Clock, Compass, Activity, FileText } from 'lucide-react';

import { resolveItemImage } from '../utils/itemImageResolver';

interface ItemImageProps {
  category: string;
  name: string;
  fallbackEmoji: string;
  imgClass?: string;
  emojiClass?: string;
}

const ItemImage: React.FC<ItemImageProps> = ({
  category,
  name,
  fallbackEmoji,
  imgClass = "w-16 h-16 object-contain",
  emojiClass = "text-2xl"
}) => {
  const [error, setError] = useState(false);
  const src = resolveItemImage(category, name);

  useEffect(() => {
    setError(false);
  }, [category, name]);

  if (!src || error) {
    return <span className={emojiClass}>{fallbackEmoji}</span>;
  }

  return (
    <img
      src={src}
      alt={name}
      className={imgClass}
      onError={() => setError(true)}
    />
  );
};

export const AccountList: React.FC = () => {
  const { accounts, fetchAccounts, selectedAccountDetails, fetchAccountDetails, deleteAccount, updateAccountNotes } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'equipped' | 'inventory' | 'sessions' | 'logs'>('equipped');

  // Notes state
  const [notesInput, setNotesInput] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Sync notes input only when opening details for a different account
  useEffect(() => {
    if (selectedAccountDetails) {
      if (selectedAccountDetails.account._id !== activeAccountId) {
        setNotesInput(selectedAccountDetails.account.notes || '');
        setActiveAccountId(selectedAccountDetails.account._id);
      }
    } else {
      setNotesInput('');
      setActiveAccountId(null);
    }
  }, [selectedAccountDetails, activeAccountId]);

  // Toast & Modal States for UI Feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenDetails = (accountId: string) => {
    fetchAccountDetails(accountId);
    setActiveTab('equipped');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveAccountId(null);
  };

  const handleSaveNotes = async () => {
    if (!selectedAccountDetails) return;
    setSavingNotes(true);
    const success = await updateAccountNotes(selectedAccountDetails.account._id, notesInput);
    if (success) {
      showToast('Đã lưu ghi chú thành công!', 'success');
    } else {
      showToast('Không thể lưu ghi chú. Vui lòng thử lại!', 'error');
    }
    setSavingNotes(false);
  };

  const promptDeleteAccount = (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingAccountId(accountId);
  };

  const confirmDeleteAccount = async () => {
    if (deletingAccountId) {
      await deleteAccount(deletingAccountId);
      setDeletingAccountId(null);
      showToast('Đã xóa tài khoản thành công!', 'success');
    }
  };

  const filteredAccounts = accounts.filter(
    (acc) =>
      acc.robloxUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.race.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white glow-text-cyan flex items-center gap-2">
            <Layers className="w-8 h-8 text-gold" /> ACCOUNT MANAGEMENT
          </h1>
          <p className="text-slate-400 text-sm mt-1">Deploy, inspect, and delete tracking logs for active bots</p>
        </div>

        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, status..."
            className="w-full bg-ocean-deep/60 border border-slate-800 focus:border-ocean-cyan focus:ring-1 focus:ring-ocean-cyan rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition"
          />
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
              {filteredAccounts.map((acc) => (
                <tr
                  key={acc._id}
                  onClick={() => handleOpenDetails(acc._id)}
                  className="hover:bg-slate-900/30 transition-colors cursor-pointer group"
                >
                  <td className="py-4 font-bold text-white group-hover:text-gold transition-colors">
                    <div className="flex items-center gap-2">
                      {acc.robloxUsername}
                      {acc.notes && (
                        <span title={acc.notes} className="inline-flex items-center text-ocean-cyan hover:text-white cursor-help" onClick={(e) => e.stopPropagation()}>
                          <FileText className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-slate-300 font-semibold">{acc.level}</td>
                  <td className="py-4 text-emerald-400 font-mono">{formatBeli(acc.beli)}</td>
                  <td className="py-4 text-purple-400 font-mono">{formatBeli(acc.fragments)}</td>
                  <td className="py-4 text-slate-400">{acc.race}</td>
                  <td className="py-4 text-cyan-300">Sea {acc.sea}</td>
                  <td className="py-4 text-slate-300">
                    <span className="font-semibold text-sky-400">{acc.equipped.fruit}</span>
                  </td>
                  <td className="py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold capitalize ${
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
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(acc._id);
                        }}
                        className="p-2 rounded-lg bg-ocean-cyan/10 hover:bg-ocean-cyan/20 border border-ocean-cyan/30 text-ocean-cyan hover:text-white transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => promptDeleteAccount(acc._id, e)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-white transition"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-sm">
                    No accounts found matching search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Details Modal */}
      {showModal && selectedAccountDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel border-ocean-cyan/20 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Compass className="w-6 h-6 text-gold animate-pulse" />
                  {selectedAccountDetails.account.robloxUsername}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Level {selectedAccountDetails.account.level} &bull; {selectedAccountDetails.account.race}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-850 bg-slate-950/30 px-6">
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
                  {tab === 'equipped' ? 'Equipped Gear' : tab}
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
                        <Coins className="w-4 h-4" /> {formatBeli(selectedAccountDetails.account.beli)}
                      </span>
                    </div>
                    <div className="bg-ocean-abyss p-4 rounded-xl border border-slate-900">
                      <span className="text-slate-500 text-xs block font-semibold">Fragments</span>
                      <span className="text-lg font-bold text-purple-400 flex items-center gap-1 mt-1">
                        <Gem className="w-4 h-4" /> {formatBeli(selectedAccountDetails.account.fragments)}
                      </span>
                    </div>
                    <div className="bg-ocean-abyss p-4 rounded-xl border border-slate-900">
                      <span className="text-slate-500 text-xs block font-semibold">Farming Map</span>
                      <span className="text-sm font-bold text-sky-400 truncate block mt-1">{selectedAccountDetails.account.location}</span>
                    </div>
                    <div className="bg-ocean-abyss p-4 rounded-xl border border-slate-900">
                      <span className="text-slate-500 text-xs block font-semibold">Farming Time</span>
                      <span className="text-sm font-bold text-slate-300 flex items-center gap-1 mt-1">
                        <Clock className="w-4 h-4" /> {formatPlaytime(selectedAccountDetails.account.playtime)}
                      </span>
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
                        className="px-4 py-2 bg-ocean-cyan/25 border border-ocean-cyan/40 hover:bg-ocean-cyan/40 text-ocean-cyan hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center self-end disabled:opacity-50 h-10"
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
                          name={selectedAccountDetails.account.equipped.fruit}
                          fallbackEmoji="🍇"
                          emojiClass="text-2xl"
                          imgClass="w-16 h-16 object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold text-white mt-3 block truncate max-w-full">
                        {selectedAccountDetails.account.equipped.fruit}
                      </span>
                      <span className="text-slate-500 text-xs mt-1 block">Mastery: {selectedAccountDetails.account.equipped.fruitMastery}</span>
                    </div>

                    {/* Equipped Sword */}
                    <div className="bg-ocean-deep p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center">
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Equipped Sword</span>
                      <div className="w-20 h-20 bg-ocean-abyss rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
                        <ItemImage
                          category="swords"
                          name={selectedAccountDetails.account.equipped.sword}
                          fallbackEmoji="⚔️"
                          emojiClass="text-2xl text-slate-600"
                          imgClass="w-16 h-16 object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold text-white mt-3 block truncate max-w-full">
                        {selectedAccountDetails.account.equipped.sword}
                      </span>
                    </div>

                    {/* Equipped Gun */}
                    <div className="bg-ocean-deep p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center">
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Equipped Gun</span>
                      <div className="w-20 h-20 bg-ocean-abyss rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
                        <ItemImage
                          category="guns"
                          name={selectedAccountDetails.account.equipped.gun}
                          fallbackEmoji="🔫"
                          emojiClass="text-2xl text-slate-600"
                          imgClass="w-16 h-16 object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold text-white mt-3 block truncate max-w-full">
                        {selectedAccountDetails.account.equipped.gun}
                      </span>
                    </div>

                    {/* Equipped Fighting Style */}
                    <div className="bg-ocean-deep p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center">
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Fighting Style</span>
                      <div className="w-20 h-20 bg-ocean-abyss rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
                        <ItemImage
                          category="styles"
                          name={selectedAccountDetails.account.equipped.fightingStyle}
                          fallbackEmoji="👊"
                          emojiClass="text-2xl text-slate-600"
                          imgClass="w-16 h-16 object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold text-white mt-3 block truncate max-w-full">
                        {selectedAccountDetails.account.equipped.fightingStyle}
                      </span>
                    </div>

                    {/* Equipped Accessory */}
                    <div className="bg-ocean-deep p-4 rounded-xl border border-slate-800 flex flex-col justify-between items-center text-center">
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Equipped Accessory</span>
                      <div className="w-20 h-20 bg-ocean-abyss rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
                        <ItemImage
                          category="accessories"
                          name={selectedAccountDetails.account.equipped.accessory || 'None'}
                          fallbackEmoji="👑"
                          emojiClass="text-2xl text-slate-600"
                          imgClass="w-16 h-16 object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold text-white mt-3 block truncate max-w-full">
                        {selectedAccountDetails.account.equipped.accessory || 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Farming Map Section (For Sea 3) */}
                  {(selectedAccountDetails.account.sea === 3 || 
                    (selectedAccountDetails.account.location && selectedAccountDetails.account.location.toLowerCase().includes('sea 3'))) && (
                    <div className="bg-ocean-deep/60 p-4 rounded-xl border border-slate-800 mt-6">
                      <span className="text-slate-400 text-xs uppercase font-extrabold tracking-wider block mb-3">Sea 3 Farming Map</span>
                      <div className="relative rounded-lg overflow-hidden border border-slate-700/50">
                        <img 
                          src="/map_sea_3.jpg" 
                          alt="Sea 3 Map" 
                          className="w-full h-auto max-h-[320px] object-cover"
                        />
                        <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800 text-[10px] text-white font-bold">
                          Current Location: {selectedAccountDetails.account.location}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INVENTORY */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  {/* Category lists inside inventory */}
                  <div className="space-y-4">
                    {/* 1. Stored Fruits */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                        Devil Fruits ({selectedAccountDetails.inventory.fruits?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(selectedAccountDetails.inventory.fruits || []).map((fruit, idx) => (
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
                        {(selectedAccountDetails.inventory.fruits || []).length === 0 && (
                          <span className="text-xs text-slate-600 italic">No fruits stored in inventory.</span>
                        )}
                      </div>
                    </div>

                    {/* 2. Swords */}
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                        Swords ({selectedAccountDetails.inventory.weapons?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(selectedAccountDetails.inventory.weapons || []).map((sword, idx) => (
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
                        {(selectedAccountDetails.inventory.weapons || []).length === 0 && (
                          <span className="text-xs text-slate-600 italic">No swords stored.</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Guns */}
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                        Guns ({selectedAccountDetails.inventory.guns?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(selectedAccountDetails.inventory.guns || []).map((gun, idx) => (
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
                        {(selectedAccountDetails.inventory.guns || []).length === 0 && (
                          <span className="text-xs text-slate-600 italic">No guns stored.</span>
                        )}
                      </div>
                    </div>

                    {/* 4. Fighting Styles */}
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                        Fighting Styles ({selectedAccountDetails.inventory.styles?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(selectedAccountDetails.inventory.styles || []).map((style, idx) => (
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
                        {(selectedAccountDetails.inventory.styles || []).length === 0 && (
                          <span className="text-xs text-slate-600 italic">No fighting styles stored.</span>
                        )}
                      </div>
                    </div>

                    {/* 5. Accessories */}
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                        Accessories ({selectedAccountDetails.inventory.accessories?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(selectedAccountDetails.inventory.accessories || []).map((acc, idx) => (
                          <div key={idx} className="bg-ocean-deep p-3 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 bg-ocean-abyss rounded flex items-center justify-center overflow-hidden">
                              <ItemImage
                                category="accessories"
                                name={acc}
                                fallbackEmoji="👑"
                                emojiClass="text-base text-slate-500"
                                imgClass="w-8 h-8 object-contain"
                              />
                            </div>
                            <span className="text-xs font-bold text-white mt-2 block truncate max-w-full">{acc}</span>
                          </div>
                        ))}
                        {(selectedAccountDetails.inventory.accessories || []).length === 0 && (
                          <span className="text-xs text-slate-600 italic">No accessories.</span>
                        )}
                      </div>
                    </div>

                    {/* 6. Materials */}
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                        Materials ({selectedAccountDetails.inventory.materials?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {(selectedAccountDetails.inventory.materials || []).map((mat, idx) => (
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
                        {(selectedAccountDetails.inventory.materials || []).length === 0 && (
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
                    {selectedAccountDetails.logs.map((log) => (
                      <div key={log._id} className="p-3 bg-slate-900 border border-slate-850 rounded-xl flex items-start gap-3">
                        <Activity className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-slate-200">{log.description}</p>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase mt-1 block">
                            {log.type} &bull; {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {selectedAccountDetails.logs.length === 0 && (
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
                Last Ingestion: {new Date(selectedAccountDetails.account.lastSeen).toLocaleString()}
              </span>
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 rounded-xl text-xs font-extrabold uppercase bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:text-white transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Glassmorphic Modal */}
      {deletingAccountId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-ocean-deep border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
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
        </div>
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
