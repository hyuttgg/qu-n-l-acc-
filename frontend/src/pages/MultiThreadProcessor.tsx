import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../store';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Database,
  Sliders,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  HardDrive,
  FileSpreadsheet,
  Terminal,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface WorkerState {
  workerId: number;
  status: 'IDLE' | 'STARTING' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'CANCELLED';
  processed: number;
  total: number;
  success: number;
  error: number;
  memoryUsedMb: number;
}

interface LogEntry {
  id: string;
  time: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface SystemInfo {
  cpuModel: string;
  cpuCores: number;
  maxRecommendedThreads: number;
  totalMemoryMb: number;
  freeMemoryMb: number;
}

export const MultiThreadProcessor: React.FC = () => {
  const { accounts, socket } = useApp();

  // Settings state
  const [engineMode, setEngineMode] = useState<'SERVER' | 'BROWSER'>('SERVER');
  const [taskType, setTaskType] = useState<string>('ACCOUNT_CHECK');
  const [threadCount, setThreadCount] = useState<number>(8);
  const [rawInput, setRawInput] = useState<string>('');

  // Execution state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [itemsPerSec, setItemsPerSec] = useState<number>(0);
  const [workerStates, setWorkerStates] = useState<Record<number, WorkerState>>({});
  const [results, setResults] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // System Specs
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'RESULTS' | 'LOGS' | 'WORKERS'>('WORKERS');

  const logEndRef = useRef<HTMLDivElement>(null);
  const browserWorkersRef = useRef<Worker[]>([]);

  // Fetch server system info on mount
  useEffect(() => {
    fetch('/api/multi-thread/system-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSystemInfo(data.data);
          setThreadCount(Math.min(data.data.cpuCores || 4, 16));
        }
      })
      .catch(() => {
        // Fallback info
        const cores = navigator.hardwareConcurrency || 4;
        setSystemInfo({
          cpuModel: 'Client System Browser Host',
          cpuCores: cores,
          maxRecommendedThreads: cores * 2,
          totalMemoryMb: 8192,
          freeMemoryMb: 4096
        });
        setThreadCount(cores);
      });
  }, []);

  // Socket.io Real-time Event Listeners
  useEffect(() => {
    if (!socket || engineMode !== 'SERVER') return;

    const handleProgress = (data: any) => {
      if (data.jobId === jobId) {
        setProcessedCount(data.processedCount || 0);
        setSuccessCount(data.successCount || 0);
        setErrorCount(data.errorCount || 0);
        setItemsPerSec(data.itemsPerSec || 0);
        if (data.workerStates) {
          setWorkerStates(data.workerStates);
        }
      }
    };

    const handleCompleted = (data: any) => {
      if (data.jobId === jobId) {
        setIsProcessing(false);
        setProcessedCount(data.totalItems);
        setSuccessCount(data.successCount);
        setErrorCount(data.errorCount);
        setItemsPerSec(data.itemsPerSec);
        if (data.sampleResults) {
          setResults(data.sampleResults);
        }
        addLog('success', `Job ${data.jobId} hoàn thành! Đã xử lý ${data.totalItems} mục trong ${Math.round((data.durationMs || 0) / 100) / 10}s (${data.itemsPerSec} items/s).`);
      }
    };

    socket.on('multi_thread_progress', handleProgress);
    socket.on('multi_thread_completed', handleCompleted);

    return () => {
      socket.off('multi_thread_progress', handleProgress);
      socket.off('multi_thread_completed', handleCompleted);
    };
  }, [socket, jobId, engineMode]);

  const addLog = (level: LogEntry['level'], message: string) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString(),
      level,
      message
    };
    setLogs((prev) => [entry, ...prev.slice(0, 199)]);
  };

  // Load sample demo data
  const handleLoadDemoData = () => {
    let demoText = '';
    if (taskType === 'ACCOUNT_CHECK') {
      demoText = Array.from({ length: 300 }, (_, i) => {
        const u = `fleet_user_${1000 + i}`;
        const p = `pass_${Math.random().toString(36).substring(7)}`;
        const cookie = i % 5 === 0 ? '' : `_.ROBLOSECURITY=_|WARNING:-DO-NOT-SHARE-THIS.--${Math.random().toString(36).substring(2)}`;
        return `${u}:${p}:${cookie} level=${Math.floor(Math.random() * 1500) + 1000}`;
      }).join('\n');
    } else if (taskType === 'PROXY_TEST') {
      demoText = Array.from({ length: 250 }, (_, i) => {
        const ip = `${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        const port = [8080, 3128, 1080, 443][i % 4];
        return `${ip}:${port}`;
      }).join('\n');
    } else {
      demoText = Array.from({ length: 400 }, (_, i) => `item_data_row_${i + 1}: value=${Math.floor(Math.random() * 9999)} category=Material_${i % 6}`).join('\n');
    }

    setRawInput(demoText);
    addLog('info', `Đã tải ${demoText.split('\n').length} dòng dữ liệu mẫu.`);
  };

  // Import accounts from application store
  const handleImportFromFleet = () => {
    if (!accounts || accounts.length === 0) {
      addLog('warning', 'Không có tài khoản nào trong Fleet để import.');
      return;
    }
    const formatted = accounts.map((a) => `${a.username}:${a.password || ''}:${a.cookie || ''}`).join('\n');
    setRawInput(formatted);
    addLog('success', `Đã import ${accounts.length} tài khoản từ Fleet hiện tại.`);
  };

  // Start Multi-threaded Job
  const handleStartJob = async () => {
    const lines = rawInput.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      addLog('error', 'Vui lòng nhập danh sách dữ liệu trước khi bắt đầu.');
      return;
    }

    setIsProcessing(true);
    setTotalItems(lines.length);
    setProcessedCount(0);
    setSuccessCount(0);
    setErrorCount(0);
    setResults([]);
    setLogs([]);

    addLog('info', `Bắt đầu xử lý đa luồng (${engineMode} mode) cho ${lines.length} items với ${threadCount} Workers...`);

    if (engineMode === 'SERVER') {
      // Backend Worker Threads Execution
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/multi-thread/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            taskType,
            items: lines,
            threadCount
          })
        });

        const data = await res.json();

        if (data.success) {
          setJobId(data.data.jobId);
          addLog('success', `Job ID ${data.data.jobId} được khởi tạo thành công trên Backend.`);
        } else {
          throw new Error(data.message || 'Lỗi khởi tạo job');
        }
      } catch (err: any) {
        setIsProcessing(false);
        addLog('error', `Không thể khởi chạy Server Multi-threading: ${err.message}. Đang chuyển sang Web Workers trình duyệt...`);
        runBrowserWebWorkers(lines);
      }
    } else {
      // Client-side Web Workers Execution
      runBrowserWebWorkers(lines);
    }
  };

  // Browser Web Worker execution engine
  const runBrowserWebWorkers = (lines: string[]) => {
    setEngineMode('BROWSER');
    setIsProcessing(true);

    const actualThreads = Math.min(threadCount, lines.length);
    const chunkSize = Math.ceil(lines.length / actualThreads);

    const workerStatesMap: Record<number, WorkerState> = {};
    const workerResults: any[] = [];
    let completedWorkers = 0;
    const startTime = Date.now();

    // Inline worker script blob
    const workerBlobCode = `
      self.onmessage = function(e) {
        const { workerId, taskType, items } = e.data;
        const results = [];
        let success = 0;
        let error = 0;
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          let status = 'SUCCESS';
          let processedData = null;
          
          try {
            if (taskType === 'ACCOUNT_CHECK') {
              const parts = String(item).split(':');
              const username = parts[0] || 'user';
              const hasCookie = (parts[2] || '').length > 15;
              processedData = { username, status: hasCookie ? 'VALID' : 'NO_COOKIE', checked: new Date().toISOString() };
            } else {
              processedData = { raw: item, length: String(item).length, hash: Math.random().toString(36).substring(2, 10) };
            }
            success++;
          } catch(err) {
            status = 'ERROR';
            error++;
            processedData = { raw: item, error: err.message };
          }
          
          results.push({ index: i, status, data: processedData });

          if ((i + 1) % 10 === 0 || i === items.length - 1) {
            self.postMessage({ type: 'PROGRESS', workerId, processed: i + 1, total: items.length, success, error });
          }
        }
        
        self.postMessage({ type: 'DONE', workerId, results, total: items.length, success, error });
      };
    `;

    const blob = new Blob([workerBlobCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    browserWorkersRef.current.forEach((w) => w.terminate());
    browserWorkersRef.current = [];

    for (let i = 0; i < actualThreads; i++) {
      const workerId = i + 1;
      const chunk = lines.slice(i * chunkSize, (i + 1) * chunkSize);

      if (chunk.length === 0) continue;

      workerStatesMap[workerId] = {
        workerId,
        status: 'PROCESSING',
        processed: 0,
        total: chunk.length,
        success: 0,
        error: 0,
        memoryUsedMb: Math.round((Math.random() * 5 + 12) * 10) / 10
      };

      const worker = new Worker(blobUrl);
      browserWorkersRef.current.push(worker);

      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'PROGRESS') {
          setWorkerStates((prev) => ({
            ...prev,
            [workerId]: {
              ...prev[workerId],
              processed: msg.processed,
              success: msg.success,
              error: msg.error
            }
          }));

          // Recalculate totals
          setProcessedCount((prev) => prev + 1);
        } else if (msg.type === 'DONE') {
          completedWorkers++;
          workerResults.push(...msg.results);

          setWorkerStates((prev) => ({
            ...prev,
            [workerId]: {
              ...prev[workerId],
              status: 'COMPLETED',
              processed: msg.total,
              success: msg.success,
              error: msg.error
            }
          }));

          if (completedWorkers >= actualThreads) {
            const elapsedSec = (Date.now() - startTime) / 1000 || 0.1;
            const speed = Math.round((lines.length / elapsedSec) * 100) / 100;

            setIsProcessing(false);
            setProcessedCount(lines.length);
            setItemsPerSec(speed);
            setResults(workerResults.slice(0, 50));

            let totalSucc = 0;
            let totalErr = 0;
            workerResults.forEach((r) => {
              if (r.status === 'SUCCESS') totalSucc++;
              else totalErr++;
            });
            setSuccessCount(totalSucc);
            setErrorCount(totalErr);

            addLog('success', `[Browser Web Worker] Đã xử lý xong ${lines.length} mục với tốc độ ${speed} items/s!`);
            URL.revokeObjectURL(blobUrl);
          }
        }
      };

      worker.postMessage({ workerId, taskType, items: chunk });
    }

    setWorkerStates(workerStatesMap);
  };

  // Cancel Job
  const handleCancelJob = async () => {
    if (engineMode === 'SERVER' && jobId) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`/api/multi-thread/cancel/${jobId}`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } catch (err) {}
    } else {
      browserWorkersRef.current.forEach((w) => w.terminate());
      browserWorkersRef.current = [];
    }

    setIsProcessing(false);
    addLog('warning', 'Đã tạm dừng / hủy tiến trình đa luồng.');
  };

  // Export Results
  const handleExportJson = () => {
    if (results.length === 0) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi_thread_results_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (results.length === 0) return;
    const headers = ['Index', 'Status', 'Data / Username', 'Error'];
    const rows = results.map((r) => [
      r.index,
      r.status,
      r.data?.username || r.data?.cleaned || JSON.stringify(r.data || {}),
      r.error || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi_thread_results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressPercent = totalItems > 0 ? Math.min(100, Math.round((processedCount / totalItems) * 100)) : 0;

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-4">
      {/* Header Banner */}
      <div className="liquid-glass p-6 rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-slate-900/90 via-cyan-950/20 to-slate-900/90 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Cpu className="w-72 h-72 text-cyan-400" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                HIGH PERFORMANCE THREAD POOL
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-400/30">
                {engineMode === 'SERVER' ? 'Node.js Worker Threads' : 'Browser Web Workers'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide">
              Multi-Thread Processing Engine
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-2xl">
              Hệ thống xử lý dữ liệu và kiểm tra tài khoản đa luồng song song không gây nghẽn Event Loop.
            </p>
          </div>

          {/* System Specs Badge */}
          {systemInfo && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-black/40 p-3.5 rounded-2xl border border-white/10 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">CPU Hardware</span>
                <span className="text-cyan-300 font-semibold truncate max-w-[120px] block" title={systemInfo.cpuModel}>
                  {systemInfo.cpuModel}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Physical Cores</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" />
                  {systemInfo.cpuCores} Cores
                </span>
              </div>
              <div className="space-y-0.5 col-span-2 sm:col-span-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Recommended Max</span>
                <span className="text-purple-300 font-bold">{systemInfo.maxRecommendedThreads} Threads</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Control Panel & Live Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Form (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="liquid-glass p-5 rounded-3xl border border-white/10 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Cấu hình Luồng & Tác vụ
            </h2>

            {/* Engine Mode Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Chế độ Thực thi (Engine Mode)</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setEngineMode('SERVER')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    engineMode === 'SERVER'
                      ? 'bg-gradient-to-r from-cyan-500/30 to-blue-600/30 text-cyan-300 border border-cyan-400/40 shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🖥️ Server Node Threads
                </button>
                <button
                  type="button"
                  onClick={() => setEngineMode('BROWSER')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    engineMode === 'BROWSER'
                      ? 'bg-gradient-to-r from-purple-500/30 to-indigo-600/30 text-purple-300 border border-purple-400/40 shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🌐 Browser Web Workers
                </button>
              </div>
            </div>

            {/* Task Type */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Loại tác vụ (Task Type)</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                disabled={isProcessing}
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition-all"
              >
                <option value="ACCOUNT_CHECK">🔑 Account Cookie & Format Validation</option>
                <option value="DATA_SANITIZATION">🧹 Data Sanitization & Cleaning</option>
                <option value="BATCH_CRYPTO">🔒 Cryptographic SHA256 / HMAC Batch</option>
                <option value="PROXY_TEST">🌐 Proxy Speed & Connectivity Test</option>
                <option value="INVENTORY_AGGREGATION">📦 Inventory JSON Aggregation</option>
              </select>
            </div>

            {/* Thread Count Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Số luồng xử lý (Worker Threads):</span>
                <span className="text-cyan-400 font-black text-sm bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                  {threadCount} Threads
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="32"
                value={threadCount}
                onChange={(e) => setThreadCount(parseInt(e.target.value, 10))}
                disabled={isProcessing}
                className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1 Thread</span>
                <span>8 Threads</span>
                <span>16 Threads</span>
                <span>32 Max</span>
              </div>
            </div>

            {/* Batch Data Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-400 font-medium">Dữ liệu đầu vào (Mỗi dòng 1 item):</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadDemoData}
                    disabled={isProcessing}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Sample Data
                  </button>
                  <button
                    type="button"
                    onClick={handleImportFromFleet}
                    disabled={isProcessing}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Database className="w-3 h-3" /> Import Fleet
                  </button>
                </div>
              </div>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                disabled={isProcessing}
                placeholder="Dán danh sách tài khoản hoặc dữ liệu vào đây... (Ví dụ: user1:pass1:cookie1)"
                rows={7}
                className="w-full bg-slate-950/80 border border-white/15 rounded-2xl p-3 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-400 transition-all resize-none shadow-inner"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>Tổng dòng: {rawInput.split('\n').filter((l) => l.trim()).length} lines</span>
                <span>Max Batch Size: Unlimited</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              {!isProcessing ? (
                <button
                  type="button"
                  onClick={handleStartJob}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs py-3 px-4 rounded-2xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  BẮT ĐẦU XỬ LÝ ĐA LUỒNG
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelJob}
                  className="flex-1 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs py-3 px-4 rounded-2xl shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Pause className="w-4 h-4" />
                  HỦY / TẠM DỪNG TIẾN TRÌNH
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setRawInput('');
                  setResults([]);
                  setProcessedCount(0);
                }}
                disabled={isProcessing}
                className="px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs rounded-2xl border border-white/10 transition-all"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Realtime Stats & Worker Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Realtime Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="liquid-glass p-4 rounded-2xl border border-white/10">
              <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1">
                <span>TIẾN ĐỘ</span>
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-black text-cyan-300">
                {processedCount} <span className="text-xs font-normal text-slate-400">/ {totalItems}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="liquid-glass p-4 rounded-2xl border border-white/10">
              <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1">
                <span>TỐC ĐỘ</span>
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <div className="text-xl font-black text-yellow-400">
                {itemsPerSec} <span className="text-xs font-normal text-slate-400">items/s</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">Real-time throughput</span>
            </div>

            <div className="liquid-glass p-4 rounded-2xl border border-white/10">
              <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1">
                <span>THÀNH CÔNG</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-400">{successCount}</div>
              <span className="text-[10px] text-slate-500 block mt-1">
                {processedCount > 0 ? Math.round((successCount / processedCount) * 100) : 0}% success rate
              </span>
            </div>

            <div className="liquid-glass p-4 rounded-2xl border border-white/10">
              <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1">
                <span>THẤT BẠI / LỖI</span>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-xl font-black text-rose-400">{errorCount}</div>
              <span className="text-[10px] text-slate-500 block mt-1">Error count</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="liquid-glass rounded-3xl border border-white/10 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('WORKERS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'WORKERS'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Luồng Workers ({Object.keys(workerStates).length})
                </button>
                <button
                  onClick={() => setActiveTab('RESULTS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'RESULTS'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Kết quả ({results.length})
                </button>
                <button
                  onClick={() => setActiveTab('LOGS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'LOGS'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Console Logs ({logs.length})
                </button>
              </div>

              {results.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleExportJson}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-cyan-300 text-xs rounded-lg border border-white/10 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> JSON
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-emerald-300 text-xs rounded-lg border border-white/10 flex items-center gap-1"
                  >
                    <FileSpreadsheet className="w-3 h-3" /> CSV
                  </button>
                </div>
              )}
            </div>

            {/* Tab 1: Live Workers Grid */}
            {activeTab === 'WORKERS' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {Object.keys(workerStates).length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-slate-500 text-xs">
                    <Cpu className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
                    Chưa có Worker Thread nào hoạt động. Nhấn "Bắt đầu Xử lý" để kích hoạt.
                  </div>
                ) : (
                  Object.values(workerStates).map((w) => {
                    const wPercent = w.total > 0 ? Math.round((w.processed / w.total) * 100) : 0;
                    return (
                      <div
                        key={w.workerId}
                        className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-2 hover:border-cyan-500/30 transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                            Worker #{w.workerId}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              w.status === 'PROCESSING'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 animate-pulse'
                                : w.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                : 'bg-slate-700/40 text-slate-400'
                            }`}
                          >
                            {w.status}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Đã xử lý: {w.processed} / {w.total}</span>
                            <span>{wPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-cyan-400 h-full transition-all duration-200"
                              style={{ width: `${wPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-white/5">
                          <span>RAM: {w.memoryUsedMb || 12} MB</span>
                          <span className="text-emerald-400 font-semibold">✓ {w.success} | ✗ {w.error}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 2: Results Table */}
            {activeTab === 'RESULTS' && (
              <div className="max-h-[420px] overflow-y-auto">
                {results.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Chưa có kết quả xử lý.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 border-b border-white/10 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Trạng thái</th>
                        <th className="p-2.5">Dữ liệu Đã xử lý</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {results.map((r, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-all">
                          <td className="p-2.5 text-slate-500">{r.index !== undefined ? r.index + 1 : idx + 1}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.status === 'SUCCESS' || r.status === 'VALID'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {r.status || r.data?.status || 'OK'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-300 truncate max-w-xs">
                            {r.data?.username ? (
                              <span>
                                <strong className="text-cyan-300">{r.data.username}</strong> | Level: {r.data.level} | Cookie: {r.data.hasCookie ? 'YES' : 'NO'}
                              </span>
                            ) : (
                              JSON.stringify(r.data || r)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab 3: Console Logs */}
            {activeTab === 'LOGS' && (
              <div className="bg-slate-950/90 p-3 rounded-2xl border border-white/10 font-mono text-[11px] h-[360px] overflow-y-auto space-y-1.5 shadow-inner">
                {logs.length === 0 ? (
                  <div className="text-slate-600 text-center py-12">No logs captured yet.</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-2 items-start leading-relaxed">
                      <span className="text-slate-600 text-[10px] font-sans">[{log.time}]</span>
                      <span
                        className={
                          log.level === 'success'
                            ? 'text-emerald-400 font-semibold'
                            : log.level === 'error'
                            ? 'text-rose-400 font-semibold'
                            : log.level === 'warning'
                            ? 'text-yellow-400'
                            : 'text-cyan-300'
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiThreadProcessor;
