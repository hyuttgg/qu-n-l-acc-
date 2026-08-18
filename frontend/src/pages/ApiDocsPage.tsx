import React from 'react';
import { Terminal, ExternalLink } from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
  const getBackendUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (window.location.hostname === 'localhost') return 'http://localhost:5000';
    return 'https://quan-ly-acc-viet-nam.onrender.com';
  };

  const docsUrl = `${getBackendUrl()}/api-docs`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white glow-text-cyan flex items-center gap-2">
            <Terminal className="w-8 h-8 text-gold animate-pulse" /> API DOCUMENTATION
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Interactive OpenAPI 3.0 Sandbox for the OceanForge Developer APIs
          </p>
        </div>
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gold border border-gold/30 hover:border-gold hover:bg-gold/10 text-xs font-bold transition-all shadow-md self-start sm:self-center"
        >
          <ExternalLink className="w-4 h-4" />
          OPEN IN NEW TAB
        </a>
      </div>

      {/* Embedded Iframe Sandbox */}
      <div className="glass-panel p-1 overflow-hidden border border-slate-800 shadow-2xl rounded-2xl bg-[#030712]">
        <iframe
          src={docsUrl}
          title="OceanForge API Docs Sandbox"
          className="w-full h-[calc(100vh-210px)] min-h-[500px] border-none rounded-xl"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
};
