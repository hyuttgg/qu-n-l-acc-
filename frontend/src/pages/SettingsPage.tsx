import React, { useState } from 'react';
import { useApp } from '../store';
import { Settings, Key, RefreshCw, Copy, Check, Trash2, Clock } from 'lucide-react';
import { api } from '../utils/api';
import { UserCard } from '../components/UserCard';

export const SettingsPage: React.FC = () => {
  const { user, regenerateApiKey, logout, updateUser } = useApp();
  const [scriptCopied, setScriptCopied] = useState(false);
  const [isCopyingScript, setIsCopyingScript] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState<'24h' | '32h' | '72h'>('24h');

  const handleUpdateNickname = async (newNickname: string): Promise<boolean> => {
    try {
      const res = await api.put('/auth/nickname', { nickname: newNickname });
      if (res.success && user) {
        updateUser({ ...user, nickname: newNickname });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating nickname:', err);
      return false;
    }
  };

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

      {/* User Identity Card & Discord Link Form */}
      {user && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <UserCard user={user} onUpdateNickname={handleUpdateNickname} />

          {/* Discord Verification Box */}
          <div className="glass-panel p-6 border border-cyan-500/20 space-y-4">
            <div className="flex items-center gap-3 text-cyan-400">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🧬</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Liên Kết Tài Khoản Discord</h3>
                <p className="text-xs text-slate-400">Nhập mã xác thực từ lệnh <code className="text-cyan-300 font-mono">/link</code> trên Discord</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ví dụ: 7F2X-K91P"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-500/50 uppercase"
                  maxLength={15}
                  id="linkCodeInput"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const input = document.getElementById('linkCodeInput') as HTMLInputElement;
                    const code = input?.value?.trim();
                    if (!code) {
                      showToast('Vui lòng nhập mã xác thực từ Discord', 'error');
                      return;
                    }
                    try {
                      const res = await api.post('/bot/link/confirm', { code });
                      if (res.success) {
                        showToast('✓ Đã liên kết tài khoản Discord thành công!');
                        input.value = '';
                        // Refresh profile
                        const me = await api.get('/auth/me');
                        if (me.success) updateUser(me.user);
                      } else {
                        showToast(res.message || 'Mã xác thực không hợp lệ', 'error');
                      }
                    } catch (err: any) {
                      showToast(err.message || 'Lỗi khi kết nối tới máy chủ', 'error');
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer"
                >
                  Xác Nhận
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Mở Discord ➔ Vào kênh <span className="text-cyan-300 font-semibold">#🧬・liên-kết-tài-khoản</span> ➔ Gõ <code className="text-cyan-300 font-mono">/link</code> để lấy mã xác thực.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Broadcast Panel (Only visible to Owner / Admin / Developer) */}
      {user && ['Owner', 'Admin', 'Developer'].includes(user.role || '') && (
        <div className="glass-panel p-6 border border-purple-500/30 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2 border-b border-purple-500/20 pb-4">
            <div className="flex items-center gap-3 text-purple-400">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🚀</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Phát Thông Báo Nâng Cấp / Bảo Trì Tới Discord</h3>
                <p className="text-xs text-slate-400">Tự động phát thẻ Embed tin nhắn cực đẹp tới kênh <code className="text-purple-300 font-mono">#🚀・cập-nhật-hệ-thống</code></p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-extrabold uppercase">
              👑 Admin Only
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Loại Thông Báo</label>
              <select
                id="broadcastType"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="UPDATE">🚀 Cập Nhật Hệ Thống (Update)</option>
                <option value="MAINTENANCE">🛠️ Bảo Trì Web Dashboard (Maintenance)</option>
                <option value="ANNOUNCEMENT">📢 Thông Báo Chung (Announcement)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Phiên Bản / Tiêu Đề</label>
              <input
                type="text"
                id="broadcastVersion"
                placeholder="Ví dụ: v2.5.0 hoặc Bảo trì Server"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                defaultValue="v2.5.0"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Thời Gian Dự Kiến (Nếu bảo trì)</label>
              <input
                type="text"
                id="broadcastDuration"
                placeholder="Ví dụ: 30 phút"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                defaultValue="30 phút"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Chi Tiết Nâng Cấp / Lý Do Bảo Trì</label>
            <textarea
              id="broadcastContent"
              rows={3}
              placeholder="Nhập chi tiết các tính năng mới được cập nhật hoặc lý do bảo trì..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 font-mono"
              defaultValue="• Tự động nâng cấp hệ thống Discord Bot Realtime.\n• Tối ưu tốc độ phản hồi lệnh Slash Commands.\n• Thêm kênh chào mừng thành viên mới và hệ thống phát thông báo."
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={async () => {
                const typeEl = document.getElementById('broadcastType') as HTMLSelectElement;
                const versionEl = document.getElementById('broadcastVersion') as HTMLInputElement;
                const durationEl = document.getElementById('broadcastDuration') as HTMLInputElement;
                const contentEl = document.getElementById('broadcastContent') as HTMLTextAreaElement;

                try {
                  const res = await api.post('/bot/broadcast', {
                    type: typeEl.value,
                    version: versionEl.value,
                    duration: durationEl.value,
                    content: contentEl.value,
                    author: user.nickname || user.username
                  });

                  if (res.success) {
                    showToast(`✓ ${res.message}`);
                  } else {
                    showToast(res.message || 'Lỗi gửi thông báo', 'error');
                  }
                } catch (err: any) {
                  showToast(err.message || 'Lỗi kết nối máy chủ', 'error');
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-500/20 transition cursor-pointer flex items-center gap-2"
            >
              <span>🚀</span> Phát Thông Báo Tới Discord
            </button>
          </div>
        </div>
      )}

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
