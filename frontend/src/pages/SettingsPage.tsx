import React, { useState } from 'react';
import { useApp } from '../store';
import { Settings, Key, RefreshCw, Copy, Check, Mail, Lock, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { api } from '../utils/api';

export const SettingsPage: React.FC = () => {
    const { user, regenerateApiKey, updateUser, logout } = useApp();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [isCopyingScript, setIsCopyingScript] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Update Email state
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');

  // Update Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const BACKEND_URL = (import.meta.env.VITE_API_URL || 'https://quan-ly-acc-viet-nam.onrender.com').trim().replace(/\/+$/, '');
  const displayLoaderScript = `loadstring(game:HttpGet("${BACKEND_URL}/api/lua/load?token=..."))()`;

  const obfuscateToLuaEscapes = (str: string) => {
    return str.split('').map(char => {
      const code = char.charCodeAt(0);
      return '\\' + String(code).padStart(3, '0');
    }).join('');
  };

  const handleCopyKey = () => {
    if (user?.apiKey) {
      navigator.clipboard.writeText(user.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyScript = async () => {
    if (isCopyingScript) return;
    setIsCopyingScript(true);
    try {
      const res = await api.post('/auth/loader-token', {});
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

  const handleRegenerate = async () => {
    if (window.confirm('WARNING: Regenerating your API Key will break all active Roblox Lua scripts. You will need to update the key in your scripts. Do you want to proceed?')) {
      setRegenerating(true);
      await regenerateApiKey();
      setRegenerating(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    
    if (!newEmail || !emailPassword) {
      setEmailError('Vui lòng điền đầy đủ các trường.');
      return;
    }
    
    setEmailLoading(true);
    try {
      const res = await api.put('/auth/update-email', {
        newEmail,
        password: emailPassword
      });
      if (res.success && res.user) {
        updateUser(res.user);
        setEmailSuccess('Cập nhật Email thành công!');
        setNewEmail('');
        setEmailPassword('');
      } else {
        setEmailError(res.message || 'Cập nhật email thất bại.');
      }
    } catch (err: any) {
      setEmailError(err.message || 'Đã xảy ra lỗi.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Vui lòng điền đầy đủ các trường.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu mới không trùng khớp.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.put('/auth/update-password', {
        currentPassword,
        newPassword
      });
      if (res.success) {
        setPasswordSuccess('Cập nhật mật khẩu thành công!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.message || 'Cập nhật mật khẩu thất bại.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Đã xảy ra lỗi.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm1 = window.confirm('BẠN CÓ CHẮC CHẮN MUỐN XÓA TÀI KHOẢN? Hành động này sẽ xóa vĩnh viễn tài khoản và toàn bộ dữ liệu, nhật ký, bot Roblox của bạn.');
    if (!confirm1) return;

    const confirm2 = window.confirm('CẢNH BÁO LẦN CUỐI: Hành động này KHÔNG THỂ HOÀN TÁC. Bạn vẫn muốn tiếp tục xóa tài khoản chứ?');
    if (!confirm2) return;

    setDeleteLoading(true);
    try {
      const res = await api.delete('/auth/delete');
      if (res.success) {
        alert('Tài khoản của bạn đã được xóa thành công.');
        logout();
      } else {
        alert(res.message || 'Xóa tài khoản thất bại.');
      }
    } catch (err: any) {
      alert(err.message || 'Đã xảy ra lỗi khi xóa tài khoản.');
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

        {/* API key display box */}
        <div className="space-y-2">
          <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider">Your API Key</label>
          <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-900">
            <span className="font-mono text-white text-xs select-all break-all flex-1">
              {user?.apiKey}
            </span>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleCopyKey}
                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
                title="Copy Key"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-red-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 transition"
                title="Regenerate Key"
              >
                <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Roblox Loader Script */}
        <div className="space-y-2">
          <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider">Roblox Loader Script</label>
          <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-900">
            <span className="font-mono text-white text-xs select-all break-all flex-1">
              {displayLoaderScript}
            </span>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleCopyScript}
                disabled={isCopyingScript}
                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition disabled:opacity-50"
                title="Copy Script (Generates dynamic token)"
              >
                {scriptCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
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



      {/* Change Credentials Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Change Email Panel */}
        <div className="glass-panel p-6 border border-gold/10 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-gold" /> Thay đổi Email (Gmail)
          </h3>
          <p className="text-slate-400 text-xs">
            Cập nhật địa chỉ email mới. Cần nhập mật khẩu hiện tại để xác minh danh tính.
          </p>

          {emailError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{emailError}</span>
            </div>
          )}

          {emailSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{emailSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider">Email mới</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new-email@domain.com"
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-gold focus:ring-1 focus:ring-gold rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider">Mật khẩu hiện tại</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-gold focus:ring-1 focus:ring-gold rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="w-full py-2.5 rounded-xl font-extrabold text-xs text-ocean-abyss bg-gold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {emailLoading ? (
                <div className="w-4 h-4 border-2 border-ocean-abyss border-t-transparent rounded-full animate-spin" />
              ) : (
                'CẬP NHẬT EMAIL'
              )}
            </button>
          </form>
        </div>

        {/* Change Password Panel */}
        <div className="glass-panel p-6 border border-gold/10 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-gold" /> Thay đổi Mật khẩu
          </h3>
          <p className="text-slate-400 text-xs">
            Cập nhật mật khẩu tài khoản của bạn. Vui lòng ghi nhớ mật khẩu mới của bạn.
          </p>

          {passwordError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider">Mật khẩu hiện tại</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-gold focus:ring-1 focus:ring-gold rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider">Mật khẩu mới</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-gold focus:ring-1 focus:ring-gold rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-gold focus:ring-1 focus:ring-gold rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-2.5 rounded-xl font-extrabold text-xs text-ocean-abyss bg-gold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {passwordLoading ? (
                <div className="w-4 h-4 border-2 border-ocean-abyss border-t-transparent rounded-full animate-spin" />
              ) : (
                'CẬP NHẬT MẬT KHẨU'
              )}
            </button>
          </form>
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
          onClick={handleDeleteAccount}
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
    </div>
  );
};
