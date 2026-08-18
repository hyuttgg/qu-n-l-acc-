import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { Settings, Key, RefreshCw, Copy, Check, Trash2, Clock, Cpu, ShieldCheck, Zap, Lock, Power } from 'lucide-react';
import { api } from '../utils/api';
import { csharpWasm, type WasmEngineInfo } from '../services/csharpWasmService';

export const SettingsPage: React.FC = () => {
  const { user, regenerateApiKey, logout } = useApp();
  const [wasmInfo, setWasmInfo] = useState<WasmEngineInfo>(csharpWasm.getEngineInfo());

  useEffect(() => {
    const unsub = csharpWasm.subscribe((info) => setWasmInfo(info));
    return () => unsub();
  }, []);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [isCopyingScript, setIsCopyingScript] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState<'24h' | '32h' | '72h'>('24h');

  const BACKEND_URL = (import.meta.env.VITE_API_URL || 'https://quan-ly-acc-viet-nam.onrender.com').trim().replace(/\/+$/, '');
  const displayLoaderScript = `loadstring(game:HttpGet("${BACKEND_URL}/api/lua/load?token=..."))()`;

  const obfuscateToLuaEscapes = (str: string) => {
    return str.split('').map(char => {
      const code = char.charCodeAt(0);
      return '\\' + String(code).padStart(3, '0');
    }).join('');
  };



  const handleCopyScript = async () => {
    if (isCopyingScript) return;
    setIsCopyingScript(true);
    try {
      const res = await api.post('/auth/loader-token', { expiresIn: tokenExpiry });
      if (res.success && res.token) {
        const rawUrl = `${BACKEND_URL}/api/lua/load?token=${res.token}`;
        const encryptedUrl = obfuscateToLuaEscapes(rawUrl);
        const copyText = `loadstring(game:HttpGet("${encryptedUrl}"))()`;
        await navigator.clipboard.writeText(copyText);
        setScriptCopied(true);
        setTimeout(() => setScriptCopied(false), 2000);
      } else {
        alert('Failed to generate loader token.');
      }
    } catch (err) {
      console.error('Error generating token:', err);
      const fallbackUrl = `${BACKEND_URL}/api/lua/load?key=${user?.apiKey || 'YOUR_API_KEY'}`;
      const encryptedFallback = obfuscateToLuaEscapes(fallbackUrl);
      const fallbackScript = `loadstring(game:HttpGet("${encryptedFallback}"))()`;
      await navigator.clipboard.writeText(fallbackScript);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    } finally {
      setIsCopyingScript(false);
    }
  };

  // Modal states
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const confirmRegenerateKey = async () => {
    setShowRegenModal(false);
    await regenerateApiKey();
    showToast('Đã làm mới API Key thành công!');
  };

  const confirmDeleteUser = async () => {
    setShowDeleteUserModal(false);
    setDeleteLoading(true);
    try {
      const res = await api.delete('/auth/delete');
      if (res.success) {
        logout();
      } else {
        showToast(res.message || 'Xóa tài khoản thất bại.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Đã xảy ra lỗi khi xóa tài khoản.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white glow-text-cyan flex items-center gap-2">
          <Settings className="w-8 h-8 text-gold" /> SYSTEM SETTINGS
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure credentials, security channels, and access tokens</p>
      </div>



      {/* API Key settings panel */}
      <div className="glass-panel p-6 border border-gold/10 space-y-6">
        <div className="flex justify-between items-start gap-4 flex-col sm:flex-row">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-gold" /> Webhook Authentication Key
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              This API key validates updates sent from your Lua script inside Roblox client instances. Keep this secret.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-extrabold uppercase tracking-wider">
            SaaS Enabled
          </span>
        </div>



        {/* Roblox Loader Script */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider">
              Roblox Loader Script
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gold" /> Hạn token:
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-900">
                {(['24h', '32h', '72h'] as const).map((expiryOption) => (
                  <button
                    key={expiryOption}
                    type="button"
                    onClick={() => setTokenExpiry(expiryOption)}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${tokenExpiry === expiryOption
                        ? 'bg-gold text-ocean-abyss shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                  >
                    {expiryOption}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-900">
            <span className="font-mono text-white text-xs select-all break-all flex-1">
              {displayLoaderScript}
            </span>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleCopyScript}
                disabled={isCopyingScript}
                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition disabled:opacity-50"
                title={`Copy Script (Hạn dùng token ${tokenExpiry})`}
              >
                {scriptCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Direct GitHub Raw Option */}
          <div className="space-y-2 pt-2">
            <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider">
              Direct GitHub Raw Link (Load trực tiếp từ GitHub)
            </label>
            <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-900">
              <span className="font-mono text-slate-300 text-xs select-all break-all flex-1">
                {`_G.OceanForgeApiKey="${user?.apiKey || 'YOUR_API_KEY'}";loadstring(game:HttpGet("https://raw.githubusercontent.com/hyuttgg/qu-n-l-acc-/refs/heads/main/khanhdev%20web%20dashboard.lua"))()`}
              </span>
              <button
                onClick={async () => {
                  const directText = `_G.OceanForgeApiKey="${user?.apiKey || 'YOUR_API_KEY'}";loadstring(game:HttpGet("https://raw.githubusercontent.com/hyuttgg/qu-n-l-acc-/refs/heads/main/khanhdev%20web%20dashboard.lua"))()`;
                  await navigator.clipboard.writeText(directText);
                  showToast('Đã copy Direct GitHub Raw Script!');
                }}
                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
                title="Copy Direct GitHub Script"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 text-xs space-y-2">
          <h4 className="font-bold text-slate-300">How to deploy:</h4>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-400">
            <li>Copy the **Roblox Loader Script** above.</li>
            <li>Execute the loader script in your Roblox executor (such as Delta, Fluxus, or VMOS).</li>
            <li>The script will automatically connect using your secure credentials and start syncing.</li>
          </ol>
        </div>
      </div>

      {/* C# .NET WebAssembly Binary Security & Engine Panel */}
      <div className="glass-panel p-6 border border-cyan-500/20 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-start gap-4 flex-col sm:flex-row">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white flex items-center gap-2.5">
              <div className={`p-2 rounded-xl border transition-all ${
                wasmInfo.isEnabled ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-800/40 border-slate-700 text-slate-400'
              }`}>
                <Cpu className="w-5 h-5" />
              </div>
              <span>C# .NET WebAssembly Engine &amp; Security Sandbox</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                wasmInfo.isEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {wasmInfo.status}
              </span>
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Mã nguồn C# được biên dịch thành file nhị phân WebAssembly (<code className="text-cyan-300 font-mono">oceanforge_core.wasm</code>) chạy trực tiếp trong trình duyệt, bảo vệ các thuật toán mã hóa chống lại việc xem trộm mã qua DevTools F12.
            </p>
          </div>

          {/* Master Switch Button */}
          <button
            onClick={() => csharpWasm.toggleEnabled()}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer shadow-md flex-shrink-0 ${
              wasmInfo.isEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Power className={`w-4 h-4 ${wasmInfo.isEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>{wasmInfo.isEnabled ? 'C# WASM: ĐANG BẬT' : 'C# WASM: ĐANG TẮT'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
              <Lock className="w-4 h-4" />
              <span>Binary Sandbox</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {wasmInfo.isEnabled ? 'Cách ly bộ nhớ 64KB, chống F12 cào key và cookie' : 'Đang tắt (Dùng JS mã hóa tiêu chuẩn)'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <Zap className="w-4 h-4" />
              <span>LINQ Fast-Filter</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {wasmInfo.isEnabled ? 'Tốc độ lọc 5.000+ tài khoản < 0.05ms' : 'Đang tắt (Dùng Array.filter của JS)'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Adler32 Checksum</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {wasmInfo.isEnabled ? 'Kiểm tra tính toàn vẹn gói tin nhị phân' : 'Chế độ JS fallback'}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs font-mono text-cyan-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${wasmInfo.isEnabled ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`} />
            <span>Runtime: {wasmInfo.runtime} ({wasmInfo.executionSpeed})</span>
          </div>
        </div>
      </div>

      {/* Danger Zone Panel */}
      <div className="glass-panel p-6 border border-red-500/10 space-y-6">
        <div className="flex justify-between items-start gap-4 flex-col sm:flex-row">
          <div>
            <h3 className="text-lg font-bold text-red-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Danger Zone (Khu vực nguy hiểm)
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Hành động này sẽ xóa vĩnh viễn tài khoản chính, các tài khoản Roblox đã liên kết, nhật ký hoạt động và toàn bộ cấu hình. Không thể khôi phục lại dữ liệu sau khi xóa.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowDeleteUserModal(true)}
          disabled={deleteLoading}
          className="w-full py-2.5 rounded-xl font-extrabold text-xs text-white bg-red-650 hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-red-500/20"
        >
          {deleteLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'XÓA VĨNH VIỄN TÀI KHOẢN'
          )}
        </button>
      </div>

      {/* Regenerate Key Glassmorphic Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-ocean-deep border border-gold/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-gold">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Xác Nhận Tạo API Key Mới</h3>
                <p className="text-xs text-slate-400">Cảnh báo ngắt kết nối Roblox Client!</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Việc tạo lại API Key sẽ vô hiệu hóa ngay lập tức chìa khóa cũ. Tất cả script Roblox đang chạy sẽ ngừng gửi dữ liệu cho đến khi bạn cập nhật API Key mới.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRegenModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={confirmRegenerateKey}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gold hover:opacity-90 text-ocean-abyss shadow-lg shadow-gold/20 transition"
              >
                Tạo Key Mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Account Modal */}
      {showDeleteUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-ocean-deep border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">CẢNH BÁO: Xóa Tài Khoản Hệ Thống</h3>
                <p className="text-xs text-slate-400">Hành động này KHÔNG THỂ KHÔI PHỤC!</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản chính cùng toàn bộ tài khoản Roblox, nhật ký và dữ liệu cá nhân không?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteUserModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition"
              >
                Xác Nhận Xóa Hẳn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphic Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <div className={`px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 text-xs font-bold ${toastMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/80 border-red-500/30 text-red-300'
            }`}>
            <span className="w-2 h-2 rounded-full animate-ping bg-current" />
            <span>{toastMsg.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};
