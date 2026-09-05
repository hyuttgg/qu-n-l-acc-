import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../store';
import { api } from '../utils/api';
import {
  cookieSplitter,
  type ParsedCookieItem,
  type SplitterStats,
  type OutputFormat,
  type ParseOptions
} from '../services/cookieSplitterService';
import { csharpWasm } from '../services/csharpWasmService';
import {
  Scissors,
  Copy,
  Check,
  Download,
  Upload,
  Sparkles,
  Trash2,
  Filter,
  Layers,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  FileCode,
  KeyRound,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  RefreshCw,
  Zap,
  Database,
  Terminal,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { WasmStatusBadge } from '../components/WasmStatusBadge';

export const CookieSplitterPage: React.FC = () => {
  const { fetchAccounts } = useApp();

  // Input & Parsing States
  const [rawInput, setRawInput] = useState<string>('');
  const [delimiter, setDelimiter] = useState<ParseOptions['delimiter']>('auto');
  const [removeDuplicates, setRemoveDuplicates] = useState<boolean>(true);
  const [filterValidOnly, setFilterValidOnly] = useState<boolean>(false);
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('PURE_COOKIE');

  // Interactive Table Filter & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'WARNING' | 'INVALID'>('ALL');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Pagination States
  const [cookiePage, setCookiePage] = useState<number>(1);
  const [cookiePageSize, setCookiePageSize] = useState<number>(30);

  // Feedback & Copy States
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedItemIndex, setCopiedItemIndex] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isImportingFleet, setIsImportingFleet] = useState<boolean>(false);
  const [executionDuration, setExecutionDuration] = useState<string>('< 0.05');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Perform Parsing whenever input or options change
  const parseResult = useMemo(() => {
    const t0 = performance.now();
    const result = cookieSplitter.parse(rawInput, {
      delimiter,
      removeDuplicates,
      filterValidOnly,
    });
    const t1 = performance.now();
    setExecutionDuration((t1 - t0).toFixed(2));
    return result;
  }, [rawInput, delimiter, removeDuplicates, filterValidOnly]);

  const { items, stats } = parseResult;

  // Filtered items for display in table
  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (statusFilter === 'VALID' && item.validationStatus !== 'VALID') return false;
      if (statusFilter === 'WARNING' && item.validationStatus !== 'WARNING_NO_HEADER') return false;
      if (statusFilter === 'INVALID' && item.isValid) return false;

      // Search query
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesUser = item.username.toLowerCase().includes(query);
        const matchesCookie = item.cleanCookie.toLowerCase().includes(query);
        const matchesPass = item.password?.toLowerCase().includes(query);
        return matchesUser || matchesCookie || matchesPass;
      }
      return true;
    });
  }, [items, statusFilter, searchTerm]);

  // Reset pagination on filter or input change
  useEffect(() => {
    setCookiePage(1);
  }, [searchTerm, statusFilter, rawInput, cookiePageSize]);

  const totalCookiePages = Math.max(1, Math.ceil(displayedItems.length / cookiePageSize));
  const safeCookiePage = Math.min(cookiePage, totalCookiePages);

  const paginatedCookieItems = useMemo(() => {
    const start = (safeCookiePage - 1) * cookiePageSize;
    return displayedItems.slice(start, start + cookiePageSize);
  }, [displayedItems, safeCookiePage, cookiePageSize]);

  // Formatted output text
  const formattedOutput = useMemo(() => {
    return cookieSplitter.formatOutput(items, selectedFormat);
  }, [items, selectedFormat]);

  // Load rich sample dump
  const handleLoadSample = () => {
    const sample = cookieSplitter.getSampleDump();
    setRawInput(sample);
    showToast('Đã nạp dữ liệu mẫu hỗn hợp!', 'info');
  };

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawInput(text);
        showToast('Đã dán dữ liệu từ Clipboard!', 'success');
      } else {
        showToast('Clipboard trống!', 'error');
      }
    } catch (err) {
      showToast('Không thể đọc Clipboard (Vui lòng cấp quyền)', 'error');
    }
  };

  // File Upload (.txt, .csv, .json, .log)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawInput(content);
        showToast(`Đã tải lên tệp: ${file.name} (${Math.round(file.size / 1024)} KB)`, 'success');
      }
    };
    reader.onerror = () => {
      showToast('Không thể đọc tệp tin!', 'error');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Copy Entire Output
  const handleCopyOutput = () => {
    if (!formattedOutput) {
      showToast('Chưa có dữ liệu để sao chép!', 'error');
      return;
    }
    navigator.clipboard.writeText(formattedOutput);
    setCopiedAll(true);
    showToast(`Đã sao chép ${items.length} mục dạng ${selectedFormat}!`, 'success');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Download Output file
  const handleDownloadOutput = () => {
    if (!formattedOutput) {
      showToast('Chưa có dữ liệu để tải xuống!', 'error');
      return;
    }

    let extension = 'txt';
    let mime = 'text/plain';

    if (selectedFormat === 'JSON_ARRAY') {
      extension = 'json';
      mime = 'application/json';
    } else if (selectedFormat === 'CSV_FORMAT') {
      extension = 'csv';
      mime = 'text/csv';
    } else if (selectedFormat === 'PYTHON_LIST') {
      extension = 'py';
      mime = 'text/x-python';
    } else if (selectedFormat === 'LUA_TABLE') {
      extension = 'lua';
      mime = 'text/x-lua';
    }

    const blob = new Blob([formattedOutput], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roblox_extracted_cookies_${new Date().toISOString().slice(0, 10)}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Đã lưu tệp ${a.download}`, 'success');
  };

  // Copy single item
  const handleCopySingle = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItemIndex(id);
    showToast('Đã sao chép vào bộ nhớ đệm!', 'success');
    setTimeout(() => setCopiedItemIndex(null), 1500);
  };

  // Toggle Password visibility
  const toggleShowPassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Batch Import into Fleet
  const handleImportToFleet = async () => {
    const validItems = items.filter((i) => i.isValid);
    if (validItems.length === 0) {
      showToast('Không có cookie hợp lệ nào để nạp vào Fleet!', 'error');
      return;
    }

    setIsImportingFleet(true);
    try {
      const payload = validItems.map((item) => ({
        username: item.username || `Fleet_${item.id.slice(-4)}`,
        password: item.password || '',
        cookie: item.cleanCookie,
      }));

      const res = await api.post('/tools/cookie-splitter/import-fleet', { accounts: payload });
      if (res.success) {
        showToast(res.message || `Đã nạp thành công ${validItems.length} tài khoản vào Fleet!`, 'success');
        fetchAccounts(); // refresh fleet store
      } else {
        showToast(res.message || 'Lỗi khi nạp vào Fleet', 'error');
      }
    } catch (err: any) {
      showToast('Lỗi máy chủ: ' + err.message, 'error');
    } finally {
      setIsImportingFleet(false);
    }
  };

  const formatOptions: { key: OutputFormat; label: string; icon: React.ComponentType<any>; badge?: string }[] = [
    { key: 'PURE_COOKIE', label: 'Chỉ Cookie Thô', icon: Scissors, badge: 'Phổ biến' },
    { key: 'COOKIE_WITH_PREFIX', label: '.ROBLOSECURITY=', icon: KeyRound },
    { key: 'USER_PASS_COOKIE', label: 'User:Pass:Cookie', icon: Layers },
    { key: 'USER_COOKIE', label: 'User:Cookie', icon: ShieldCheck },
    { key: 'JSON_ARRAY', label: 'JSON Array', icon: FileCode },
    { key: 'PYTHON_LIST', label: 'Python Code', icon: Terminal },
    { key: 'LUA_TABLE', label: 'Lua Table', icon: Terminal },
    { key: 'NETSCAPE_HTTP', label: 'Netscape Cookies', icon: Database },
    { key: 'CSV_FORMAT', label: 'Bảng CSV / Excel', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all animate-bounce-short ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/85 border-emerald-500/40 text-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/85 border-rose-500/40 text-rose-200'
              : 'bg-cyan-950/85 border-cyan-500/40 text-cyan-200'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toastMessage.type === 'info' && <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.2)]">
              <Scissors className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white glow-text-cyan flex items-center gap-2">
                ROBLOX COOKIE SPLITTER
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5">
                Trích xuất, bóc tách combo User:Pass:Cookie, lọc trùng lặp và chuyển đổi 9 định dạng siêu tốc.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <WasmStatusBadge />
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-700/60 text-slate-300 text-xs font-mono flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Tốc độ: <b className="text-cyan-300">{executionDuration}ms</b></span>
          </div>
        </div>
      </div>

      {/* Real-time Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="glass-panel p-4 border-t-2 border-t-cyan-500 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tổng dòng nhập</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{stats.totalLines}</span>
            <span className="text-slate-400 text-xs">dòng</span>
          </div>
        </div>

        <div className="glass-panel p-4 border-t-2 border-t-blue-500 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Cookie tìm thấy</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-black text-cyan-300">{stats.totalFound}</span>
            <span className="text-slate-400 text-xs">tokens</span>
          </div>
        </div>

        <div className="glass-panel p-4 border-t-2 border-t-emerald-500 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Chuẩn hợp lệ</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-400">{stats.validCount}</span>
            <span className="text-slate-400 text-xs">accs</span>
          </div>
        </div>

        <div className="glass-panel p-4 border-t-2 border-t-amber-500 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Thiếu Header</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-400">{stats.warningCount}</span>
            <span className="text-slate-400 text-xs">cảnh báo</span>
          </div>
        </div>

        <div className="glass-panel p-4 border-t-2 border-t-purple-500 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Đã lọc trùng</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-black text-purple-400">{stats.duplicateCount}</span>
            <span className="text-slate-400 text-xs">bị loại</span>
          </div>
        </div>

        <div className="glass-panel p-4 border-t-2 border-t-rose-500 flex flex-col justify-between hover:scale-[1.02] transition-transform">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Combo Acc:Pass</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-black text-rose-300">{stats.combosCount}</span>
            <span className="text-slate-400 text-xs">combos</span>
          </div>
        </div>
      </div>

      {/* Main Dual Workspace: Input Panel (Left) & Output / Converter Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Textarea & Controls (5 Cols) */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <div className="liquid-glass p-5 flex flex-col flex-1 border border-white/10 space-y-4">
            {/* Input Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Dữ liệu thô đầu vào
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-mono">
                  {rawInput.split(/\r?\n/).filter(Boolean).length} dòng
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Dán từ Clipboard"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" /> Dán
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Tải tệp .txt / .csv / .json"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" /> Tệp
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.json,.log"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-amber-500/30"
                  title="Nạp dữ liệu mẫu thử nghiệm"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Mẫu
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRawInput('');
                    showToast('Đã xóa dữ liệu', 'info');
                  }}
                  className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 text-xs transition-colors"
                  title="Xóa trắng"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Delimiter & Options bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">Dấu phân cách:</span>
                <select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:border-cyan-400 outline-none"
                >
                  <option value="auto">Tự động nhận diện</option>
                  <option value=":">Dấu hai chấm ( : )</option>
                  <option value="|">Dấu gạch đứng ( | )</option>
                  <option value=";">Dấu chấm phẩy ( ; )</option>
                  <option value=",">Dấu phẩy ( , )</option>
                  <option value="&#9;">Tab</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={removeDuplicates}
                    onChange={(e) => setRemoveDuplicates(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Lọc trùng lặp</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={filterValidOnly}
                    onChange={(e) => setFilterValidOnly(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Chỉ cookie hợp lệ</span>
                </label>
              </div>
            </div>

            {/* Textarea Input */}
            <div className="relative flex-1 min-h-[360px]">
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={`Dán danh sách tài khoản hoặc cookies vào đây...\n\nHỗ trợ các định dạng:\n1. user:pass:cookie hoặc user|pass|cookie\n2. .ROBLOSECURITY=_|WARNING:-DO-NOT-SHARE-THIS...\n3. Netscape cookies, JSON array, cURL request\n4. Chuỗi văn bản hỗn hợp bất kỳ...`}
                className="w-full h-full min-h-[360px] p-4 bg-[#090d1f]/90 border border-white/10 rounded-2xl text-slate-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-400/80 resize-y selection:bg-cyan-500/30"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Right: Output Converter & Formats (6 Cols) */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <div className="liquid-glass p-5 flex flex-col flex-1 border border-white/10 space-y-4">
            {/* Output Format Tabs */}
            <div className="flex flex-col space-y-2 border-b border-white/10 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Bộ định dạng xuất ({items.length} kết quả)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyOutput}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg ${
                      copiedAll
                        ? 'bg-emerald-500 text-slate-950 scale-105'
                        : 'liquid-btn-primary'
                    }`}
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedAll ? 'Đã chép!' : 'Chép toàn bộ'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadOutput}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/10"
                    title="Tải về file"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" /> Tải về
                  </button>
                </div>
              </div>

              {/* Format selection pills */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {formatOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedFormat === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedFormat(opt.key)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20 scale-[1.02]'
                          : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                      {opt.badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
                          {opt.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formatted Output Box */}
            <div className="relative flex-1 min-h-[300px]">
              <textarea
                readOnly
                value={formattedOutput}
                placeholder="Kết quả sau khi tách sẽ xuất hiện tại đây..."
                className="w-full h-full min-h-[300px] p-4 bg-[#090d1f]/90 border border-emerald-500/20 rounded-2xl text-emerald-300 font-mono text-xs leading-relaxed focus:outline-none focus:border-emerald-400 resize-y selection:bg-emerald-500/30"
                spellCheck={false}
              />
            </div>

            {/* Quick Fleet Batch Import Banner */}
            <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-blue-950/60 p-4 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Nạp trực tiếp vào Quản Lý Fleet</h4>
                  <p className="text-xs text-slate-400">
                    Thêm {items.filter((i) => i.isValid).length} tài khoản hợp lệ vào danh sách Dashboard ngay lập tức.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleImportToFleet}
                disabled={isImportingFleet || items.filter((i) => i.isValid).length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                {isImportingFleet ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 text-slate-950" />
                )}
                {isImportingFleet ? 'Đang nạp Fleet...' : 'Nạp Vào Fleet Ngay'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Extracted Accounts Interactive Table / Card Explorer */}
      <div className="liquid-glass p-6 border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                BẢNG CHI TIẾT TÀI KHOẢN ĐÃ TÁCH
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {displayedItems.length} / {items.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Kiểm tra chi tiết từng token, sao chép hoặc kiểm tra tính hợp lệ</p>
            </div>
          </div>

          {/* Search & Filter pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm Username / Cookie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-48 lg:w-64"
              />
            </div>

            <div className="flex items-center bg-slate-900/90 rounded-xl p-1 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  statusFilter === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tất cả ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('VALID')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  statusFilter === 'VALID' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Hợp lệ ({stats.validCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('WARNING')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  statusFilter === 'WARNING' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cảnh báo ({stats.warningCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('INVALID')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  statusFilter === 'INVALID' ? 'bg-rose-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Lỗi ({stats.invalidCount})
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {displayedItems.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
            <Scissors className="w-10 h-10 text-slate-600 mb-3 animate-pulse" />
            <p className="font-semibold text-sm">Chưa có dữ liệu nào được phân tách</p>
            <p className="text-xs text-slate-500 mt-1">
              Hãy dán danh sách tài khoản hoặc bấm &quot;Mẫu&quot; để thử nghiệm.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider bg-slate-900/40">
                  <th className="py-3 px-3">STT</th>
                  <th className="py-3 px-3">Tài khoản (Username)</th>
                  <th className="py-3 px-3">Mật khẩu (Password)</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3">Độ dài</th>
                  <th className="py-3 px-3">Mã Cookie (.ROBLOSECURITY)</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedCookieItems.map((item, indexInPage) => {
                  const idx = (safeCookiePage - 1) * cookiePageSize + indexInPage;
                  const isPassVisible = showPasswords[item.id] || false;
                  const isCopied = copiedItemIndex === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 px-3 text-slate-500 font-mono font-bold">{idx + 1}</td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                            {item.username.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="font-semibold text-white">{item.username || '(Chưa đặt)'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {item.password ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-slate-300">
                              {isPassVisible ? item.password : '••••••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleShowPassword(item.id)}
                              className="text-slate-400 hover:text-white transition-colors"
                              title={isPassVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                              {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">Không có</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {item.validationStatus === 'VALID' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                          </span>
                        )}
                        {item.validationStatus === 'WARNING_NO_HEADER' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px]">
                            <AlertTriangle className="w-3 h-3" /> Thiếu Header
                          </span>
                        )}
                        {(item.validationStatus === 'INVALID_TOO_SHORT' ||
                          item.validationStatus === 'INVALID_FORMAT') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-[11px]">
                            <XCircle className="w-3 h-3" /> Lỗi định dạng
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-400 font-mono">{item.length} ký tự</td>

                      <td className="py-3 px-3 max-w-[280px]">
                        <div className="flex items-center gap-2">
                          <code className="text-[11px] font-mono text-cyan-300/80 truncate block max-w-[200px] bg-slate-900/80 px-2 py-0.5 rounded border border-white/5">
                            {item.cleanCookie}
                          </code>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopySingle(item.cleanCookie, item.id)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                              isCopied
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
                            }`}
                            title="Sao chép Cookie"
                          >
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {isCopied ? 'Đã chép' : 'Chép Cookie'}
                          </button>

                          {item.username && item.password && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopySingle(`${item.username}:${item.password}:${item.cleanCookie}`, item.id)
                              }
                              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              title="Sao chép User:Pass:Cookie"
                            >
                              Combo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                Hiển thị{' '}
                <strong className="text-white">
                  {displayedItems.length === 0 ? 0 : (safeCookiePage - 1) * cookiePageSize + 1}
                </strong>{' '}
                -{' '}
                <strong className="text-white">
                  {Math.min(safeCookiePage * cookiePageSize, displayedItems.length)}
                </strong>{' '}
                trên <strong className="text-cyan-300">{displayedItems.length}</strong> kết quả
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-slate-500">Mỗi trang:</span>
                <select
                  value={cookiePageSize}
                  onChange={(e) => {
                    setCookiePageSize(Number(e.target.value));
                    setCookiePage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Page Buttons */}
            {totalCookiePages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCookiePage((p) => Math.max(1, p - 1))}
                  disabled={safeCookiePage <= 1}
                  className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalCookiePages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalCookiePages || Math.abs(p - safeCookiePage) <= 1)
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
                    const isCurrent = p === safeCookiePage;
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setCookiePage(Number(p))}
                        className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isCurrent
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                            : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                <button
                  type="button"
                  onClick={() => setCookiePage((p) => Math.min(totalCookiePages, p + 1))}
                  disabled={safeCookiePage >= totalCookiePages}
                  className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CookieSplitterPage;
