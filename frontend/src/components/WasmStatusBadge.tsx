import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Cpu, Zap, X, Lock, Activity, Power, Copy, Check, Database, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../store';
import { csharpWasm, type WasmEngineInfo } from '../services/csharpWasmService';

export const WasmStatusBadge: React.FC = () => {
  const { accounts, user } = useApp();
  const [info, setInfo] = useState<WasmEngineInfo>(csharpWasm.getEngineInfo());
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [realResult, setRealResult] = useState<string | null>(null);

  // Real Account Selection & Encryption State
  const [selectedRealAccount, setSelectedRealAccount] = useState<string>(
    accounts && accounts.length > 0 ? accounts[0].robloxUsername : ''
  );
  const [customSecretInput, setCustomSecretInput] = useState<string>('');
  const [cipherText, setCipherText] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [copied, setCopied] = useState(false);

  // Sync selected account when accounts load
  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedRealAccount) {
      setSelectedRealAccount(accounts[0].robloxUsername);
    }
  }, [accounts, selectedRealAccount]);

  useEffect(() => {
    const unsubscribe = csharpWasm.subscribe((newInfo) => {
      setInfo(newInfo);
    });
    return () => unsubscribe();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen]);

  const handleToggle = () => {
    csharpWasm.toggleEnabled();
    setInfo(csharpWasm.getEngineInfo());
    setRealResult(null);
    setCipherText('');
    setDecryptedText('');
  };

  // Encrypt Real Account Data / Cookie
  const handleEncryptRealData = async () => {
    const targetAcc = accounts.find((a) => a.robloxUsername === selectedRealAccount);
    const dataToEncrypt = customSecretInput.trim()
      ? customSecretInput.trim()
      : targetAcc
      ? JSON.stringify({
          robloxUsername: targetAcc.robloxUsername,
          level: targetAcc.level,
          sea: targetAcc.sea,
          beli: targetAcc.beli,
          fragments: targetAcc.fragments,
          race: targetAcc.race,
          equipped: targetAcc.equipped,
          lastSeen: targetAcc.lastSeen,
        })
      : `User_${user?.username || 'Admin'}_APIKey_${user?.apiKey || 'DefaultSecret'}`;

    const enc = await csharpWasm.encryptSecret(dataToEncrypt);
    setCipherText(enc);
    const dec = await csharpWasm.decryptSecret(enc);
    setDecryptedText(dec);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Process and compute Checksum on Real Accounts
  const handleProcessRealAccounts = async () => {
    setProcessing(true);
    setRealResult(null);

    const startTime = performance.now();
    const realAccountsList = accounts && accounts.length > 0 ? accounts : [];

    // Fast filter on real accounts
    const filteredOnline = csharpWasm.fastFilterAccounts(realAccountsList, {
      status: 'online',
    });
    const filteredMaxLv = csharpWasm.fastFilterAccounts(realAccountsList, {
      minLevel: 2600,
    });

    // Compute binary checksum on real accounts payload
    const serializedRealData = JSON.stringify(realAccountsList);
    const checksum = await csharpWasm.computeChecksum(serializedRealData);

    const totalBeli = realAccountsList.reduce((sum, a) => sum + (a.beli || 0), 0);
    const totalFrag = realAccountsList.reduce((sum, a) => sum + (a.fragments || 0), 0);
    const totalTimeMs = (performance.now() - startTime).toFixed(2);
    const modeLabel = info.isEnabled ? 'C# Wasm Sandbox' : 'JavaScript Standard';

    setRealResult(
      `⚡ Đã quét & xác thực ${realAccountsList.length} Tài Khoản Thật qua [${modeLabel}] trong ${totalTimeMs}ms\n` +
      `• Mã băm Checksum toàn vẹn: 0x${checksum.toString(16).toUpperCase()}\n` +
      `• Đang Online: ${filteredOnline.length} | Đạt Max Cấp 2600: ${filteredMaxLv.length}\n` +
      `• Tổng Beli Thật: ${totalBeli.toLocaleString()} Beli | Tổng Fragments Thật: ${totalFrag.toLocaleString()} Frags`
    );
    setProcessing(false);
  };

  return (
    <>
      {/* Topbar Badge */}
      <button
        onClick={() => setModalOpen(!modalOpen)}
        className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer ${
          info.isEnabled
            ? 'bg-cyan-950/40 border-cyan-500/30 hover:border-cyan-400/80 hover:bg-cyan-900/40 hover:shadow-cyan-glow'
            : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/60'
        }`}
        title={info.isEnabled ? 'C# .NET WebAssembly: Đang BẬT 🟢 (Bấm để xem chi tiết)' : 'C# .NET WebAssembly: Đang TẮT ⚪ (Bấm để xem chi tiết)'}
      >
        <span className="relative flex h-2 w-2">
          {info.isEnabled ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          <Cpu className={`w-3.5 h-3.5 ${info.isEnabled ? 'text-cyan-400' : 'text-slate-400'}`} />
          <span className={`text-[11px] font-mono font-bold tracking-wider transition ${
            info.isEnabled ? 'text-cyan-200 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-200'
          }`}>
            {info.isEnabled ? 'C# .NET WASM' : 'C# WASM (TẮT)'}
          </span>
        </div>
      </button>

      {/* Detail & Interactive Control Modal (Rendered via React Portal directly into body) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {modalOpen && (
            <div
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md cursor-pointer overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl overflow-hidden my-auto cursor-default max-h-[90vh] flex flex-col z-[100000]"
              >
                {/* Background gradient flare */}
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Modal Header with Master Toggle */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 gap-3 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border transition-all ${
                      info.isEnabled ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}>
                      <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                        {info.version}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                          info.isEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {info.status}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Bảo mật nhị phân &amp; Xử lý dữ liệu thật của tài khoản
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Master Switch Button */}
                    <button
                      onClick={handleToggle}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer shadow-md ${
                        info.isEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <Power className={`w-3.5 h-3.5 ${info.isEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>{info.isEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}</span>
                    </button>

                    <button
                      onClick={() => setModalOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="Đóng (ESC)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content Body */}
                <div className="overflow-y-auto space-y-5 py-3 pr-1">
                  {/* Real Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Tài Khoản Thật</span>
                      <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5 mt-0.5">
                        <Database className="w-3.5 h-3.5" />
                        {accounts?.length || 0} Acc Đã Kết Nối
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Memory Sandbox</span>
                      <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">
                        {info.isEnabled ? `${(info.memoryBytes / 1024).toFixed(0)} KB Isolated` : '0 KB (Disabled)'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Chế Độ Bảo Mật</span>
                      <span className={`text-xs font-mono font-bold mt-0.5 block ${info.isEnabled ? 'text-amber-400' : 'text-slate-400'}`}>
                        {info.securityMode}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Tốc Độ Xử Lý</span>
                      <span className="text-xs font-mono font-bold text-purple-400 mt-0.5 block">{info.executionSpeed}</span>
                    </div>
                  </div>

                  {/* Real Account Data Encryption Vault */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        <Lock className="w-4 h-4 text-cyan-400" />
                        <span>Két Mã Hóa Bảo Vệ Tài Khoản &amp; Cookie Thật ({info.isEnabled ? 'C# Wasm Sandbox' : 'JavaScript'})</span>
                      </div>
                      <button
                        onClick={handleEncryptRealData}
                        className="px-3 py-1 text-xs font-bold rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Mã hóa bảo vệ 🔒</span>
                      </button>
                    </div>

                    {/* Account Selector & Input */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Chọn tài khoản thật:</label>
                        <select
                          value={selectedRealAccount}
                          onChange={(e) => setSelectedRealAccount(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                        >
                          {accounts && accounts.length > 0 ? (
                            accounts.map((acc) => (
                              <option key={acc._id} value={acc.robloxUsername}>
                                {acc.robloxUsername} (Lv.{acc.level})
                              </option>
                            ))
                          ) : (
                            <option value="">Chưa có tài khoản Roblox nào</option>
                          )}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Hoặc nhập chuỗi Cookie / Secret tuỳ ý:</label>
                        <input
                          type="text"
                          value={customSecretInput}
                          onChange={(e) => setCustomSecretInput(e.target.value)}
                          placeholder="Nhập .ROBLOSECURITY Cookie hoặc để trống để mã hóa tài khoản đã chọn..."
                          className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    {cipherText && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Kết quả mã hóa nhị phân C# WASM:</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(cipherText)}
                            className="text-cyan-400 hover:text-cyan-200 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                          >
                            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copied ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                          </button>
                        </div>
                        <div className="p-2 bg-slate-900/90 rounded border border-slate-800 text-[11px] font-mono text-emerald-400 break-all select-all">
                          {cipherText}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono pt-1">
                          Giải mã xác minh: <span className="text-cyan-300 font-bold truncate inline-block max-w-full align-bottom">{decryptedText}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Real Data Integrity Check & Analytics */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-emerald-400" />
                          <span>Kiểm tra toàn vẹn &amp; Tính Checksum Dữ Liệu Thật</span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Xử lý {accounts?.length || 0} tài khoản thật hiện có trong database
                        </span>
                      </div>
                      <button
                        onClick={handleProcessRealAccounts}
                        disabled={processing}
                        className={`px-4 py-2 text-xs font-extrabold rounded-xl text-slate-950 hover:opacity-90 transition shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                          info.isEnabled ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-slate-400 hover:bg-slate-300'
                        }`}
                      >
                        <Activity className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
                        <span>{processing ? 'Đang quét...' : `Quét Toàn Bộ Acc Thật ⚡`}</span>
                      </button>
                    </div>

                    {realResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-xl border text-xs font-mono whitespace-pre-line leading-relaxed ${
                          info.isEnabled ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200' : 'bg-slate-800/60 border-slate-700 text-slate-300'
                        }`}
                      >
                        {realResult}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Modal Footer with Close Button */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 flex-shrink-0">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer"
                  >
                    Đóng (Esc)
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
export default WasmStatusBadge;
