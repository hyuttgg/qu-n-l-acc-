import React, { useState } from 'react';
import { useApp } from '../store';
import { Settings, Key, RefreshCw, Copy, Check, ShieldCheck, Mail, User } from 'lucide-react';
import { api } from '../utils/api';

export const SettingsPage: React.FC = () => {
  const { user, regenerateApiKey } = useApp();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [isCopyingScript, setIsCopyingScript] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://quan-ly-acc-viet-nam.onrender.com';
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
            <li>On the in-game GUI, paste your **API Key** when prompted to connect and start syncing.</li>
          </ol>
        </div>
      </div>

      {/* User profile details panel */}
      <div className="glass-panel p-6 space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-ocean-cyan" /> User Profile Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                disabled
                value={user?.username || ''}
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-10 pr-4 text-slate-500 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase font-extrabold tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-950/60 border border-slate-900 rounded-xl py-3 pl-10 pr-4 text-slate-500 text-sm cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
