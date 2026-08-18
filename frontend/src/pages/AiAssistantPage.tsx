import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Code,
  Gamepad2,
  Database,
  Sparkles,
  RefreshCw,
  Cpu,
  User as UserIcon,
  MessageSquare,
  ChevronRight,
  Terminal
} from 'lucide-react';
import { useApp } from '../store';

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp?: string;
}

interface Conversation {
  _id: string;
  title: string;
  preset: 'general' | 'coding' | 'roblox' | 'oceanforge';
  modelName?: string;
  updatedAt: string;
  messages?: Message[];
}

export const AiAssistantPage: React.FC = () => {
  const { user } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [activePreset, setActivePreset] = useState<'general' | 'coding' | 'roblox' | 'oceanforge'>('general');
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiUrl = (import.meta.env.VITE_API_URL || 'https://quan-ly-acc-viet-nam.onrender.com').trim().replace(/\/+$/, '');

  const getAuthHeader = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('oceanforge_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  // Fetch all conversation threads on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/chat/conversations`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (data.success && data.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('Fetch conversations failed:', err);
    }
  };

  const loadConversation = async (convId: string) => {
    setFetchingHistory(true);
    setActiveConvId(convId);
    try {
      const res = await fetch(`${apiUrl}/api/chat/conversations/${convId}`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (data.success && data.conversation) {
        setMessages(data.conversation.messages || []);
        if (data.conversation.preset) {
          setActivePreset(data.conversation.preset);
        }
      }
    } catch (err) {
      console.error('Load conversation failed:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  const startNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInputMessage('');
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: textToSend, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          message: textToSend,
          conversationId: activeConvId || undefined,
          preset: activePreset,
          modelName: 'gemini-2.5-flash',
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        const aiMsg: Message = { role: 'model', content: data.message, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, aiMsg]);
        
        if (data.conversationId && !activeConvId) {
          setActiveConvId(data.conversationId);
        }
        fetchConversations();
      } else {
        const errorMsg: Message = { role: 'model', content: `⚠️ Lỗi: ${data.message || 'Không thể tạo phản hồi từ AI.'}` };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: Message = { role: 'model', content: `⚠️ Lỗi kết nối: ${err.message || 'Vui lòng kiểm tra lại mạng.'}` };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${apiUrl}/api/chat/conversations/${convId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      setConversations(prev => prev.filter(c => c._id !== convId));
      if (activeConvId === convId) {
        startNewChat();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleRenameTitle = async (convId: string) => {
    if (!editTitleText.trim()) return;
    try {
      const res = await fetch(`${apiUrl}/api/chat/conversations/${convId}`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify({ title: editTitleText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setConversations(prev => prev.map(c => c._id === convId ? { ...c, title: editTitleText.trim() } : c));
      }
    } catch (err) {
      console.error('Rename failed:', err);
    } finally {
      setEditingTitleId(null);
      setEditTitleText('');
    }
  };

  const copyToClipboard = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIndex(idKey);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Helper to parse code blocks in AI markdown output
  const renderFormattedContent = (content: string, msgIndex: number) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const language = lines[0].trim() || 'code';
        const codeText = lines.slice(1).join('\n') || lines.join('\n');
        const codeId = `${msgIndex}-${index}`;

        return (
          <div key={index} className="my-3 rounded-xl overflow-hidden border border-cyan-500/30 bg-slate-950/80 shadow-lg">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-cyan-500/20 text-xs font-mono text-cyan-300">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" /> {language}
              </span>
              <button
                onClick={() => copyToClipboard(codeText, codeId)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors border border-cyan-500/20 text-[11px]"
              >
                {copiedCodeIndex === codeId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed whitespace-pre-wrap">
              <code>{codeText}</code>
            </pre>
          </div>
        );
      }

      // Regular text formatting (simple bold & newlines)
      return (
        <span key={index} className="whitespace-pre-wrap leading-relaxed">
          {part}
        </span>
      );
    });
  };

  const presetConfig = {
    general: { title: 'General AI', icon: Sparkles, color: 'text-cyan-400', badgeBg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' },
    coding: { title: 'Coding Architect', icon: Code, color: 'text-indigo-400', badgeBg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' },
    roblox: { title: 'Roblox Lua', icon: Gamepad2, color: 'text-amber-400', badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
    oceanforge: { title: 'OceanForge System', icon: Database, color: 'text-emerald-400', badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
  };

  const quickPrompts = [
    { text: '📊 Thống kê trạng thái tài khoản thời gian thực', preset: 'oceanforge' as const },
    { text: '🎮 Viết script Luau Auto Farm Blox Fruits', preset: 'roblox' as const },
    { text: '💻 Hướng dẫn tối ưu Express API & MongoDB', preset: 'coding' as const },
    { text: '⚡ Giải thích cơ chế JWT Authentication', preset: 'general' as const },
  ];

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col md:flex-row gap-4 overflow-hidden">
      {/* ── Left Sidebar: Conversations & Presets ── */}
      <aside className="w-full md:w-80 liquid-glass flex flex-col overflow-hidden rounded-3xl flex-shrink-0">
        {/* Top Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-400/30">
              <Bot className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <h3 className="font-extrabold text-sm text-gradient-cyan uppercase tracking-wider">
              AI ASSISTANT
            </h3>
          </div>
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Preset Selector */}
        <div className="p-3 border-b border-white/10 bg-black/20">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2 px-1">
            CHỌN CHẾ ĐỘ TRỢ LÝ (PRESET)
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(presetConfig) as (keyof typeof presetConfig)[]).map((key) => {
              const cfg = presetConfig[key];
              const Icon = cfg.icon;
              const isSelected = activePreset === key;
              return (
                <button
                  key={key}
                  onClick={() => setActivePreset(key)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? `${cfg.badgeBg} shadow-[0_0_12px_rgba(6,182,212,0.25)]`
                      : 'border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  <span className="truncate">{cfg.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-1.5">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-2 px-1">
            LỊCH SỬ CUỘC TRÒ CHUYỆN ({conversations.length})
          </span>

          {conversations.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <span>Chưa có cuộc trò chuyện nào</span>
            </div>
          ) : (
            conversations.map((c) => {
              const isSelected = activeConvId === c._id;
              const cfg = presetConfig[c.preset] || presetConfig.general;
              const Icon = cfg.icon;
              const isEditing = editingTitleId === c._id;

              return (
                <div
                  key={c._id}
                  onClick={() => loadConversation(c._id)}
                  className={`group flex items-center justify-between p-2.5 rounded-2xl border text-xs font-medium cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200 shadow-md'
                      : 'border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitleText}
                        onChange={(e) => setEditTitleText(e.target.value)}
                        onBlur={() => handleRenameTitle(c._id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameTitle(c._id)}
                        className="bg-slate-900 border border-cyan-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate font-semibold">{c.title}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTitleId(c._id);
                        setEditTitleText(c.title);
                      }}
                      className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/20 rounded-lg"
                      title="Đổi tên"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => deleteConversation(c._id, e)}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg"
                      title="Xóa"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Main Chat Body ── */}
      <main className="flex-1 liquid-glass rounded-3xl flex flex-col overflow-hidden relative">
        {/* Chat Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white tracking-wide">
                  {presetConfig[activePreset].title}
                </h3>
                <span className="liquid-pill text-[10px] py-0.5 border-cyan-500/40 text-cyan-300">
                  <Cpu className="w-3 h-3 text-cyan-400" /> Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Google GenAI Official SDK Integration</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startNewChat}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Làm sạch cuộc trò chuyện"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          </div>
        </div>

        {/* Message History Window */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
          {fetchingHistory ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider">Loading Conversation History...</span>
            </div>
          ) : messages.length === 0 ? (
            /* Welcome / Starter View */
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center px-4 py-8">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                <Bot className="w-10 h-10 text-cyan-300 animate-bounce" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white mb-2 tracking-wide">
                Xin chào, <span className="text-gradient-cyan">{user?.username || 'Captain'}</span>!
              </h2>
              <p className="text-xs md:text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
                Tôi là Trợ lý AI của hệ thống <span className="text-cyan-300 font-semibold">OceanForge</span>. Tôi có thể hỗ trợ bạn lập trình Node.js/React, viết script Roblox Luau, hoặc phân tích dữ liệu kho tài khoản MongoDB.
              </p>

              {/* Quick Prompts */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {quickPrompts.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActivePreset(q.preset);
                      handleSendMessage(q.text);
                    }}
                    className="p-3.5 rounded-2xl liquid-glass border border-cyan-500/20 hover:border-cyan-400/50 hover:bg-cyan-500/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                  >
                    <span>{q.text}</span>
                    <ChevronRight className="w-4 h-4 text-cyan-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 max-w-4xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 flex-shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`p-4 rounded-2xl text-xs md:text-sm shadow-lg max-w-[85%] ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-400/40 text-white rounded-tr-none'
                        : 'liquid-glass border border-white/10 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-white/10 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>{isUser ? user?.username || 'You' : 'OceanForge AI'}</span>
                      {msg.timestamp && <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                    <div>{renderFormattedContent(msg.content, index)}</div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-xs shadow-md">
                      {user?.username?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4" />}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}

          {/* Loading Indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 mr-auto justify-start max-w-xl"
            >
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 flex-shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl liquid-glass border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 rounded-tl-none">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span className="font-semibold">AI Assistant đang suy nghĩ và xử lý phản hồi...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/10 bg-black/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Nhập câu hỏi cho ${presetConfig[activePreset].title}... (Shift + Enter để xuống dòng)`}
                rows={1}
                className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-4 py-3 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/60 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                !inputMessage.trim() || loading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border border-cyan-300/40 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              }`}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Gửi</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AiAssistantPage;
