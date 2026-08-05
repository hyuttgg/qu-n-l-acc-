import React, { useState } from 'react';
import { useApp } from '../store';
import { MessageSquare, Link2, CheckCircle2, ShieldCheck, HelpCircle, Send, UserCheck } from 'lucide-react';
import { api } from '../utils/api';
import { UserCard } from '../components/UserCard';

export const DiscordIntegrationPage: React.FC = () => {
  const { user, updateUser } = useApp();
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white glow-text-cyan flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-cyan-400" /> DISCORD INTEGRATION & BOT SYNC
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Quản lý tài khoản Discord đã liên kết, mã xác thực Realtime và phát thông báo hệ thống
        </p>
      </div>

      {/* Grid: Discord User Identity & Link Form */}
      {user && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* User Profile Card */}
          <UserCard user={user} onUpdateNickname={handleUpdateNickname} />

          {/* Discord Verification Box */}
          <div className="glass-panel p-6 border border-cyan-500/30 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 text-cyan-400">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/10">
                <Link2 className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Liên Kết Tài Khoản Discord</h3>
                <p className="text-xs text-slate-400">Nhập mã xác thực từ lệnh <code className="text-cyan-300 font-mono">/link</code> trên Discord</p>
              </div>
            </div>

            {/* Status indicator */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-850 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Trạng Thái Liên Kết:</span>
              {user.discordId ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" /> Đã liên kết ({user.discordId})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-bold text-amber-400 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <ShieldCheck className="w-4 h-4" /> Chưa liên kết
                </span>
              )}
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ví dụ: 7F2X-K91P"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-500/50 uppercase tracking-widest"
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
                        const me = await api.get('/auth/me');
                        if (me.success) updateUser(me.user);
                      } else {
                        showToast(res.message || 'Mã xác thực không hợp lệ', 'error');
                      }
                    } catch (err: any) {
                      showToast(err.message || 'Lỗi khi kết nối tới máy chủ', 'error');
                    }
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Xác Nhận
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-900 text-[11px] text-slate-400 leading-relaxed space-y-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> Hướng dẫn lấy mã:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                  <li>Mở Discord Server ➔ Vào kênh <span className="text-cyan-300 font-semibold">#🧬・liên-kết-tài-khoản</span>.</li>
                  <li>Gõ lệnh Slash Command <code className="text-cyan-300 font-mono">/link</code> hoặc nhắn tin <code className="text-cyan-300 font-mono">link</code>.</li>
                  <li>Copy mã 6 ký tự hiển thị và dán vào ô trên.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guide to Discord Bot Commands */}
      <div className="glass-panel p-6 border border-slate-800 space-y-4">
        <h3 className="font-extrabold text-white text-base flex items-center gap-2">
          <span>🤖</span> Danh Sách Lệnh Discord Bot Tương Tác
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-2">
            <span className="px-2.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-extrabold uppercase">
              Thành Viên (Member)
            </span>
            <ul className="text-xs text-slate-300 space-y-1.5 font-mono">
              <li>• <span className="text-cyan-400 font-bold">/link</span>: Tạo mã xác thực 6 ký tự</li>
              <li>• <span className="text-cyan-400 font-bold">/profile</span>: Xem thông tin cá nhân & UserCode</li>
              <li>• <span className="text-cyan-400 font-bold">/accounts</span>: Xem danh sách acc Roblox</li>
              <li>• <span className="text-cyan-400 font-bold">/account &lt;name&gt;</span>: Chi tiết level, beli, fruit</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-2">
            <span className="px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-extrabold uppercase">
              Moderator / VIP
            </span>
            <ul className="text-xs text-slate-300 space-y-1.5 font-mono">
              <li>• <span className="text-amber-400 font-bold">/online</span>: Thống kê tổng số acc Online</li>
              <li>• <span className="text-amber-400 font-bold">/stats</span>: Thống kê tổng Beli & Runtime</li>
              <li>• <span className="text-amber-400 font-bold">/runtime</span>: Thời gian cày bot từng acc</li>
              <li>• <span className="text-amber-400 font-bold">/search &lt;kw&gt;</span>: Tìm kiếm theo Fruit/Level</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-2">
            <span className="px-2.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-extrabold uppercase">
              Admin / Owner
            </span>
            <ul className="text-xs text-slate-300 space-y-1.5 font-mono">
              <li>• <span className="text-purple-400 font-bold">/admin</span>: Tra cứu người dùng toàn hệ thống</li>
              <li>• <span className="text-purple-400 font-bold">/apikey</span>: Kiểm tra API Key cá nhân</li>
              <li>• <span className="text-purple-400 font-bold">/createkey</span>: Tạo mới API Key nhanh</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Admin Discord Broadcaster Module (Visible to Admin/Owner/Developer) */}
      {user && ['Owner', 'Admin', 'Developer'].includes(user.role || '') && (
        <div className="glass-panel p-6 border border-purple-500/30 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2 border-b border-purple-500/20 pb-4">
            <div className="flex items-center gap-3 text-purple-400">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Phát Thông Báo Nâng Cấp / Bảo Trì Tới Discord</h3>
                <p className="text-xs text-slate-400">Tự động phát thẻ Embed tin nhắn tới kênh <code className="text-purple-300 font-mono">#🚀・cập-nhật-hệ-thống</code></p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-extrabold uppercase">
              👑 Admin Broadcaster
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
            <label className="block text-xs text-slate-400 mb-1.5 font-medium font-mono">Nội Dung Chi Tiết</label>
            <textarea
              id="broadcastContent"
              rows={3}
              placeholder="Nhập nội dung nâng cấp hệ thống..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50 font-mono"
              defaultValue="• Nâng cấp hệ thống Discord Bot Realtime.\n• Tối ưu tốc độ phản hồi lệnh Slash Commands.\n• Thêm kênh chào mừng thành viên mới và hệ thống phát thông báo."
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
              <Send className="w-4 h-4" /> Phát Thông Báo Tới Discord
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <div className={`px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 text-xs font-bold ${
            toastMsg.type === 'success'
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

export default DiscordIntegrationPage;
